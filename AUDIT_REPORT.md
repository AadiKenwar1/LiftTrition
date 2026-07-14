# AUDIT_REPORT — PLATES (LiftTrition)

Multi-agent audit, 2026-07-12. Method: orchestrator recon (`AUDIT_MAP.md`) → four parallel read-only sub-agents (flow-tester, logic-auditor, ui-inspector, coupling-analyzer) → orchestrator dedupe + independent spot-verification of every Critical and headline Major (all verified against source). Known issues in `docs/BACKLOG.txt` / `docs/RENDER_FIXES.txt` were excluded by instruction. **Nothing was fixed** — this is a map.

Plain-language versions: `docs/AUDIT_MAJOR.txt` (Critical + Major, confirmed only) and `docs/AUDIT_MINOR.txt` (Minor, confirmed only).

"Found by" = independent discovery by that many of the 4 agents.

---

## CRITICAL — data loss, broken core flows, security

### C1. Account deletion deletes the server account first, then tries to flush uploads — user stranded
`context/AuthContext/functions/accountFunctions.tsx:6-23` · found by 3/4, orchestrator-verified
`deleteAccount()` calls the edge function (which wipes all rows + the auth user), then `signOut()`, whose first step is `flushUploadsOrThrow({timeoutMs: 60_000})`. Any pending local write now uploads as a deleted user → every table's `user_id` FK (`REFERENCES auth.users(id)`) rejects it → the queue never drains → flush throws after 60 s → `supabase.auth.signOut()`, `disconnectAndClearPowerSync()`, `AsyncStorage.clear()` never run. `profile.tsx:130-139` shows a generic error with no force option (that exists only for sign-out).
**Repro:** log a meal offline (or right before), Profile → Delete Account → confirm → 60 s spinner → error — but the account is already gone server-side; the app stays "signed in" to it. Only reinstalling escapes.
**Fix direction:** flush (or explicitly discard) uploads and disconnect *before* calling the edge function; after confirmed server deletion, tear down local state unconditionally.

### C2. Delete-account edge function misses `support_requests` (FK blocks deletion forever) and ignores per-table errors (partial wipe)
`lib/supabase/functions/deleteAccount/index.ts:29-38` · found by 2/4, orchestrator-verified
(a) The function deletes exactly 6 tables; `support_requests` (`lib/supabase/migrations/support_request.sql:4` — `user_id UUID NOT NULL REFERENCES auth.users(id)`, no `ON DELETE`) is not among them, and the client writes to it (`app/settingsScreens/support.tsx:44`). For any user who ever submitted a support/feature request, `auth.admin.deleteUser` fails on the FK — **account deletion is permanently impossible**, while (b) the six data deletes already ran with their `{error}` results discarded, so their data is wiped (and the deletions sync down to the device) even when the overall request "fails".
**Repro:** submit a support request → Delete Account → 500 error, data partially gone, account still exists.
**Fix direction:** delete `support_requests` rows too, check every delete's error before `deleteUser`, ideally run everything in one SQL function/transaction.

### C3. Fractional or NaN calories reach a Postgres `INTEGER` column — permanently wedges the sync queue; escape hatch destroys unsynced data
Writers: `app/nutritionScreens/foodDBModal.tsx:114-117,145-148` (raw `item.calories * quantity`), `addNutritionModal.tsx:41-44` (`parseFloat` NaN passes the `< 0`-only validator `context/NutritionContext/functions/validator.tsx`) ↔ `lib/powersync/AppSchema.ts:60,90` + `lib/supabase/migrations/schema.sql` (`calories INTEGER NOT NULL`) ↔ `lib/powersync/Connector.ts:86-88` (rethrow → infinite retry) · found by 1/4 (chain), NaN inputs by 3/4; orchestrator-verified
Local SQLite accepts 250.5/NaN; Postgres rejects it on upload; PowerSync retries the same FIFO transaction forever, so **everything behind the poisoned row never syncs**. Gate C then times out on sign-out and the offered force-sign-out wipes all unsynced data. The AI path rounds correctly (`aiFunctions.tsx:88`) — the foodDB and manual paths don't. Trigger is routine: any FatSecret item with fractional per-serving calories, or typing "." / a decimal-comma value in the calories field.
**Fix direction:** validate + round at the converter boundary (`nutritionEntryToRow`) with `Number.isFinite`, not per screen — or make the column REAL. Consider a dead-letter/skip strategy in `uploadData` for permanently-rejected rows.

