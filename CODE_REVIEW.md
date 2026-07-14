# PLATES / PLATES — Comprehensive Code Review

_Date: 2026-07-06. Scope: full app (`app/`, `components/`, `context/`, `lib/`, config). Method: three parallel codebase explorations plus direct verification of `app/_layout.tsx`, `lib/powersync/Connector.ts`, `lib/supabase/client.ts`, `context/NutritionContext/index.tsx`, `app.json`, `eas.json`, `package.json`. This is a findings document — no fixes have been applied._

---

## 1. ARCHITECTURE OVERVIEW

### High-level map

- **Navigation:** Expo Router v6, file-based. One root `<Stack>` in `app/_layout.tsx` with three `Stack.Protected` groups: login (`guard={!session}`), 10 onboarding screens (`guard={!settings.onboardingComplete}`), and the main app (`guard={!!session && allContextsLoaded && settings.onboardingComplete}`). Tabs (`(tabs)/`: Log, Progress, Settings) plus ~25 modal/detail screens.
- **State:** Six React contexts, no external state library. `Auth → Settings → Billing → Workout → Nutrition` all nested inside `PowerSyncGuard`, `Theme` outermost. Contexts are the app's "backend client": they hold full table snapshots in React state and expose CRUD handlers.
- **Data flow (offline-first):** PowerSync SQLite is the local source of truth; on `userID` change each context does a **full-table load** (`loadWorkoutData`, `loadNutritionData`, `loadSettingsAndBw`), then all writes are **optimistic React-state updates + scoped row writes** to PowerSync; `Connector.uploadData` drains the CRUD queue to Supabase. No reactive queries (`powerSync.watch`/`useQuery`) anywhere.
- **External calls:** OpenAI/Gemini vision and FatSecret go through Supabase Edge Functions with `Authorization: Bearer <access_token>`; all real secrets live in `Deno.env` server-side. Correct.
- **Sign-out safety:** Gate C — `flushUploadsOrThrow` (60 s) → `supabase.auth.signOut()` → `disconnectAndClearPowerSync()` → `AsyncStorage.clear()`.

### Pattern consistency — mostly good

- **Theming is ~95% migrated**: 40+ screens use the exact `makeStyles(colors)` + `useMemo(..., [colors])` recipe; remaining hex literals are deliberate (white-on-gradient, camera black). The "global assets" step (`context/ThemeContext/assets.ts` replacing deleted `constants/Colors.ts` + `constants/assets.ts`) is clean — **zero dangling imports** of any deleted file.
- **Persistence is inconsistent by design**: SettingsContext uses an elaborate `persistDirty` + retry-nonce + re-queue-during-save pattern; Workout/Nutrition write directly per-handler; Workout additionally scatters raw SQL strings (`powerSync.writeTransaction` with inline `UPDATE ... "order" = ...`) outside its `powersyncStore` layer — schema changes must be tracked in two places.
- **Error handling is uniformly "optimistic + console.warn"**: mutations never roll back state or surface failures to the user.

### Things that will confuse a new engineer

1. **Two unrelated "modes"**: `settings.mode: boolean` = workout/nutrition domain toggle; `ThemeContext.colorScheme` = dark/light. Both read as "theme mode". Recommend renaming `mode` → `domainMode` — but as a dedicated migration, since `mode` is a persisted settings column.
2. **Route-shaped non-routes**: `workoutScreens/workoutScreen.tsx` and `nutritionScreens/nutritionScreen.tsx` are embedded tab components (imported by `(tabs)/index.tsx`) living inside `app/` route folders. Recommend moving them to `components/WorkoutComponents/` and `components/NutritionComponents/`.
3. **Three naming schemes for sequential screens**: named onboarding files ordered by a constant called `NUMBERED` (`lib/onboarding/steps.ts`), genuinely numbered `adjustNutrition1-4.tsx`, and the `goal.tsx` vs `goals.tsx` singular/plural collision.
4. **Branding chaos**: app.json name `PLATES`, slug `App`, bundle `com.LiftTrition.App`, permission strings "PLATES", CLAUDE.md "PLATES", Sentry project `lifttritionapp`, entitlement `LiftTrition Pro`. Needs a product decision on the canonical name.
5. **Decoy/empty dirs**: `lib/theme/` (empty — real theme is `context/ThemeContext/`), `settingsScreens/createExercise/` (empty), `exerciseLibrary/data/` (empty legacy).
6. **Guard subtlety**: the onboarding guard omits a `session` check, so for a signed-out user both the login and onboarding groups are simultaneously active while the anchored `initialRouteName: '(tabs)'` is in neither. Works today via guard ordering, but fragile — recommend `!!session && !settings.onboardingComplete`.

