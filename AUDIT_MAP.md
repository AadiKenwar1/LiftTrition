# AUDIT_MAP — PLATES (LiftTrition)

Reference map for the July 2026 multi-agent audit. Derived from code on 2026-07-12 (branch `main`, working tree includes uncommitted changes — audit the working tree as-is).

## What the app is

React Native / Expo SDK 54 dual-mode fitness tracker: workout logging (progressive overload, 1RM estimates, fatigue) + nutrition tracking (manual, AI photo analysis, FatSecret food DB). iOS-first, Apple Sign-In only. Offline-first: all user data in local SQLite via PowerSync, background bidirectional sync to Supabase Postgres. RevenueCat subscriptions gate premium features (AI scan, food DB).

## Entry points & routing (Expo Router, file-based)

- Root: `app/_layout.tsx` — provider stack (outer→inner): GestureHandlerRootView → KeyboardProvider → SafeAreaProvider → ThemeProvider → NavigationTheme → AuthProvider → PowerSyncGuard (+SyncWatchdog) → SettingsProvider → BillingProvider → WorkoutProvider → NutritionProvider → StackLayout.
- Route guards in `StackLayout` (`app/_layout.tsx:146-207`) via `Stack.Protected`:
  1. `!session` → only `authScreens/login`
  2. `!settings.onboardingComplete` → only onboarding screens
  3. `session && allContextsLoaded && onboardingComplete` → tabs + all modals
  - `allContextsLoaded = settingsLoaded && nutritionLoaded && workoutLoaded && billingLoaded` gates EVERYTHING behind `AppLoadingScreen` (`app/_layout.tsx:118-126`).
- Tabs: `app/(tabs)/` — `index` (log screen, mode-switched), `progress`, `settings`.
- `app/(tabs)/index.tsx` embeds `app/workoutScreens/workoutScreen.tsx` or `app/nutritionScreens/nutritionScreen.tsx` as **components** (they also exist as router-scannable files under `app/`). FAB actions switch on `settings.mode` (true = workout).
- `app/devTest/**` + `components/devTest/**` are `__DEV__`-only. **Out of audit scope** except where dev code leaks into production paths.

## State management

Five React contexts, each re-exporting hooks from `index.tsx`:
- `AuthContext` — Supabase session, userID, signIn/signOut/deleteAccount (`functions/authFunctions.tsx`, `functions/accountFunctions.tsx`). Sign-out is gated by `flushUploadsOrThrow` (Gate C) — 15s timeout, throws on failure to avoid losing unsynced writes.
- `SettingsContext` — one settings row per user (profile, goals, macro targets, unitSystem, `mode` display toggle, onboarding flags) + `bwProgress` (weight_progress rows). `functions/macroCalculation.tsx`, `bodyWeightFunctions.tsx`, `validator.tsx`, `database/powersyncStore.ts`.
- `BillingContext` — RevenueCat; `hasPremium`, packages, purchase/restore. 15s timeout; app must not block on billing failure (`hasPremium` defaults false).
- `WorkoutContext` — workouts/exercises/logs arrays loaded fully into memory; CRUD in `functions/workoutFunctions.tsx`, `exerciseFunctions.tsx`, `logFunctions.tsx`; algorithms in `progressionFunctions.ts`, `oneRepMaxFunctions.tsx`, `fatigueFunctions.tsx`, `volumeFunctions.tsx`, `graphFunctions.tsx`; exercise library `exerciseLibrary/dataV2/` (legacy `data/` is dead); `lastExercise` per-user in AsyncStorage (`lastExercise_${userID}`), intentionally device-local.
- `NutritionContext` — nutrition entries + saved meals + AI calls (`functions/crudFunctions.tsx`, `aiFunctions.tsx`, `graphFunctions.tsx`); recently memoized (see docs/RENDER_FIXES.txt).

Pattern: contexts load full table history at startup from PowerSync SQLite, keep in-memory arrays, write with `powerSync.execute()`/`writeTransaction()`, some use `persistDirty` flag + debounced `useEffect` saves.

## Data layer

- Schema: `lib/powersync/AppSchema.ts` — 10 tables: settings, user_exercises, weight_progress, nutrition_entries, nutrition_entry_ingredients, saved_nutrition_entries, saved_nutrition_entry_ingredients, workouts, exercises, logs.
- `lib/powersync/system.ts` — DB setup; `Connector.ts` — uploadData → Supabase upserts (settings: check-then-insert one row per user; weight_progress unique on user_id+date); `orchestrator.ts` — connect/disconnect/kick with mutex chain; `FlushUploads.ts` + `uploadQueueStats.ts` — Gate C flush; `watchdogStatus.ts` + `components/GuardComponents/SyncWatchdog.tsx` — stall detection.
- Row↔object converters live in each context's `database/powersyncStore.ts`.

## External services (all via Supabase Edge Functions — no client API keys)

- `lib/openAI/` → `fetchOpenAI` edge fn (vision photo analysis + text macro generation; 30s timeout; `analyzingModal` is the wait UI).
- `lib/foodDB/` → `fetchFoodDB` edge fn (FatSecret search; in-memory cache).
- `lib/supabase/functions/deleteAccount/` — account deletion.
- RevenueCat SDK direct (`context/BillingContext/functions/billingFunctions.tsx`).
- Sentry (`app/_layout.tsx:57`).

## Core user flows (trace these)