### C4. Premium AI + food-search endpoints never check entitlement — free for any signed-in token, no rate limit
`lib/supabase/functions/fetchOpenAI/index.ts:162-190`, `lib/supabase/functions/fetchFoodDB/index.ts:47-58` · found by 1/4; orchestrator-verified (grep: zero premium/entitlement logic in `lib/supabase/functions/`)
Both functions accept any valid Supabase JWT and immediately call OpenAI/Gemini or FatSecret. `hasPremium` exists only client-side and only hides buttons (`app/(tabs)/index.tsx:62-68`). Any free account's token (plaintext in AsyncStorage, per known issues) replayed against the endpoint gets unlimited vision analyses at the owner's expense. Related (suspected): `cameraScreen`/`foodDBModal` themselves never re-check `hasPremium`, so a deep link skips the FAB gate client-side too.
**Fix direction:** verify entitlement server-side (RevenueCat REST lookup or synced entitlement claim) + per-user rate limiting; add `hasPremium` guards inside the two screens.

### C5. Archive screen: one mis-tap permanently deletes a workout/exercise and all its logs — no confirmation
`app/workoutScreens/archiveModal.tsx:67-71` · found by 2/4; orchestrator-verified
The trash icon calls `handleDeleteWorkout`/`handleDeleteExercise` directly in `onPress` — cascading delete of logs, no Alert, no undo — sitting ~8 px from the restore button. Every other delete path warns first ("Deleting a workout will delete all logs…", `workoutScreen.tsx:39`). Users archive precisely to preserve history.
**Fix direction:** wrap in the same confirmation Alert used on the main screens.

---

## MAJOR — wrong behavior, bad UX

### M1. A failed first load treats an existing user as brand-new — re-onboarding overwrites their server settings
`context/SettingsContext/index.tsx:109-115` (catch → `defaultSettings` + `setLoaded(true)`); same pattern in Nutrition/Workout contexts and `PowerSyncGuard.tsx:28-31` · found by 1/4; orchestrator-verified
Any exception during first sync/load is swallowed and defaults (`onboardingComplete: false`) are presented as truth → route guard shows onboarding over an "empty" account. Completing it upserts a fresh settings row; `Connector.createRecord` finds the existing server row by user_id and **updates it** — old goals/macros permanently overwritten. (Distinct from the known `waitForFirstSync` no-timeout issue: this is the error branch pretending success.)
**Fix direction:** blocking retry/error state on load failure; never map load-error → "fresh user".

### M2. Nutrition `selectedDate` never rolls over at midnight — morning entries silently land on yesterday
`context/NutritionContext/index.tsx:28` (set once at mount; only writer is `dateModal.tsx:31`) · found by 2/4; orchestrator-verified (no `AppState` listener exists outside SyncWatchdog/orchestrator)
iOS keeps apps suspended for days. Every add path (manual, foodDB, saved, photo) stamps `selectedDate`. Log breakfast the morning after last using the app → it's dated yesterday; today shows 0 kcal; streak marks today unlogged. Only cue is the small date chip no longer saying "Today".
**Fix direction:** on foreground/day-change, reset `selectedDate` to today (compare stored dateKey).

