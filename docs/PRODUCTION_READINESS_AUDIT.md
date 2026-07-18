# Production-Readiness Audit — PLATES

**Date:** 2026-07-17
**Method:** Six parallel domain audits (security-cost, logic-correctness, ui-ux, infra-reliability, performance, code-structure), each scoped to the whole repo, findings verified against actual code, then deduplicated and merged by severity.
**Raw findings:** 100 (~90 unique after cross-agent dedup) — 4 Critical, ~15 High (deduped), ~30 Medium, ~30 Low.

## Verdict

**NO-GO in the current state — but the blocking list is short and tractable (days, not weeks).**

The foundation is genuinely good: RLS + PowerSync bucket isolation are correct, SQL is parameterized, Edge Functions verify JWTs, SQLite is well-indexed, core domain math is well-tested at the pure-function level, and no context is a god object. The blockers concentrate in five places: an unmetered paid-API endpoint, a pending backend migration that is an active data-loss window, a settings-persistence wedge bug, sync-queue poison handling, and near-zero production observability.

Per-agent tally — security-cost: 1C/2H/3M/6L · logic-correctness: 1C/2H/5M/9L · ui-ux: 1C/3H/9M/10L · infra-reliability: 1C/5H/6M/5L · performance: 0C/3H/6M/4L · code-structure: 0C/6H/9M/3L.

---

## 🔴 Critical — launch blockers

### C1. AI/food-DB Edge Functions are unmetered — unbounded paid-API spend
`lib/supabase/functions/fetchOpenAI/index.ts:162-206` · `lib/supabase/functions/fetchFoodDB/index.ts:47-98`
Both handlers do exactly one auth check, then call OpenAI/Gemini/FatSecret with **no rate limit, quota, or usage cap** (grep for rate/limit/quota/429 across the functions returns nothing). Any free Apple-Sign-In account can script the vision endpoint in a loop — and label mode forces `detail: 'high'`, the most expensive path (`fetchOpenAI/index.ts:120`). Client-side guards (`useSubmitOnce`, 30s timeout) are irrelevant because the function is callable directly. *(security-cost)*

### C2. Pending `nutrition_calories_real.sql` migration — active data-loss window
`lib/supabase/migrations/nutrition_calories_real.sql` · `lib/powersync/AppSchema.ts:62,93` · `lib/powersync/Connector.ts:15-24,108-117`
The client schema declares calories as REAL and writes decimal values, but production Postgres still has INTEGER columns until the migration runs. A decimal upload → SQLSTATE-22 error → the Connector **dead-letters it**: the entry silently ceases to exist server-side (lost on reinstall/second device). Found independently by both infra-reliability and logic-correctness. Nothing in the repo enforces deploy order — **must run in Supabase before/with release.** *(infra + logic)*

### C3. Settings persistence can permanently wedge for the whole session
`context/SettingsContext/index.tsx:148-191`
The save effect's `finally` only resets `persistSavingRef` when not cancelled (`if (!cancelled) persistSavingRef.current = false`, lines 180-182). If the user changes any setting while a save is in flight, the cleanup marks the run cancelled, the new effect run early-returns at line 150, and the flag sticks `true` forever. Every subsequent `setSettings` routes into a never-consumed ref — macro targets, goal switches, weigh-in-driven target regeneration all live only in React memory and vanish on app kill. The provider never unmounts, so even sign-out/sign-in doesn't clear it. The window is widest exactly when SQLite is slow/contended. Nothing would report it (see H4). *(logic-correctness)*

### C4. Nutrition entry Delete fires with no confirmation
`app/nutritionScreens/nutritionScreen.tsx:50-52`
The options menu's Delete calls `handleDeleteNutrition` directly — no `confirmDelete`, no undo — with Delete adjacent to Edit/Save in the same Alert list. One mis-tap permanently destroys the entry. Every sibling flow confirms (workout `workoutScreen.tsx:61`, exercise `exerciseScreen.tsx:54`, set `LogHistoryList.tsx:28-37`, saved-meal `savedNutritionModal.tsx:81-83`), so this is drift, not design. *(ui-ux)*

---

## 🟠 High

### H1. Premium is enforced only client-side
`context/BillingContext/index.tsx:133` · `app/nutritionScreens/cameraScreen.tsx:35` · `app/nutritionScreens/addNutritionModal.tsx:62` · `app/nutritionScreens/foodDBModal.tsx:30,93`
Every gate on AI scan / AI macros / food search is a local `if (!hasPremium)`; the Edge Functions never check entitlement. Free users (or a direct HTTP call) get premium features free — and this is the enabler that makes C1 free to exploit. Fix server-side (RevenueCat REST check or synced entitlement) in the same change as C1's quota. *(security-cost)*