1. **Sign in** — `authScreens/login.tsx` → Apple Sign-In → Supabase session → `AuthContext` → `PowerSyncGuard` connects PowerSync + waits first sync → contexts load → guard routes to tabs or onboarding.
2. **Onboarding** — goals → obstacles → aboutYou → activity → goal → pace (skipped when goalType='maintain') → timeline → plan → projection → paywall. Steps write into SettingsContext; `paywall.tsx` `completeOnboarding()` sets `onboardingComplete` + `onboardingCompletedAt` then `router.replace('/(tabs)')`. Step order/config: `lib/onboarding/steps.ts`.
3. **Subscribe / restore** — paywall (onboarding) and `settingsScreens/subscription.tsx`; RevenueCat purchase/restore → `hasPremium`. Free users: camera + foodDB FAB buttons reroute to subscription screen (`app/(tabs)/index.tsx:62-68`).
4. **Create & organize workouts** — FAB → `addWorkoutModal` (order-bump insert) → `workoutScreen` list (drag reorder, rename/duplicate/archive/delete via Alert menu) → `archiveModal` (restore) → `notesModal`, `renameModal`.
5. **Log sets** — `workoutScreen` → `exerciseScreen?workoutId=` → `addExerciseModal` (library search or custom exercise) → `logsModal` (add/delete sets; progressive-overload suggested set; validation) → `Log`/`LogHistoryList` components; `LogDateModal` to back-date.
6. **Log food manually** — nutrition mode → FAB add → `addNutritionModal` → entry appears in `nutritionScreen` list for `selectedDate` (`dateModal` picks date) → long-press Alert: Edit (`editManualEntry`/`editPhotoEntry`), Save (to saved meals), Delete.
7. **AI photo meal (premium)** — FAB camera → `cameraScreen` → `analyzingModal` (30s timeout path) → OpenAI vision → entry + ingredients → `editPhotoEntry` (ingredient-level edits).
8. **Food DB (premium)** — FAB search → `foodDBModal` → FatSecret search → pick serving → add entry.
9. **Saved meals** — FAB bookmark → `savedNutritionModal` → re-log/unsave; duplicate-name suffix "(2)" logic in save.
10. **Body weight** — `updateBWModal` (+`bwCard`) → `weight_progress` upsert (unique user_id+date) → progress line chart; also feeds fatigue (`bwOnDate`).
11. **Review progress** — `(tabs)/progress.tsx` — lift mode: 1RM line per exercise (`SelectionModal` picker, `lastExercise` default) + weekly sets bars; nutrition mode: body-weight line (goal overlay) + weekly macro bars (`selectedMacro`); week paging bounded by `onboardingCompletedAt`; `ActivityBanner` + streaks.
12. **Adjust goals/macros** — `settingsScreens/adjustNutrition/adjustNutrition1-4` (regenerate macros — includes AI text call), `adjustTraining.tsx`, `profile.tsx` (height/weight edit modals), unit system implications (`lib/utils/unitConversions.ts` — stored values are in the user's chosen unit system, converted at boundaries).
13. **Sign out / delete account** — settings → `signOut()` (Gate C flush, throws on timeout; `forceSignOut` variant) / `deleteAccount()` edge fn → back to login.

## Known issues — do NOT re-report these (already tracked)

From `docs/BACKLOG.txt` + `docs/RENDER_FIXES.txt` + CLAUDE.md:
- Saved-meals list not newest-first after sync round trip (created_at Hermes date-parse suspect).
- `getPendingUploadEstimate` returns 0 on unknown SDK shapes → sign-out could wipe unsynced data.
- `Connector.ts:~194` settings PATCH silently dropped when no existing row.
- `waitForFirstSync()` has no timeout → fresh offline install can spin forever.
- No PowerSync watch queries — mid-session remote changes invisible until restart.
- Provider value memoization pending for Auth/Settings/Workout (Nutrition done 2026-07-12).
- Exercise picker re-sorts all 1,318 items per keystroke.
- Supabase session/refresh token in plaintext AsyncStorage (secure-store migration pending).
- ~31 pre-existing tsc errors + 6 failing jest suites (tracked in CODE_REVIEW.md).
- `billingLoaded` in the startup gate → 15s worst-case cold launch.
- Empty-state icon circles read as white badges in light mode (`colors.surface`).
- foodDBModal scroll/jump glitch (legacy KeyboardAvoidingView architecture) — deferred.
- Orphans/cleanup: `settingsScreens/adjustMeasurements.tsx`, unused deps, `settings.mode` naming, embedded workoutScreen/nutritionScreen living under `app/`, icons consolidation.
- DailyIntakeCard re-animation flash — FIXED 2026-07-12 (stable list header elements + Nutrition memoization); don't re-flag unless the fix itself is buggy.

New findings that add a *different root cause or consequence* in these areas are fine; restating the bullet is not.

## Audit conventions

- Dates: `getDateKey(date)` (en-CA locale) is the canonical YYYY-MM-DD key; `toISOString()` for day keys is a known bug pattern (UTC shift).
- IDs: `react-native-uuid`; `Math.random()` IDs are a bug.
- Ordering: workouts/exercises use explicit integer `order`, 0 = first; inserts bump others.
- Graph data contract: `{ day: string, value: number }[]`.
- Units: stored in user's chosen system; conversions only at boundaries.
- Fatigue: rolling 30-day max for refMax; 0 when no logs in 30 days (intentional cold-start).
- Theme: `useColors()` from ThemeContext; `settings.mode` is the workout/nutrition toggle, NOT dark/light.