### M3. Weighing in silently rewrites goal type, resets pace, and clobbers hand-tuned macros
`context/SettingsContext/functions/bodyWeightFunctions.tsx:18-33` (+ modal copy `updateBWModal.tsx:40`) · found by 3/4
`computeBwUpdate` re-derives `goalType` from `updatedWeight` vs `goalWeight` with exact comparisons and resets `goalPace` to 0.5 lb/wk on any flip, then regenerates all four macro goals from presets. A "maintain" user (goalWeight == start weight) flips to lose/gain on ±0.1 lb of scale noise (±250 kcal day-to-day); a cutter dipping below goal silently becomes a bulk; manually customized macros (supported in three screens) are overwritten by the app's most frequent action. Height/activity edits (`profile.tsx:49-59`, `adjustTraining.tsx:26-33`) also regenerate macros with no notice.
**Fix direction:** never auto-flip goalType without confirmation (or add a deadband); a `macrosCustomized` flag gating auto-regeneration. Note: reset pace 0.5 is lb/week even for metric users.

### M4. Saved-meal re-log with quantity > 1 double-counts macros in the breakdown (factor²)
`app/nutritionScreens/savedNutritionModal.tsx:21-32` (used at :108/:144) · found by 1/4; orchestrator-verified
Ingredient semantics everywhere else: macros are per-unit, total = macro × quantity (`aiFunctions.tsx:77-83`, `editPhotoEntry.tsx:17-23`). `scaleIngredients` multiplies **both** quantity and all four macros. Entry-level totals are right, but opening the ingredient breakdown shows factor² values (2× serving → 4× base), and saving from there persists the doubled totals into the day.
**Fix direction:** scale one dimension only.

### M5. NaN passes every numeric guard in body weight and manual meals; decimal-comma locales can't enter decimals anywhere
Weight: `updateBWModal.tsx:60-64` → `SettingsContext/functions/validator.tsx` (`NaN < min` is false) → `handleUpdateBw` (`NaN <= 0` false) → NaN persisted into `settings.bodyWeight`, all four macro goals (`Math.round(NaN)`), and `weight_progress`. Meals: `addNutritionModal.tsx:41-44` NaN → validator only checks `< 0` → day totals NaN. · found by 3/4
iOS decimal-pad shows a comma in many locales; `Number("80,5")` = NaN — for those users this fires on their **first** decimal entry. Even en-US, "." or "12..5" gets through. Contrast: `logsModal.tsx:93-95` does it right (`Number.isFinite`); `editManualEntry.tsx:45-48` coerces `|| 0`. Three policies for one input class. (NaN calories also feed C3.)
**Fix direction:** one shared numeric-input parser (comma→dot, `Number.isFinite`, ≥ 0) used by all forms + NaN checks in both validators.

### M6. Servings "0.5" silently becomes 1 (parseInt) in foodDB and saved meals
`foodDBModal.tsx:81` (`parseInt(quantityValue) || 1`), `savedNutritionModal.tsx:61` · found by 1/4; orchestrator-verified
`parseInt('0.5')` = 0 → falsy → 1: logging half a serving records double what the user ate, silently. `editPhotoEntry` supports fractional quantities via parseFloat — inconsistent semantics between flows.
**Fix direction:** parseFloat + validate > 0 (or visibly reject non-integers).

### M7. Photo-entry editor: decimals impossible to type ("2.5" becomes 25), fields can't be cleared, quantity-0 shows contradictory totals
`editPhotoEntry.tsx:54-61` with :154-190 (controlled `value={n.toString()}` + `onChangeText → parseFloat(v) || 0` eats the dot mid-typing); `:12-30` vs `:210-224` (`calcTotals` uses `quantity || 1`, per-ingredient grid uses raw `quantity` → a 0-qty ingredient shows 0 in its row but counts ×1 in totals and in what gets saved) · found by 1/4
**Fix direction:** keep drafts as string state, parse on save (the pattern the other modals use); unify the quantity-0 semantic.

