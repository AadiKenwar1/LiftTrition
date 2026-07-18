# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

PLATES (LiftTrition) — a React Native / Expo dual-mode fitness tracker: workout logging (progressive-overload suggestions) and nutrition tracking (AI photo analysis, food DB search). iOS-first (Apple Sign-In only), builds via EAS cloud.

## Tech Stack

Expo SDK ~54 · TypeScript strict · Expo Router ~6 (file-based) · PowerSync + SQLite (offline-first local DB) · Supabase (Postgres + Auth + Edge Functions) · RevenueCat (`react-native-purchases`) · victory-native charts · Reanimated ~4 · Sentry · Jest + jest-expo.

## Commands

```bash
npm start                 # expo start --tunnel -c
npm run ios / android / web

npm test                  # jest --watchAll (watch mode!)
npm run test:ci           # single run
npx jest lib/utils/__tests__/dateHelper.test.ts   # single test file
npx jest -t "name"        # single test by name

node scripts/generateImageMap.js   # regen exercise imageMap.ts after adding PNGs

eas build --platform ios --profile preview|production
```

**No `ios/` or `android/` directories** — never run `pod install` or Gradle; native builds go through EAS.

**Environment:** every `EXPO_PUBLIC_*` var is read only through `ENV` in `lib/env.ts` (Babel inlines them statically — never index `process.env` dynamically, never read it outside that file). Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POWERSYNC_URL` (`assertRequiredEnv()` throws at startup if missing). Optional: RevenueCat keys, Sentry DSN — their absence is guarded.

**Version control is owned by the user** — do not commit, branch, push, or open PRs unless explicitly asked.

## Project Structure

```
app/                    Expo Router screens (file = route)
  (tabs)/               index (home/logging), progress, settings
  authScreens/          Login (Apple Sign-In only)
  onboardingScreens/    goals → obstacles → aboutYou → activity → goal → pace →
                        timeline → plan → projection → paywall
                        (pace skipped for "maintain"; numbering in lib/onboarding/steps.ts)
  nutritionScreens/     Nutrition modals (add, saved, foodDB, camera, analyzing, editEntry…)
  workoutScreens/       Workout modals (addWorkout, exercises, logs, notes, archive…)
  settingsScreens/      Profile, subscription, adjustTraining, adjustNutrition/…
  devTest/              __DEV__-guarded route stubs (see Dev tooling)

components/             Per-feature UI folders: GraphComponents (charts, ProgressWheel),
                        GuardComponents (AppLoadingScreen, PowerSyncGuard, SyncWatchdog),
                        NeutralComponents (shared primitives), NutritionComponents,
                        OnboardingComponents, WorkoutComponents, WorkoutLogs, devTest