### H2. Connector poison-row handling is wrong in both directions
`lib/powersync/Connector.ts:10,15-24,116,181-188` · `lib/supabase/migrations/schema.sql:36` · `lib/powersync/FlushUploads.ts:73`
(a) Only SQLSTATE 22/23 dead-letter; any other permanent error — `PGRST204` schema drift, `42501` RLS denial, table-not-found — throws and PowerSync retries **forever**: no writes ever sync again, sign-out flush times out, only exit is force sign-out = data loss. The repo itself documents the wedge mechanic (`lib/supabase/migrations/ingredient_brand.sql:4-5`).
(b) Conversely, `user_exercises` has a server `UNIQUE(user_id, name)` but is not in `SELF_HEALING_CONFLICT_TABLES` — a 23505 dead-letters and the custom exercise is permanently dropped (violates CLAUDE.md Gotcha #1).
Structure adds: the per-table conflict branches are hand-duplicated three ways with `any`-typed records, so every new table risks re-introducing this. Three agents converged here. *(infra + logic + structure)*

### H3. First-sync hang: infinite spinner, no timeout, no retry, no escape
`components/GuardComponents/PowerSyncGuard.tsx:17-31` · `lib/hooks/useAsyncLoad.ts:30-35` · `components/GuardComponents/AppLoadingScreen.tsx:93-99`
`await powerSync.waitForFirstSync()` never rejects on network failure, and the retry UI only renders on rejection — so a fresh install/sign-in with PowerSync unreachable is hard-stuck on "Syncing data..." forever, and the loading screen has no sign-out affordance. Returning users are unaffected (persisted first-sync flag). **Found independently by three agents — the strongest single hotspot in the audit.** Fix: race against a ~20-30s timeout that flips to the `loadFailed`/retry state + add a sign-out escape link. *(ui-ux + infra + logic)*

### H4. Production observability is near-zero
`app/_layout.tsx:52,67` · `context/AuthContext/index.tsx:51` · `components/GuardComponents/SyncWatchdog.tsx:73-83` · `lib/powersync/watchdogStatus.ts:32` · `lib/powersync/orchestrator.ts:66` · `app/settingsScreens/profile.tsx:88-110` · `app/nutritionScreens/analyzingModal.tsx:92` · `lib/foodDB/foodDB.ts:74-76`
Exactly 3 Sentry capture sites exist; zero breadcrumbs, zero `Sentry.setUser`. Route render crashes are swallowed by expo-router's re-exported ErrorBoundary and never reach Sentry. PowerSync connect failure is a `console.warn`. Watchdog kicks, orchestrator errors, flush-timeout force-sign-outs (real data-loss events), and AI/edge-function failures produce no telemetry. A fleet-wide sync wedge (H2) or the C3 bug would be invisible. *(infra)*

### H5. No CI gate at all
`.github/workflows/codeql.yml` (only workflow) · `package.json:5-13`
`npm run test:ci` never runs pre-build; no lint config exists; no `typecheck` script — `tsc` is never executed anywhere. EAS builds are triggered manually with zero automated verification. Combined with no OTA path (M-infra below), a shipped regression costs a full App Store review cycle. *(infra)*

### H6. Unmemoized provider values + zero `React.memo` → app-wide re-render on every write
`context/SettingsContext/index.tsx:216-234,122` · `context/WorkoutContext/index.tsx:477-514` · `context/AuthContext/index.tsx:60-69`
Settings, Workout, and Auth pass fresh inline value objects; a repo-wide grep finds **zero** `React.memo`. Every settings mutation adds two extra full-consumer render passes via the `persistDirty` flip; any auth token refresh ripples through everything. Nutrition (`index.tsx:149`), Billing, and Theme are correctly memoized — which is structure's point: the scaffolding is triplicated and hardening landed in only one copy. `handleGetBodyWeightProgressData` (no `useCallback`) also defeats the progress-chart memo (`app/(tabs)/progress.tsx:77-81`). *(performance + structure, same lines)*

### H7. Entire user history hydrated into context at startup — no date bounds, no pagination
`context/WorkoutContext/database/powersyncStore.ts:80-83` · `context/NutritionContext/database/powersyncStore.ts:114-149`
`SELECT * FROM logs WHERE user_id = ?` and the nutrition equivalent load everything, with 2-3 `Date` allocations per row — paid on every cold start, every user change, and **every failed write** via `reloadFromDisk`. A 2-year daily user carries ~10k logs + ~3k entries in RAM permanently. Startup also serializes 4 `getAll`s per loader and blocks first paint on all four contexts including billing (15s worst case). SQLite indexes are fine (`lib/powersync/AppSchema.ts:50,68,83,157-162`) — the cost is entirely JS-side hydration. **This is the security-cost × performance overlap: both agents independently cited the same two queries.** *(performance + security-cost)*

### H8. Hottest interactions rescan full history with Intl-backed `getDateKey` per row
`lib/utils/dateHelper.ts:25-27` · `app/workoutScreens/logsModal.tsx:56-68,120-126` · `context/WorkoutContext/functions/progressionFunctions.ts:50-76` · `context/WorkoutContext/index.tsx:399-402` · `app/(tabs)/progress.tsx:77-86` · `app/nutritionScreens/nutritionScreen.tsx:26-31` · `components/NutritionComponents/DailyIntakeCard.tsx:42`
`getDateKey` is a `toLocaleDateString` (Intl) call. Logging one set triggers full-history re-filters/re-sorts whose comparators call it twice per comparison, plus the always-mounted Progress tab re-running full-history graph transforms. The nutrition home computes `todayEntries` unmemoized in the render body, scanning all entries per re-render. Tens of thousands of Intl calls per "+" tap at 10k logs; H6 makes those re-renders frequent. *(performance)*

### H9. Persisted item quantity is rounded as if it were a macro — data corruption on re-save
`context/NutritionContext/database/powersyncStore.ts:191,232` · `lib/utils/number.ts:21-26` · `context/NutritionContext/functions/entryBuilders.ts:65-69`
Ingredient inserts run quantities through `sanitizeMacro` (1 decimal): 0.25 servings persists as 0.3 (+20%). Stored totals were computed from the unrounded value, so items no longer reconcile with totals — and merely opening editEntry and tapping Save silently changes the meal's calories/macros with no user edit. Quantity is a multiplier, not a macro; persist at full precision. *(logic-correctness)*

### H10. The 30-day graph gap-fill walk exists in 4 copies — with live divergent bugs
`context/NutritionContext/functions/graphFunctions.tsx:24-82` · `context/WorkoutContext/functions/volumeFunctions.tsx:9-57,64-107` · `context/SettingsContext/functions/bodyWeightFunctions.tsx:74-122`
Identical "bucket by dateKey → track earliest → walk back N days" scaffolding, already drifted: volume rounds, macros don't; body-weight fills gaps with last-known-weight and parses keys ad hoc (`bodyWeightFunctions.tsx:85`, bypassing `parseDateKey`); `hasData` semantics differ. Logic independently found live bugs in these copies: leading-zero backfill corrupts the "Change" stat (`components/GraphComponents/GraphStats.tsx:36-38`) and a 31-point off-by-one in the default branch (`lib/utils/dateHelper.ts:243-246`). **This is the code-structure × logic-correctness overlap, confirmed with concrete instances.** A DST/date fix applied to one copy will silently miss the others. *(structure + logic)*

### H11. Home-screen bodies are unguarded deep-linkable routes
`app/(tabs)/index.tsx:1-2` · `app/_layout.tsx:159-236,162-173`
`nutritionScreen`/`workoutScreen` live under `app/` so Expo Router auto-registers them as routes, but neither is inside any `Stack.Protected` group — reachable by deep link pre-auth/pre-paywall (renders with empty contexts). Related: the onboarding tier guard doesn't require a session (`!settings.onboardingComplete` is true while signed out), and 33 devTest routes are registered in the production navigator (`app/_layout.tsx:203-235`). Screen bodies belong in `components/`. *(structure + logic)*

### H12. VoiceOver-unusable: 25 `accessibilityLabel` occurrences in 14 files, app-wide
`components/NeutralComponents/Fab.tsx:93-97` · `components/NeutralComponents/ModeSwitcher.tsx:30-41` · `components/NutritionComponents/Entry.tsx:43-47` · `components/WorkoutComponents/Log.tsx:52-56` · `components/WorkoutComponents/LogHistoryList.tsx:64-66` · `app/workoutScreens/archiveModal.tsx:63-79` · more
Unlabeled: the FAB and all five actions, the workout/nutrition mode switcher (no label, no selected state), the entry edit pencil (the *only* path to edit/save/delete an entry), set-delete trash, archive restore/delete, staged-item remove, flash toggle, theme toggle, the loading-screen retry link (no role). Core logging flows cannot be completed with a screen reader. Good in-repo templates: `cameraScreen.tsx:195-241`, `progress.tsx`. *(ui-ux)*

### H13. Dark-mode primary CTAs fail contrast — and dark is the default scheme
`context/ThemeContext/colors.ts:87-97,105`
The palette's own comment documents white-on-`#00BD48` at ~2.2-3.5:1, below even the 3:1 large-text floor. Covers every nutrition-mode primary action ("Add meal", "Use Photo", "Add N Items", "Save changes", FAB actions). Deepen the CTA fill only (keep neon for chart/icon accents, as light mode already does) or switch CTA text to dark ink. *(ui-ux)*

### H14. Checked-in `BYPASSRLS` role with placeholder password — verify rotation
`lib/supabase/migrations/powersync_setup.sql:15,33`
`CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'CHANGE_ME_TO_SECURE_PASSWORD'` — with SELECT on `auth.users`. If the deployed DB was provisioned from this script verbatim (or with a weak value), that's a full cross-user breach vector. Operational verify-before-launch item. *(security-cost)*

### H15. Drifted modal pairs with hardening applied to one side only
`app/workoutScreens/addWorkoutModal.tsx:25-38` vs `app/workoutScreens/renameModal.tsx:32-44` · `app/nutritionScreens/foodDBModal.tsx:43-54,119-168` vs `app/nutritionScreens/savedNutritionModal.tsx:34-48,55-115,144-153` · `app/nutritionScreens/editEntry.tsx:107-110`
addWorkoutModal got `useSubmitOnce`; its ~95%-identical twin renameModal didn't (double-fire possible). editEntry's Save is also unguarded (double-tap pops two screens) and its `JSON.parse` of the route param is unguarded. The food-staging state machine is fully duplicated across foodDBModal/savedNutritionModal, and the latter re-implements item display math by hand against the "single owner of item math" contract in `items.ts` — display will diverge from committed totals if rounding changes (see H9). The duplicate-name check is re-implemented three times (`addWorkoutModal.tsx:27`, `renameModal.tsx:35-37`, `addExerciseModal.tsx:59-61`). *(structure; bugs corroborated by ui-ux + logic)*

---

## 🟡 Medium

### Data safety & backend
- **Sign-out flush doesn't cover unpersisted React-side settings** — `context/AuthContext/functions/accountFunctions.tsx:30-43`, `lib/powersync/FlushUploads.ts:44-74` — the flush gates the PowerSync queue, then `disconnectAndClear` wipes SQLite; a settings change still in the retry loop (or wedged per C3) is destroyed silently. Gate sign-out on `persistDirty === false` or force a final upsert. *(logic)*
- **No backup/DR story** — `lib/powersync/orchestrator.ts:100`, `lib/openAI/mealImage.ts:35-40` — Supabase loss syncs *down* over the local replica (no re-upload path; sign-out actively destroys the local copy). Recovery depends entirely on Supabase PITR, which nothing configures or documents. Meal `photo_uri` points at a purgeable device cache dir — "synced" photo entries render broken after any restore/second device. *(infra)*
- **Migrations hand-applied, no ledger** — `lib/supabase/migrations/` (non-standard path, no CLI project) — eight loose SQL files applied via dashboard; `schema.sql:60` already shows post-migration state while prod is pre-migration, so the reference schema is aspirational. Edge functions live outside the CLI layout and can silently drift from deployed copies. *(infra)*
- **Missing env vars crash pre-Sentry; no env separation** — `app/_layout.tsx:60-65`, `eas.json` — `assertRequiredEnv()` throws at module scope before `Sentry.init`; eas.json has no env blocks in any profile, so preview/production separation is invisible and unverifiable from the repo. *(infra)*
- **Sentry config gaps** — `app/_layout.tsx:62-65` — no `environment`/release separation (preview and App Store builds share one stream), no tracing, and `SENTRY_AUTH_TOKEN` isn't referenced anywhere so source-map upload/symbolication is unverified. *(infra)*
- **No OTA update path** — `expo-updates` not installed, no `updates`/`runtimeVersion` in app.json — every hotfix is a full review cycle; materially extends any incident window given C2/H2. *(infra)*
- **Session tokens in AsyncStorage, not SecureStore** — `lib/supabase/client.ts:10-15` — access + long-lived refresh token unencrypted at rest; consider `expo-secure-store` as the auth storage adapter. *(security)*

### Cost & performance
- **Edge functions never abort upstream calls** — `lib/supabase/functions/fetchOpenAI/index.ts:93-97,138-145` — no `AbortController`; the provider call completes and bills even after the client's 30s timeout gives up. *(security)*
- **AI photos upload full-size** — `app/nutritionScreens/cameraScreen.tsx:100-102,130-134`, `context/NutritionContext/functions/aiFunctions.tsx:91-93` — no dimension cap; ~3-5MB base64 allocated on the JS thread per shot. A ~1024px resize cuts payloads ~10×. *(performance)*
- **`downsample` is dead code; chart remount jank** — `lib/utils/downsample.ts` (only importer is its own test), `components/GraphComponents/Graph1.tsx:39,47-51,74-103,117` — 1Y range feeds up to 365 raw points into a chart that rebuilds an O(n) key string per render, recomputes scale unmemoized, remounts on key change, and imposes a deliberate 200ms spinner per remount. *(performance)*
- **Settings tab polls SQLite every second forever** — `app/(tabs)/settings.tsx:29-47` — `getUploadQueueStats()` on a 1s interval with no focus gating; tabs stay mounted, so it runs for the rest of the session. Dual-flagged (performance + structure); belongs behind a slower/event-driven hook. *(performance + structure)*
- **Upload queue drains one HTTP round-trip per op** — `lib/powersync/Connector.ts:88-121,129-180` — sequential awaits with extra pre-SELECTs for settings/weight_progress; a drag-reorder queues N order-bump ops (`workout powersyncStore.ts:159-169,262-272`); multi-day offline backlogs drain at RTT-per-op and stress the sign-out flush gate. *(performance)*
- **12MB / 1,318 statically-required exercise PNGs; un-debounced exercise search** — `context/WorkoutContext/exerciseLibrary/dataV2/imageMap.ts`, `app/workoutScreens/addExerciseModal.tsx:39-50` — Fuse runs per keystroke over 1,318 items (`threshold 0.4, ignoreLocation`) with no debounce; food search is properly debounced 700ms (`foodDBModal.tsx:73-90`). *(performance)*

### Logic & structure
- **`useToday` never rolls past midnight while foregrounded** — `lib/hooks/useToday.ts:8-17` — recomputed only on AppState transitions; streaks, "Today" labels, `selectedDate`, and grouping are stale until a background/foreground cycle. New entries still get the correct write-time date. *(logic)*
- **Zero tests on persistence state machines** — `context/SettingsContext/index.tsx:148-191` (the loop containing C3), `lib/powersync/orchestrator.ts:23-30,113-141`, `context/WorkoutContext/database/powersyncStore.ts:117-312` (312 lines, zero tests while both sibling stores are tested), `lib/onboarding/steps.ts:10-16` (maintain-skips-pace numbering untested), `lib/utils/__tests__/unitConversions.test.ts` (only `weightUnitLabel` tested; round-trip drift unverified), `macroCalculation.test.ts` (metric branch untested). *(logic + structure)*
- **Two write paths per context; fault injection covers ~half** — `context/WorkoutContext/index.tsx:94-98,211-264,327,354` — delete/archive handlers embed raw `writeTransaction` SQL in providers while inserts go through the database layer; `throwIfSaveFailureArmed` exists only on some store functions, so the error-path harness can't exercise the inline paths. *(structure)*
- **Nutrition store duplicates mapping/upsert/load blocks in-file 2-4×** — `context/NutritionContext/database/powersyncStore.ts:27-35/76-84, 163-194/205-235, 114-132/134-149` — a column addition must land in up to 4 places or entry and saved-meal behavior silently diverge. *(structure)*
- **Dead code cluster** — `lib/utils/dateDeserialization.ts` (zero importers), `getVolumeData` (`volumeFunctions.tsx:9` — tested, never called in production), `upsertExercise` (`workout powersyncStore.ts:238` — only reference is an unused import), `loadNutritionData`'s `hasData` return never consumed, empty legacy `exerciseLibrary/data/` dir. *(structure)*
- **5 unused dependencies** — `package.json` — `base-64` (+types), `jsonwebtoken` (Node crypto lib that shouldn't ship in an RN client), `react-native-draggable-flatlist` (superseded), `react-native-inner-shadow`, `expo-web-browser`. *(structure + security)*
- **Type erosion clusters** — `context/BillingContext/types.ts:4` (RevenueCat `offerings: any` throughout — an SDK upgrade breaking `offerings.current.monthly` fails at runtime in the paywall) · ~19 non-null assertions on PowerSync row parsing (`nutrition powersyncStore.ts:16-18,65-67,77`; `workout powersyncStore.ts:16-18,30-33,47-50`) propagate nulls into typed state instead of validating. *(structure)*
- **`lib/` imports upward from `context/`** — `lib/hooks/useNotificationScheduler.ts:1`, `lib/hooks/useCombineName.ts:1`, `lib/notifications/scheduler.ts:1`, `builders.ts:1` — layering inversion; these can't be reused or tested below the context layer. *(structure)*
- **33 devTest routes registered in the production navigator** — `app/_layout.tsx:203-235` — the guarded-require pattern keeps component code out of the bundle (verified), but the route table, titles, and deep-linkable null-rendering screens ship. *(structure)*

### UX & App Review
- **Fabricated "★★★★★ 5.0" rating on login and both paywalls** — `app/authScreens/login.tsx:50-55`, `app/onboardingScreens/paywall.tsx:165-168`, `app/settingsScreens/subscription.tsx:142-145` — hardcoded five-star claim for an unreleased app on a purchase screen; App Review 2.3.1 rejection risk. **Treat as a pre-submission blocker.** *(ui-ux)*
- **Default/unused camera + mic purpose strings** — `app.json:48-54` — `expo-camera` isn't in the plugins array, so prebuild applies generic defaults, including an `NSMicrophoneUsageDescription` for a mic the app never uses. Review-friction risk. *(infra)*
- **Swipe-dismiss silently discards staged work** — `app/_layout.tsx:37-40`, `foodDBModal.tsx:43`, `addExerciseModal.tsx:28`, `editEntry.tsx:74` — no `beforeRemove` dirty-guard anywhere except the purchase screen; one accidental down-swipe loses minutes of meal-building. *(ui-ux)*
- **No visible Cancel during the up-to-30s AI analyze** — `app/nutritionScreens/analyzingModal.tsx:31-36,121-165` — cancel exists only as an undiscoverable swipe gesture. *(ui-ux)*
- **"Save" meal gives zero feedback, no duplicate guard** — `app/nutritionScreens/nutritionScreen.tsx:44-48` — silent success; re-taps mint "name (2)" copies. *(ui-ux)*
- **Notifications toggle dead-ends after OS-level revoke** — `app/settingsScreens/notifications.tsx:39-51` — `showDenied` keys on the wrong state; tapping the switch does visibly nothing and never hints at Settings. *(ui-ux)*
- **Fixed heights clip at large Dynamic Type** — `components/WorkoutComponents/Log.tsx:27,78`, `OnboardingScaffold.tsx:77-79`, `logsModal.tsx:364-405`, `progress.tsx:350` — font scaling is on but rows/CTAs hardcode heights; use minHeight or `maxFontSizeMultiplier`. *(ui-ux)*
- **Account deletion gets one generic confirm** — `app/settingsScreens/profile.tsx:120-138` — same one-tap Alert weight as deleting one set; no second stage, no note that the App Store subscription doesn't auto-cancel. *(ui-ux)*
- **No sign-out escape during onboarding** — `app/onboardingScreens/goals.tsx:28`, guard at `app/_layout.tsx:162-175` — wrong-Apple-ID users must fabricate a profile or delete the app to switch accounts. *(ui-ux)*
- **Sub-44pt touch targets on frequent actions** — `foodDBModal.tsx:501-510`, `savedNutritionModal.tsx:375-384`, `FoodRow.tsx:105-114`, `editEntry.tsx:263`, `addExerciseModal.tsx:139,441-448` — 18-32pt remove/add/stepper controls without hitSlop. *(ui-ux)*

---

## ⚪ Low

- Default `height: 175` is metric but `unitSystem: 'imperial'` — a NULL-height row hydrates as 175 *inches* → `heightCm = 444` → absurd BMR/targets — `context/SettingsContext/defaults.ts:12,15`, `macroCalculation.tsx:30`. *(logic)*
- Maintain path in the adjust wizard overwrites `goalPace` with 0 ("0.0 lbs/week" in profile; `weeksToGoal`'s `pace ≤ 0 → 1` fallback is unit-ambiguous) — `adjustNutrition1.tsx:38`, `adjustNutrition4.tsx:53`, `lib/utils/goalMath.ts:6`. *(logic)*
- Settings PATCH silently dropped when no server row exists (op marked done, no capture) — `lib/powersync/Connector.ts:220-224`. Dual-flagged. *(infra + logic)*
- Unbounded manual "Try Again" retries on analyze, each a fresh paid vision call — `analyzingModal.tsx:96-104`. *(security)*
- Raw upstream error bodies surfaced in user Alerts — `lib/openAI/openAI.ts:44`, `lib/foodDB/foodDB.ts:38-39`. *(security)*
- Live `SENTRY_AUTH_TOKEN` in gitignored `.env.local` — never committed; rotate if the working copy is ever shared. *(security)*
- `npm audit --omit=dev`: 33 vulns, all in Expo/Metro build tooling, not the shipped bundle; real fix requires the Expo SDK bump. *(security)*
- Leftover `enableInExpoDevelopment` (a `sentry-expo` option, no-op in this SDK) — dev-client sessions with a DSN report into prod Sentry — `app/_layout.tsx:64`. *(infra)*
- Jest `transformIgnorePatterns` references dead `sentry-expo`, drops `@sentry/react-native` from the whitelist — `package.json:83`. *(infra)*
- `apiKey === 'NULL'` string sentinel in billing implies placeholder-text env hygiene — `context/BillingContext/index.tsx:36`. *(infra)*
- `eas.json` `submit.production` is empty — submission not reproducible from the repo. *(infra)*
- Legacy fatigue/1RM windows compare midnight-normalized log dates against a time-of-day cutoff (boundary-day inclusion varies by wall clock) — `fatigueFunctions.tsx:212-219`, `oneRepMaxFunctions.tsx:23-34`. Fatigue is de-emphasized, impact limited. *(logic)*
- Concurrent notification reschedules can interleave cancel/schedule and double-book — `lib/notifications/scheduler.ts:22-30`, `useNotificationScheduler.ts:19-34`. *(logic)*
- Body-weight graph backfills pre-first-entry days with 0, crushing chart scale and corrupting the "Change" stat if the day-1 weigh-in is missing — `bodyWeightFunctions.tsx:101-118`, `GraphStats.tsx:36-38`. *(logic)*
- "Last 30 days" builders return 31 points in the default branch (currently unrendered paths) — `dateHelper.ts:243-246`. *(logic)*
- ProgressWheel animates its number via per-frame `setState` (~60 renders/s per calorie change) — `components/GraphComponents/ProgressWheel.tsx:67-81`. *(performance)*
- Self-defeating memos from fresh-array deps; archive image map built over all exercises — `exerciseScreen.tsx:29-40`, `archiveModal.tsx:33-41`. *(performance)*
- Food search results render via `.map()` in a ScrollView (bounded ~50 by API page size); foodDB in-memory cache unbounded per key (7-day TTL) — `foodDBModal.tsx:219,316-332`, `lib/foodDB/foodDB.ts:49-66`. *(performance)*
- Static exercise lib copied into React state and re-spread wholesale on custom-exercise changes; fatigue handlers have zero production callers — `context/WorkoutContext/index.tsx:41,370-380,409-416`. *(performance)*
- 109 hardcoded `borderRadius` literals despite the `radius` token set; `'#FFD93D'` star color duplicated verbatim — `addWorkoutModal.tsx:153,166,178`, `paywall.tsx:230`, `subscription.tsx:197`. *(structure)*
- Entry vs SavedEntry near-duplicate cards with cosmetic drift ("kcal" vs "calories", token vs hardcoded radii) — `Entry.tsx:38-41,161-184` vs `SavedEntry.tsx:33-57,140-167`. *(structure)*
- devTest preview re-derives item math without the `?? 1`/rounding contract; ~11 devTest comments cite the deleted RESTYLE_PLAN doc. *(structure)*
- Disabled "next week" chevron styled at 0.7 opacity (reads as enabled) — `progress.tsx:233,239`. *(ui-ux)*
- Row option menus exceed Android's 3-button Alert limit (latent; iOS-first) — `workoutScreen.tsx:40-67`, `nutritionScreen.tsx:38-58`. *(ui-ux)*
- Archive modal: "Click" vs "Tap" copy; mismatched restore (54pt) vs delete (36pt) button pair — `archiveModal.tsx:112,239-258`. *(ui-ux)*
- Exercise screen header can render "undefined" — `exerciseScreen.tsx:42`. *(ui-ux)*
- AppColumn "phone-width" clamp is 1000pt (comment claims ~Pro Max); moot while `supportsTablet: false` — `app/_layout.tsx:30-34`. *(ui-ux)*
- Fatigue still surfaced in settings copy despite the de-emphasis decision — `adjustTraining.tsx:42`, `settings.tsx:103`. *(ui-ux)*
- Nutrition adjust wizard `push`es back to settings, leaving the wizard stack in history — `adjustNutrition4.tsx:61`. *(ui-ux)*
- Stuck upload queue shows only a passive "Syncing N changes..." line forever; SyncWatchdog never escalates to the user — `settings.tsx:49-53`. *(ui-ux)*
- Post-purchase onboarding-commit failure leaves "Maybe later" as the mislabeled retry path for a paying user — `paywall.tsx:59-66,76`. *(ui-ux)*

---

## Cross-agent hotspots (independent convergence = high confidence)

1. **First-sync hang** — flagged by three agents (ui-ux, infra, logic) from three angles: no timeout, no rejection path for the retry UI, no sign-out escape. The single most-confirmed defect in the audit.
2. **Query efficiency (security-cost × performance)** — both independently cited the same two unbounded `SELECT *` history loads; one framed it as memory/startup cost, the other as unbounded growth per launch.
3. **Duplicated logic → real bugs (code-structure × logic-correctness)** — structure mapped the duplication (4× gap-fill walk, triplicated provider scaffolding, modal pairs); logic and ui-ux independently found the concrete bugs living in exactly those drifted copies (zero-backfill stat corruption, missing `useSubmitOnce` on rename/editEntry, memoization in only one of three providers).
4. **The Connector** — infra (wrong errors retry forever), logic (`user_exercises` conflicts dead-letter), structure (branches hand-duplicated, `any`-typed) hit the same file from three directions. Highest-leverage single file to harden.
5. **Silent failure × no telemetry** — the scariest bugs found (C3 settings wedge, H2 queue wedge, dead-letters, force-sign-out data loss) are all silent, and Sentry would capture none of them. Each finding makes the other worse.
6. **AI cost path** — no server quota (C1) × client-only premium (H1) × full-size uploads × no upstream abort × unlimited retries: five findings from three agents compounding on one endpoint.

---

## Go / No-Go

**NO-GO today.** Four Criticals stand (C1-C4), plus two launch-gating-in-practice items: the fake 5.0 rating on purchase screens (App Review 2.3.1 risk) and verifying the `BYPASSRLS` password was rotated in the deployed DB.

**GO is close.** None of the blockers is a rearchitecture: the migration is a deploy step, C3 is a small effect fix plus a regression test, C4 is one `confirmDelete` wrapper, and C1/H1 is one Edge Function hardening pass. The performance/duplication work (H6-H10) is real but degrades with account age, not on day one — a fast-follow track, not a launch gate.

### Top-5 actions

- [ ] **1. Run `nutrition_calories_real.sql` in Supabase** before/with the release build; write a deploy-order checklist so client schema changes can't ship ahead of their migrations again. *(C2)*
- [ ] **2. Fix the `persistSavingRef` wedge** in SettingsContext — reset unconditionally in `finally`, re-arm dirty state from the cancelled path — and add a test for the mutate-during-save sequence. *(C3)*
- [ ] **3. Harden the two Edge Functions**: per-user rate limit/daily quota + server-side premium entitlement check before any upstream call; while in the backend, confirm `powersync_role`'s password was rotated. *(C1, H1, H14)*
- [ ] **4. Close the two "user is stuck/hurt" UX holes**: `confirmDelete` on nutrition entry delete; ~30s timeout on `waitForFirstSync` that flips to the retry state, plus a sign-out escape on the loading screen. *(C4, H3)*
- [ ] **5. Harden the Connector + make failures visible**: dead-letter all permanent error classes (not just 22/23), add `user_exercises` conflict handling, and wire Sentry capture into dead-letters, retry loops, and force-sign-out events. *(H2, H4 slice)*

**Pre-submission extras:** remove the fabricated 5.0 rating; add custom camera purpose string / drop the unused mic string. **Post-launch track, in order:** provider memoization + `React.memo` (H6) → windowed history loads (H7) → `getDateKey` hot-path work (H8) → extract shared gap-fill/modal scaffolding before more drift (H10/H15) → accessibility pass (H12/H13).

---

## What checked out clean (for the record)

- RLS policies + PowerSync sync-rules bucket scoping are correctly per-user; all local SQL parameterized; Edge Functions verify JWTs; no server-side secrets in tracked files (Supabase anon / RevenueCat public / Sentry DSN are legitimately client-public).
- AppSchema defines indexes on every hot lookup path; `useDebouncedSave` (600ms, unmount flush) and food-search debounce (700ms) are healthy; no per-keystroke SQLite writes; SyncWatchdog polls at a reasonable 30s.
- Core domain math (date keys, DST-safe day counting, macro/item summation via `items.ts`, progressive-overload, fatigue, downsample-the-function) is correct and well-tested at the pure-function level; `getDateKey` discipline is near-perfect.
- RevenueCat 15s timeout and OpenAI 30s timeout are enforced; sign-out flush gate exists with a user-consented force-escape; account-deletion cascade is catalog-driven.
- No context is a god object (largest is WorkoutContext at 527 lines of delegating plumbing); no circular imports between contexts; devTest guarded-require pattern verified to keep dev code out of the production bundle; test suite (56 files) is behavior-focused and mocks env/secrets properly.