### M8. Analyzing modal can be swipe-dismissed but analysis never cancels — entry added anyway, `dismissAll()` slams unrelated modals, stray alerts
`analyzingModal.tsx:64-93`; gesture enabled by `_layout.tsx:34-37,175` · found by 2/4
After a swipe-dismiss the 30 s vision promise lives on: success inserts the entry and calls `router.dismissAll()` (closing whatever modal the user opened since, e.g. a half-typed manual entry); failure pops a non-cancelable "Try Again" Alert over an unrelated screen whose retry runs from the dead modal. Re-taking the photo after "cancelling" → duplicate entries + duplicate paid API calls.
**Fix direction:** disable the dismiss gesture for this route, or a `cancelled` ref checked before every post-await side effect.

### M9. Double-submit epidemic: every add CTA can fire twice; "Use Photo" double-tap = two paid OpenAI calls
`addNutritionModal.tsx:34-52`, `foodDBModal.tsx:102-158`, `savedNutritionModal.tsx:90-152`, `addWorkoutModal.tsx:58-68` (stale duplicate-name check), `addExerciseModal.tsx:68-113`, `cameraScreen.tsx:115-122` (pushes a second analyzingModal, each auto-runs analysis on mount) · found by 2/4
None set a pending flag; modal dismissal takes an animation frame during which the button is live and each tap mints new UUIDs. Contrast: purchase CTAs and logsModal are guarded.
**Fix direction:** synchronous `submittedRef` guard + disabled state on these handlers.

### M10. Permanently denied camera permission is a dead end
`cameraScreen.tsx:32-58` · found by 1/4
Once iOS permission is denied, `requestPermission()` resolves `granted: false` without prompting; `canAskAgain` is never checked and there's no `Linking.openSettings()` path. A paying user who once tapped "Don't Allow" can never use AI scan.
**Fix direction:** when `!canAskAgain`, switch the button to open Settings.

### M11. Offline sign-out is impossible
`lib/powersync/FlushUploads.ts:42-44` (`UploadFlushNotConnectedError` when not connected) + `profile.tsx:94-115` (force-sign-out offered only for `isUploadFlushTimeoutError`) · found by 1/4
Airplane mode → Sign Out → "PowerSync is not connected." with only an OK button. No escape.
**Fix direction:** offer force-sign-out (with data-loss warning) for the not-connected error too.

### M12. Every data write is optimistic with the failure swallowed; settings retry loops with zero backoff
Pattern across `NutritionContext/index.tsx`, `WorkoutContext/index.tsx`, `SettingsContext/index.tsx:77-79` (`catch → console.warn`); retry nonce `SettingsContext/index.tsx:147-153` re-fires immediately forever · found by 1/4; orchestrator-verified for Settings
UI state updates first; if the SQLite write throws, the UI still shows success (modals close, checkmarks animate) and the data evaporates on restart. Rare trigger (local DB failure), but the failure mode is silent loss across every feature.
**Fix direction:** surface persist failures (toast + retry) or roll back optimistic state; backoff on the settings retry.

### M13. `user_exercises` UNIQUE(user_id, name) has no Connector conflict handling — cross-device duplicate wedges sync
`lib/powersync/Connector.ts:100-159` (special-cases only settings + weight_progress) vs `schema.sql:36` · found by 1/4
Creating the same custom-exercise name on a second device (or re-creating before a delete syncs) → 23505 → rethrow → same permanent queue-wedge failure mode as C3. CLAUDE.md gotcha 3 states the rule; this existing table violates it.
**Fix direction:** check-then-update branch for `user_exercises` keyed on (user_id, name), mirroring the settings branch.