---

## 2. CODE QUALITY & MAINTAINABILITY

- **Provider-value asymmetry (also the #1 perf issue)**: only Theme and Billing memoize their `value`; Auth (`AuthContext/index.tsx:60-70`), Settings (`:160-172`), Workout (`:567-602`, ~30 keys), Nutrition (`:130-147`) pass fresh object literals every render. Workout's `useCallback`-wrapped handlers give a false sense of memoization; Nutrition's handlers aren't `useCallback` at all.
- **God files**: `addExerciseModal.tsx` (746 lines), `editPhotoEntry.tsx` (735), `foodDBModal.tsx` (676), `WorkoutContext/index.tsx` (616), `savedNutritionModal.tsx` (562), `cameraScreen.tsx` (536). The nutrition modals each mix fetch, form state, validation, and rendering. Split opportunistically when next touched — not a rewrite project.
- **Orphan screen**: `settingsScreens/adjustMeasurements.tsx` (9.8 KB, fully themed) — unregistered as a route and unimported anywhere. Dead code.
- **Unused dependencies** (verified zero imports): `jsonwebtoken` (wouldn't run in RN anyway), `base-64` + `@types/base-64`, `react-native-draggable-flatlist` (superseded by `react-native-reorderable-list`), `react-native-inner-shadow`, `expo-web-browser`. (`expo-linking`/`expo-constants` should stay — expo-router peers.)
- **Dead compute wired into contexts**: `handleGetFatigueSummary` / `handleCalculateFatiguePercentage` have zero UI call sites; `getSetsData` / `getMacroDataForGraph` / `getVolumeData` are unused in the live UI (RESTYLE_PLAN.md confirms); `downsampleDataPreserveEndpoints` is not called by any live render path even though CLAUDE.md and ARCHITECTURE.md claim charts use it — **docs drift**.
- **Repo hygiene**: `.expo-start.log` is tracked in git; `notes.txt` is a 2-line scratch file; `fatigueBaseline_v1.txt` is a stale snapshot; and the fatigue baseline test **writes `fatigueBaseline_v2.txt` into the repo root as a side effect of every jest run** — it dirties the working tree (consider gating the write behind an env var like `UPDATE_FATIGUE_BASELINE=1`).
- **Two icon libraries** shipped (lucide ~90 files, @expo/vector-icons ~15 files) — consolidating onto lucide (CLAUDE.md's own stated preference) would drop a dependency.
- **`npm start` = `expo start --tunnel -c`** — forces tunnel + cache clear on every start; slow for local dev. Consider a second script without `-c`.
- **Duplication is minimal** (validators, `calculateMacros`, `getDateKey` all single-source; zero TODO/FIXME/@ts-ignore repo-wide; no import cycles). One wart: `2.20462` inlined in `macroCalculation.tsx:35` while `lbsToKg()` exists in `lib/utils/unitConversions.ts` (note: the helper rounds to 1 decimal, so a direct swap changes precision — add an exact variant).
- **Pre-existing CI breakage**: as of this review, `npx tsc --noEmit` fails with ~31 errors (stale `enableInExpoDevelopment` Sentry option in `_layout.tsx:57`; a `useEffect` returning `() => boolean` in `devStatsModal.tsx:106`; a listener-type error in `BillingContext:100`; type errors in two test files; and all three Deno edge functions being typechecked by the RN tsconfig — they should be excluded in `tsconfig.json`). `npx jest` fails 6 of 18 suites (65 tests) — including `connector.test.ts`, `foodDB.test.ts`, and the 0-byte `openAI.test.ts`.

---

## 3. SECURITY RISKS

### Sound fundamentals

- **No committed secrets.** `.env`/`.env.local` untracked, gitignored, never in git history. All client env vars are public-by-design (`EXPO_PUBLIC_` Supabase publishable key, RevenueCat public SDK key, Sentry DSN). The one real secret (`SENTRY_AUTH_TOKEN`) is build-time only, not `EXPO_PUBLIC_`, gitignored. OpenAI/Gemini/FatSecret/service-role keys exist **only** in Edge Function `Deno.env`. This is the correct architecture.
- No OTA update surface: `expo-updates` isn't installed, so OTA-hijack risk is N/A. The EAS projectId in app.json is public-safe.
- No sensitive data in logs: zero `console.*` of session/token/email/credential in app code.
- `deleteAccount` edge function re-validates the caller's token before `auth.admin.deleteUser`.

### Findings (ranked)

- **S-1 (medium) — Supabase session in plaintext AsyncStorage** (`lib/supabase/client.ts:8-15`). The long-lived refresh token sits unencrypted. Fix: an `expo-secure-store`-backed storage adapter (note: adding it requires a dev-client/EAS rebuild; an AsyncStorage fallback keeps old clients working). Related: the PowerSync SQLite DB (all health/body data) is also unencrypted at rest — acceptable for fitness data behind the iOS sandbox, but worth a deliberate decision.
- **S-2 (medium) — gateway JWT verification disabled on Edge Functions.** Both `fetchOpenAI` and `fetchFoodDB` note "turn off Verify JWT" and enforce auth manually via `supabase.auth.getUser(token)`. Valid, but every future function must remember to replicate the check — one omission = an open, paid AI endpoint. **Also verify RLS policies are enabled on all 10 tables**: with the anon key on the client, RLS is the only real authorization layer for Supabase reads and the Connector's writes.
- **S-3 (low)** — `Purchases.setLogLevel(LOG_LEVEL.VERBOSE)` (`BillingContext/index.tsx:33`) is not `__DEV__`-gated — verbose purchase logging ships to production. `hasPremium` is client-side only (standard for RevenueCat; fine as long as no server resource trusts it).
- **S-4 (low)** — `.expo-start.log` tracked in git (leaks env var _names_, not values); untrack + gitignore.
- **S-5 (info)** — `credential.identityToken!` non-null assertion in Apple sign-in (`authFunctions.tsx`) can crash instead of erroring gracefully; `Sentry.init`'s `enableInExpoDevelopment` option is stale (sentry-expo-era; it's also one of the current tsc errors).

---

## 4. PERFORMANCE

### The big one: context re-render architecture

Four of six providers pass unmemoized `value` objects (§2), so **any state change in a provider re-renders every consumer** — and `StackLayout` itself consumes five contexts, so provider churn re-renders the navigation shell. Compounding: **`React.memo` is used in exactly zero components** repo-wide, so re-renders cascade into every list row and card. Concretely:

- `NutritionContext` recreates 9 handlers per render; `DailyIntakeCard.tsx:42` calls `handleGetMacrosForDate(date)` — a full `.reduce` over all nutrition history — **in the render body, every render**.
- `SettingsContext`'s `handleGetBodyWeightProgressData` is a fresh function each render and is a `useMemo` dependency in `progress.tsx:77` — that memo is dead on arrival.
- Per-render `.filter().sort()` over whole tables in `workoutScreen.tsx:22`, `exerciseScreen.tsx:28`, `nutritionScreen.tsx:20-25`, `logsModal.tsx:104-112`.
- `ScrollableList.tsx:46-51` re-filters + re-sorts up to **1,318 exercises on every keystroke**, with an inline `renderItem` and no memoized rows.

### Other findings

- **`foodDBModal.tsx:199,280`**: API search results rendered via `ScrollView` + `.map()` — no virtualization. Convert to FlatList.
- **`ProgressWheel.tsx:80-87`**: `Animated` listener calls `setDisplayPercent` per frame → up to ~60 React re-renders of the whole SVG wheel per 1 s animation, on the JS thread, re-fired whenever calories change. Isolate the counter in a small child component, or drive it with reanimated (already installed, currently imported for side-effects only).
- **`IMAGE_MAP`**: 1,318 static `require()`s (~6.5 MB PNG, ~12 MB on disk) imported wholesale by 4 screens; no code-splitting possible with a flat map. Images are tiny (~5 KB each) so this is a bundle/asset-registry cost more than memory — acceptable short-term; consider on-demand loading or vector art if the library grows.
- **Startup path**: splash blocks on **24 font faces** — both full Poppins _and_ Archivo families load even though `FONT_FAMILY` flips the app to one of them; `allContextsLoaded` gates first paint on the **slowest** of Settings/Nutrition/Workout/Billing — RevenueCat alone can hold the spinner up to its 15 s timeout, which violates CLAUDE.md's own gotcha #6 ("don't block UX on billing"). `waitForFirstSync()` is awaited redundantly (PowerSyncGuard + each context).
- **Scale cliff**: full-table loads with no `LIMIT`/pagination (`SELECT * FROM logs ORDER BY date DESC`, all nutrition entries + ingredients ever). Fine at month 1; at year 2 of daily logging every cold start parses thousands of rows into JS and every `.filter()` above walks them. Plan date-windowed loads (e.g., last 90 days + lazy history) before user histories grow.

---

## 5. BUGS & DATA-INTEGRITY RISKS

1. **Silent PATCH drop — `Connector.ts:194`.** In `updateRecord` for `settings`: record not found by id → fall back to session user → no remote settings row → bare `return`. The user's settings change is acknowledged locally and silently discarded remotely. Should insert (the row exists locally) or throw so PowerSync retries.
2. **Sign-out Gate C depends on SDK-shape guessing — `uploadQueueStats.ts:5-11`.** `s.count ?? s.entryCount ?? s.entries ?? 0`: if a PowerSync upgrade renames the field again, the estimate becomes **0**, `flushUploadsOrThrow` passes instantly, and sign-out **wipes the local DB with uploads still pending** — the exact data loss Gate C exists to prevent. Should fail closed on unknown shapes, with a unit test pinning the real SDK shape.
3. **Check-then-act races — `Connector.ts:100-151`.** `settings` and `weight_progress` do select→insert/update; concurrent uploads (retry + new transaction) can double-insert and then permanently fail on the unique constraint, wedging the upload queue. Make the insert fall back to update on unique-violation (23505), or use Postgres `onConflict` upserts.
4. **Remote changes never reach the UI.** No `powerSync.watch`/`useQuery`; contexts reload only on `userID` change. Data synced _down_ from another device (or a restored backup) sits in SQLite invisible until app restart. Low impact while iOS-single-device, but it contradicts the offline-first sync story — plan a watch-query migration or at least a foreground refresh.
5. **Potential infinite spinner on offline first launch.** `PowerSyncGuard` proceeds if `waitForFirstSync()` rejects, but each context then awaits `waitForFirstSync()` again — a promise that may never resolve with no connectivity on a fresh install → `loaded` never flips → permanent `AppLoadingScreen`. Needs a timeout/fallback in the contexts (verify on device with airplane mode + fresh install).
6. **Onboarding guard lacks a session check** (§1.6) — relies on guard evaluation order; make it explicit.

## 6. TESTING

- **Strong**: pure domain logic — fatigue (824 lines of tests incl. regression baseline), workout/volume/exercise/log functions, nutrition graph functions, body weight, foodDB client (1,212 lines), downsample, connector basics. 18 test files.
- **Gaps**: `lib/openAI/__tests__/openAI.test.ts` is **0 bytes** (a placeholder that fails jest); NutritionContext CRUD tests are 81 thin lines; **zero** tests for AuthContext, BillingContext, any component/screen, the Edge Functions, `macroCalculation`, or the two data-loss-critical paths above (Connector conflict branches, flush-gate shape).
- **Current state**: 6 of 18 suites fail as of this review (see §2, pre-existing CI breakage).
- Highest-ROI additions: Connector `updateRecord`/`createRecord` branch tests, a `getPendingUploadEstimate` shape-pinning test, `macroCalculation` tests.

## 7. PRIORITIZED ACTION PLAN (recommendations — nothing applied yet)

**P0 — data integrity (small diffs, high stakes)**

1. Fix silent settings-PATCH drop (`Connector.ts:194`) — insert or throw.
2. Fail-closed + shape-pinning test for `getPendingUploadEstimate` (sign-out Gate C).
3. Handle unique-violation conflicts in `createRecord` (insert → update fallback or `onConflict` upsert).
4. Verify RLS on all 10 tables; document per-function auth checks as mandatory.

**P1 — performance foundation (one focused PR)** 5. `useMemo` the four provider values; `useCallback` NutritionContext + Settings handlers. 6. `React.memo` the list rows (`Log`, `Entry`, ScrollableList row); memoize `filteredData`/`renderItem` in the 1,318-item pickers; hoist per-render `.filter().sort()` into `useMemo`. 7. foodDBModal search → FlatList; ProgressWheel off per-frame setState. 8. Decouple billing from the startup gate; load only the active font family. 9. SecureStore adapter for the Supabase session (S-1) — requires a dev-client/EAS rebuild.

**P2 — hygiene & debt** 10. Delete: `adjustMeasurements.tsx`, empty dirs (`lib/theme/`, `createExercise/`, `exerciseLibrary/data/`), unused deps (`jsonwebtoken`, `base-64`, `@types/base-64`, `react-native-draggable-flatlist`, `react-native-inner-shadow`, `expo-web-browser`), `notes.txt`; untrack `.expo-start.log`; stop the baseline test writing into the repo root. 11. Remove dead compute surface (fatigue handlers, `getSetsData`/`getMacroDataForGraph`/`getVolumeData`) or wire it up; fix the CLAUDE.md/ARCHITECTURE.md downsampling claim. 12. Fix the pre-existing tsc errors (stale Sentry option, `devStatsModal` effect return, `BillingContext` listener type) and exclude `lib/supabase/functions/**` (Deno) from `tsconfig.json`. 13. Rename `settings.mode` → `domainMode`; move embedded `workoutScreen`/`nutritionScreen` out of route folders; unify branding strings; make the onboarding guard session-explicit. 14. Plan date-windowed data loading before user histories grow (scale cliff, §4). 15. Split the 600–750-line nutrition modals when next touched.