context/                One folder per provider; hooks re-exported from each index.tsx
  AuthContext/          Session, user ID, sign-in/out
  BillingContext/       RevenueCat subscriptions (hasPremium)
  NutritionContext/     Entries + saved meals + AI analysis
  SettingsContext/      Profile, goals, macro targets, body weight
  ThemeContext/         Design tokens — colors.ts, typography.ts, tokens.ts (see Theming)
  WorkoutContext/       Workouts/exercises/logs + exerciseLibrary/ (dataV2 = active,
                        data/ = legacy — don't add to it) + fatigue functions

lib/
  powersync/            AppSchema (10 tables), Connector, orchestrator, FlushUploads,
                        sync-rules.yaml (reference copy — PowerSync dashboard is source of truth)
  supabase/             Client setup
  openAI/               Vision + text calls via Supabase Edge Function
  foodDB/               FatSecret search via Edge Function, in-memory cache
  utils/                dateHelper, unitConversions, goalMath, downsample, confirmDelete…
  hooks/                useDebouncedSave, useSubmitOnce, useToday, useAsyncLoad…
  devtools/             __DEV__ failure-injection toggles (forceLoadFailure, forceFreeMode…)
  env.ts                The only home for EXPO_PUBLIC_* env vars
  onboarding/           Skip-aware step numbering
```

Tests live in `__tests__/` folders colocated with the code they test (contexts, lib, components).

## Architecture

**Provider stack** (`app/_layout.tsx`, outermost → innermost):
`GestureHandlerRootView → KeyboardProvider → SafeAreaProvider → ThemeProvider → NavigationThemeProvider → AuthProvider → PowerSyncGuard → SyncWatchdog → SettingsProvider → BillingProvider → WorkoutProvider → NutritionProvider → StackLayout` (+ `GoalPromptHost` rendered after the Stack; everything wrapped in `AppColumn`, a phone-width clamp for iPad).

**Route guarding** uses `Stack.Protected` in `_layout.tsx`:
1. No session → `authScreens/login`
2. Session + `!settings.onboardingComplete` → onboarding screens (paywall sets `onboardingComplete` and replaces to `(tabs)`)
3. Session + onboarded + all contexts loaded → `(tabs)` and all other screens

`StackLayout` blocks on `AppLoadingScreen` until settings/nutrition/workout/billing contexts all load; failed loads get a retry path (`loadFailed`/`retryLoad` per context).

**Offline-first data flow:** all user data lives in local SQLite managed by PowerSync, which syncs bidirectionally with Supabase in the background. Reads hit the local DB; `Connector.uploadData()` pushes writes to Supabase. Sign-out is gated by `flushUploadsOrThrow` (`lib/powersync/FlushUploads.ts`) — if the flush times out it throws; don't swallow that error, it prevents data loss.

**AI / external calls:** OpenAI vision and FatSecret food search go through Supabase Edge Functions — no third-party API keys in the client. OpenAI calls are slow (30 s timeout); `analyzingModal` owns the waiting state.

## Key Conventions

- **Comments:** a one-line comment above every named function, and above any non-obvious block; skip inline arrow callbacks. Function components only; context hooks via `useWorkout()`, `useNutrition()`, etc.
- **Styling:** `StyleSheet.create()` for static styles, or `makeStyles(colors)` + `useMemo` for theme-reactive ones. Never hardcode colors/fonts/radii — pull from `@/context/ThemeContext`:
  - `useColors()` — scheme-aware palette (reacts to dark/light toggle)
  - `fonts` / `type` — typography (`FONT_FAMILY` constant flips Poppins↔Archivo app-wide)
  - `radius` / `spacing` / `motion` / `macroColors` — scheme-independent tokens
  - Verify UI changes in **both** dark and light.
- **Reuse shared primitives** in `components/GraphComponents/` and `NeutralComponents/` before hand-rolling new cards/rows/headers.
- **Icons:** prefer `lucide-react-native`; fallback `@expo/vector-icons`.
- **Dates:** always `getDateKey(date)` from `lib/utils/dateHelper` for YYYY-MM-DD keys. It uses the `en-CA` locale deliberately — `toISOString()` gives UTC midnight, which is the wrong day in negative-offset timezones.
- **Item = ingredient.** Code/UI say "item"; DB tables keep legacy `*_ingredients` names (`nutrition_entry_ingredients`, `saved_nutrition_entry_ingredients`). Don't rename the tables.
- **UUIDs:** `react-native-uuid` — never `Math.random()` for IDs.
- **Persistence:** write via `powerSync.execute()` / `writeTransaction()`; contexts use a `persistDirty` flag + debounced saves (`useDebouncedSave`).
- **Units:** values stored in the user's chosen unit system; convert at boundaries with `lib/utils/unitConversions`.
- **Ordering:** workouts/exercises use an explicit `order` integer (0 = first/newest), decremented on insert to bump others.
- **Graph data:** graph functions return `{ day: string, value: number }[]`; charts pre-slice by range in `progress.tsx`.

## Critical Gotchas

1. **Settings table is one row per user** — `Connector.uploadData()` upserts (checks existing row before insert); `weight_progress` is unique on `user_id + date`. New schema tables must handle their own conflict resolution in the Connector.
2. **RevenueCat has a 15 s timeout** and BillingContext continues app load if billing fails (`hasPremium` defaults `false`). Never block UX on billing.
3. **Theme vs. mode:** `ThemeContext` owns the actual dark/light palette. `SettingsContext.mode` is the workout↔nutrition display toggle — unrelated to color scheme.
4. **Exercise library:** active data is `exerciseLibrary/dataV2/`; `data/` is legacy. After adding exercise images, re-run `node scripts/generateImageMap.js`.
5. **Fatigue:** computed from a rolling 30-day max (`refMax`); no logs in 30 days → fatigue 0 by design. Fatigue is de-emphasized in the current UI — don't surface it as a headline feature.

## Dev Tooling (Dev Hub)

Dev-only harness for previewing components in isolation: **Settings → Developer → Dev Hub** (`__DEV__`-gated).

- `app/devTest/` holds thin route stubs that `require()` the real screen inside a `__DEV__` branch and return `null` otherwise — Metro strips the branch in production, so dev code never ships.
- The hub + test pages live in `components/devTest/` (outside `app/` so Expo Router doesn't route them). Pages render real components with scenario toggles (`DevControls`) and a light/dark switch.
- **Never import a `components/devTest/*` file into shipped code via a top-level import** — zero production cost depends on the guarded `require` pattern.
- To add a test page: `XTest.tsx` in `components/devTest/`, stub in `app/devTest/x.tsx`, register in the `_layout.tsx` Stack and the `GROUPS` array in `DevHub.tsx`.
- `lib/devtools/` has failure-injection toggles (force load/save failure, force free mode) for exercising error paths.