### M14. Sign-out `AsyncStorage.clear()` wipes other modules' storage (theme, every user's lastExercise)
`accountFunctions.tsx:34,45` ↔ `ThemeContext/index.tsx:13-40` (`colorScheme` key), `WorkoutContext/index.tsx:504-557` · found by 1/4; orchestrator-verified
Dark/light preference silently resets after sign-out + relaunch; per-user `lastExercise:{userID}` keying is pointless since any sign-out destroys all users' keys. Any future AsyncStorage consumer inherits the wipe.
**Fix direction:** clear an explicit allowlist / per-user prefix instead of `clear()`.

### M15. "Restore Purchases" reports success when nothing was restored, and has no in-flight state
`subscription.tsx:67-74` (unconditional "Purchases restored successfully!"), `paywall.tsx:79-86` (restore → `completeOnboarding()` regardless; no flag → double-fire possible, can run concurrently with purchase; not covered by the `beforeRemove` guard) · found by 2/4
`Purchases.restorePurchases()` resolves fine with zero entitlements for never-subscribed users.
**Fix direction:** branch on returned `customerInfo.entitlements.active`; add a `restoring` flag driving spinner/disabled/beforeRemove.

### M16. Developer stats screen reachable in production — tap the "Settings" title
`app/(tabs)/settings.tsx:133-135` (no `__DEV__` gate; `accessibilityLabel="Open developer stats"` announces it to VoiceOver) → `devStatsModal` (live PowerSync/auth diagnostics, 1 s polling) · found by 1/4; orchestrator-verified
**Fix direction:** gate the onPress (and route registration) behind `__DEV__`.

### M17. `birth_date` and `onboarding_completed_at` stored as UTC day, read as local — off-by-one for evening/UTC+ users
`context/SettingsContext/database/powersyncStore.ts:37` (`toISOString().slice(0,10)` — the exact pattern CLAUDE.md gotcha 9 bans) vs read paths (`:12-19`, one local, one UTC) · found by 3/4
US-evening onboarding stores *tomorrow*; the progress week-pager (`progress.tsx:86`) then can't reach week-one logs; birthdate can be permanently one day early (age/BMR flip a day off). `weight_progress` does it correctly via `getDateKey`.
**Fix direction:** write both with `getDateKey()`, read both with the local `new Date(y, m-1, d)` split.

---

## MINOR — edge cases, polish (confirmed only)

1. **Onboarding persists nothing until the paywall** — force-quit on screen 9 restarts from scratch; inconsistently, `aboutYou` already wrote a day-1 `weight_progress` row (orphan). `SettingsContext/index.tsx:122-131`, `aboutYou.tsx:69-70`.
2. **Notes modal writes to DB per keystroke** — one PowerSync write + one upload op per character. `notesModal.tsx:27-31`.
3. **Order-bump drift** — in-memory bump includes archived workouts/exercises, SQL bumps only active; drift persisted later by rename/note upserts. `WorkoutContext/index.tsx:60-63,105-108,249-252,274-277` vs `powersyncStore.ts:122,179,203,222`. (3/4 agents)
4. **Metric pace mislabeled** — Profile prints the stored lb value with a "kg/week" suffix (0.5 kg/wk shows as "1.1 kg/week"); every other consumer converts. `profile.tsx:277-281`. (2/4)
5. **1RM chart flatlines at 0 for bodyweight exercises** — `estimate1RM(0, reps) = 0` while fatigue math adds body weight for Bodyweight equipment. `graphFunctions.tsx:42-48` vs `fatigueFunctions.tsx:48-51`.
6. **DST off-by-one hides day one of the BW chart** — `Math.floor((today-start)/86400000)+1` loses a day when spring-forward falls in the window; the day-1 weigh-in drops off and `lastKnownWeight` starts at 0. `bodyWeightFunctions.tsx:78` (same pattern ×3 elsewhere).
7. **Macro split ignores the calorie floor** — grams computed from unclamped TDEE; when the 1200/1500 clamp engages, macros sum to ~75% of the calorie goal. `macroCalculation.tsx:59-66`. (2/4)
8. **Photo entries bypass the validator** — `handleAnalyzeAndAddPhoto` persists even when `addNutrition` rejected the entry; invalid row reappears after restart. `NutritionContext/index.tsx:108-116` vs `:61-69`.
9. **Ingredient `brand` is never persisted** — in the app type and AI contract, but no column; silently `undefined` after restart. `types.ts:6` vs `AppSchema.ts:70-81`.
10. **Default chart exercise doesn't exist** — `progress.tsx:41` falls back to `'Barbell Bench Press'`; the library's canonical name is `"Bench Press"` → fresh/post-sign-out users get a permanently empty 1RM card. Orchestrator-verified.
11. **Four competing goalPace defaults** — 0 (`powersyncStore.ts:5`) vs 0.5 (`index.tsx:21`, NULL-fallback, bw-flip reset) vs onboarding defaults; which one a user gets depends on code path. `weeks` math divides by a guarded fallback of 1, producing absurd estimates.
12. **Login "Signing in…" can never show** — wired to AuthContext's initial-restore `loading`, which is never true during an actual sign-in; button stays tappable mid-exchange. `login.tsx:47-49`.
13. **Fast second delete cancels the first** — shared `deletingLogId` + animation `finished:false` → `onDeleteConfirmed` skipped; the first set reappears. `LogHistoryList.tsx:20-49`.
14. **foodDB search races + offline alert spam** — stale responses overwrite newer results / clear the spinner early; each 500 ms pause offline fires another Alert. `foodDBModal.tsx:39-57`.
15. **"lb" vs "lbs" churn** — same value suffixed differently across adjacent screens (aboutYou "lbs" → goal "lb"; log tab "lbs" vs progress "lb"). ~11 files, see ui-inspector list.
16. **"kcal" vs "cal" vs "calories"** — three labels for one quantity (`Entry` vs `SavedEntry` vs staged pills/profile).
17. **Clearing the meal name diverges** — add → "Unnamed Entry"; edit → silently reverts to old name. `editManualEntry.tsx:44` vs `addNutritionModal.tsx:38`.
18. **Raw float in adjustNutrition4** — "22.400000000000006 lb to goal". `adjustNutrition4.tsx:88`.
19. **Disabled next-week arrow looks enabled** — opacity 0.7 vs the prev arrow's 0.25. `progress.tsx:227-234`.
20. **Native stack headers hardcode Poppins** — bypasses the `FONT_FAMILY` Poppins↔Archivo flip. `_layout.tsx:140`.
21. **ProgressWheel hardcodes its gradient hexes** — duplicates workout/nutrition gradients; the in-progress colorHue retune won't reach it (also `markerColor`). `ProgressWheel.tsx:44-54`.
22. **Macro category colors duplicated as literals** in `plan.tsx:48-50` + `adjustNutrition3.tsx:95-97`.
23. **Copy-paste math awaiting drift** — `sumIngredients` vs `calcTotals` (identical today, two owners); weeks-to-goal ×3 files; age calc ×3 files; DatePicker future-date bound re-implemented per call site (CompactDatePicker bakes it in).
24. **lastExercise save/load race** — persist effect can `removeItem` before the per-user load resolves; currently masked by the M14 wipe, goes live the moment `clear()` is scoped. `WorkoutContext/index.tsx:497-564`. Doc drift: key is `lastExercise:{id}`, docs say `lastExercise_{id}`.
25. **Env contract unpinned** — five `EXPO_PUBLIC_*` vars consumed (incl. `POWERSYNC_URL!` non-null-asserted), none declared in `eas.json` profiles; a missing one fails only at runtime. Docs list two.
26. **Workout CRUD tests certify dead code** — provider re-implements add/archive/rename/order inline; `functions/workoutFunctions.tsx` (the tested file) diverges (e.g. unarchive bump scope). `WorkoutContext/index.tsx:48-230` vs tests.
27. **Module caches survive sign-out** — foodDB search/details caches (unbounded, 1-wk TTL) and the orchestrator kick throttle carry across user switches (no user-data leak found; Billing identity handled correctly).
28. **Delete-confirmation policy inconsistent** — unsave requires confirm; set-delete doesn't (prop literally named `onDeleteConfirmed`); workout/exercise deletes confirm via options Alert; archive screen doesn't at all (C5).

---

## SUSPECTED — plausible from code, needs device verification

- `adjustNutrition4.tsx:56` `router.push('/(tabs)/settings')` leaves the wizard in history — back-swipe may re-enter a stale wizard.
- FAB menu stays open after choosing an action; no tap-outside backdrop (`Fab.tsx:44,66-97`).
- Fixed-height `Log` cards (96/120 + `overflow: hidden`) may clip at large Dynamic Type sizes.
- Bottom-CTA safe-area handling differs per modal (inset-aware vs fixed padding); foodDB empty-state text uses system font.
- Camera shutter has no in-progress guard (library picker does) — overlapping captures possible.
- `photo_uri` syncs a device-local `file://` path — dangles on a second device or after an iOS container move.
- AI vision ingredients are used untyped — a non-numeric field from the model would propagate NaN into persisted rows (json_object mode doesn't enforce schema).
- Free users may deep-link straight into `cameraScreen`/`foodDBModal` (no in-screen `hasPremium` check — absence confirmed; exploitability not).

---

## SYSTEMIC PATTERNS

1. **Numeric input has no shared parser.** Three different policies for the same input class (strict `Number.isFinite` in logsModal; `|| 0` in editManualEntry; unguarded parseFloat in addNutritionModal/updateBW; parseInt for servings). Every NaN/truncation bug above (M5, M6, M7, part of C3) is one symptom. One `parseNumericInput()` helper + validator NaN checks retires the whole class.
2. **Validation lives per-screen; the persistence boundary trusts everyone.** Rows reach SQLite (and then Postgres) unvalidated — NaN macros, fractional integers, out-of-contract values. Combined with Connector's rethrow-forever retry, any bad row becomes a permanent sync wedge (C3, M13). Validate/coerce once in the row converters; give `uploadData` a strategy for permanently-rejected rows.
3. **Error paths pretend success.** Load failure → defaults-as-truth (M1); restore → unconditional success alert (M15); persist failure → console.warn while UI shows success (M12); edge-fn table deletes → errors discarded (C2). The app almost never tells the user something failed.
4. **The same rule implemented twice has already drifted.** Memory vs SQL order-bump scope (Minor 3); inline provider handlers vs the tested functions file (Minor 26); `sumIngredients` vs `calcTotals`; ingredient scaling semantics (M4 is this drift made concrete); four goalPace defaults (Minor 11); date bounds per call site.
5. **Cross-cutting side effects are undisclosed.** Weigh-in rewrites goals/macros (M3); sign-out wipes unrelated storage (M14); orphaned analysis `dismissAll()`s other screens (M8); height/activity edits silently regenerate macros.
6. **Fire-and-forget async with live UI.** No cancellation or pending flags around long promises (M8, M9, M15, camera shutter) — the UI and the in-flight work disagree about what's happening.

## Coverage & clean bill

Verified clean by the agents (details in their reports): progression/1RM/fatigue math + tests, nutrition graph/streak functions, `getDateKey`/week helpers, unit-conversion round-trips, downsample, orchestrator mutex chain, FlushUploads poll loop, Billing identity handling (`Purchases.logIn/logOut`), purchase-button double-submit guards, chart empty/1-point/all-zero handling, edge-function request/response contracts (both directions), provider-order dependencies (no context→context imports), import hygiene (no devTest leaks into production, no cycles).

Out of scope per instructions: `app/devTest/**`, `components/devTest/**`, everything already tracked in `docs/BACKLOG.txt` / `docs/RENDER_FIXES.txt`.
