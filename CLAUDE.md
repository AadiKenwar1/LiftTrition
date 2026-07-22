# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

PLATES (bundle id `com.LiftTrition.App`) — a React Native / Expo dual-mode fitness tracker: workout logging with progressive-overload suggestions, and nutrition tracking with AI photo analysis and food-DB search. iOS-first (Apple Sign-In only, `supportsTablet: false`); native builds go through EAS cloud.

## Tech Stack

Expo SDK ~54 · TypeScript strict · Expo Router ~6 (file-based routes) · PowerSync + quick-sqlite (offline-first local DB) · Supabase (Postgres + Auth + Edge Functions) · RevenueCat (`react-native-purchases`) · victory-native charts · Reanimated ~4 · Sentry · Jest + jest-expo.

## Commands

```bash
npm start                 # expo start --tunnel -c
npm run ios / android / web

npm test                  # jest --watchAll (watch mode!)
npm run test:ci           # single run — use this for verification
npx jest lib/utils/__tests__/dateHelper.test.ts   # single test file
npx jest -t "name"        # single test by name
npm run typecheck         # tsc --noEmit

node scripts/generateImageMap.js   # regen exercise imageMap.ts after adding PNGs

eas build --platform ios --profile development|preview|production
```

**No `ios/` or `android/` directories** — never run `pod install` or Gradle; native builds happen on EAS.

**Version control is owned by the user** — do not commit, branch, push, or open PRs unless explicitly asked.

## Environment

Every `EXPO_PUBLIC_*` var is read only through `ENV` in `lib/env.ts`. Babel inlines them statically, so each must appear as a literal `process.env.EXPO_PUBLIC_*` expression — never index `process.env` dynamically, never read it outside that file. Required (checked by `assertRequiredEnv()` at startup): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POWERSYNC_URL`. Optional: RevenueCat keys, `SENTRY_DSN`, `APP_ENV` — absence is guarded (BillingContext early-returns; Sentry disables itself).

## Project Structure

```
app/                    Expo Router screens (file = route)
  (tabs)/               index (home/logging), progress, settings
  authScreens/          login (Apple Sign-In only)
  onboardingScreens/    goals → obstacles → aboutYou → activity → goal → pace →
                        timeline → plan → projection → paywall
                        (skip-aware step numbering lives in lib/onboarding/)
  nutritionScreens/     nutrition modals (add, saved, foodDB, camera, analyzing, editEntry…)
  workoutScreens/       workout modals (addWorkout, exercises, logs, notes, archive…)
  settingsScreens/      profile, subscription, adjustTraining, adjustNutrition/…, notifications
  devTest/              dev-only preview/diagnostics routes (see Dev tooling)

components/             per-feature folders: GraphComponents, GuardComponents
                        (AppLoadingScreen, PowerSyncGuard, SyncWatchdog),
                        NeutralComponents (shared primitives), NutritionComponents,
                        OnboardingComponents, WorkoutComponents, WorkoutLogs, devTest

context/                one folder per provider; hooks re-exported from each index.tsx
  AuthContext/          session, user ID, sign-in/out
  BillingContext/       RevenueCat subscriptions (hasPremium)
  NutritionContext/     entries + saved meals + AI analysis + notification scheduler hook
  SettingsContext/      profile, goals, macro targets, body weight
  ThemeContext/         design tokens — colors.ts, typography.ts, tokens.ts (see Theming)
  WorkoutContext/       workouts/exercises/logs; exerciseLibrary/ has dataV2 (active)
                        and data/ (legacy — don't add to it)

lib/
  powersync/            AppSchema, Connector, orchestrator, FlushUploads, system,
                        waitForFirstSync, watchdogStatus, sync-rules.yaml
  supabase/             client, secureStorage, Edge Functions source, SQL migrations
  openAI/               vision + text calls via Supabase Edge Function
  foodDB/               FatSecret search via Edge Function, in-memory cache
  notifications/        local-notification builders, permissions, prefs, scheduler
  utils/                dateHelper, unitConversions, goalMath, downsample, confirmDelete…
  hooks/                useDebouncedSave, useSubmitOnce, useToday, useAsyncLoad
  devtools/             __DEV__ failure-injection toggles (forceLoadFailure,
                        forceSaveFailure, forceFreeMode)
  env.ts                the only home for EXPO_PUBLIC_* env vars
  onboarding/           skip-aware onboarding step numbering
```

Tests live in `__tests__/` folders colocated with the code they test. Jest ignores `lib/supabase/functions/` (Deno Edge Function code, not app code).

## Architecture

**Provider stack** (`app/_layout.tsx`, outermost → innermost):
`GestureHandlerRootView → KeyboardProvider → SafeAreaProvider → ThemeProvider → NavigationTheme → AuthProvider → PowerSyncGuard → SyncWatchdog → SettingsProvider → BillingProvider → WorkoutProvider → NutritionProvider → StackLayout`, with `GoalPromptHost` rendered after the Stack and everything inside `AppColumn` (a phone-width clamp so iPads get a centered phone-width column).

**Route guarding** uses `Stack.Protected` in `_layout.tsx`:
1. No session → `authScreens/login`
2. Session + `!settings.onboardingComplete` → onboarding screens (paywall completes onboarding)
3. Session + onboarded + all contexts loaded → `(tabs)` and all other screens
4. `devTest/*` and `devStatsModal` additionally require `__DEV__`, so production builds can't deep-link into them

`StackLayout` blocks on `AppLoadingScreen` until settings/nutrition/workout/billing contexts load; failed loads get a retry path (`loadFailed`/`retryLoad` per context).

**Offline-first data flow:** all user data lives in local SQLite managed by PowerSync (schema in `lib/powersync/AppSchema.ts`), syncing bidirectionally with Supabase in the background. Reads hit the local DB; `Connector.uploadData()` pushes writes up. Sign-out is gated by `flushUploadsOrThrow` (`lib/powersync/FlushUploads.ts`) — flush failures throw `UploadFlushError` subclasses; don't swallow them, they prevent data loss.

**Sync rules:** `lib/powersync/sync-rules.yaml` is a reference copy only — the PowerSync Cloud dashboard is the source of truth; when rules change there, paste the new version into the repo in the same commit. Data queries are `SELECT *`, so adding a column needs no sync-rules change, but existing rows don't pick up a new column until UPDATEd (backfill required).

**AI / external calls:** OpenAI vision and FatSecret food search go through Supabase Edge Functions (`lib/supabase/functions/`) — no third-party API keys in the client. OpenAI calls are slow; `analyzingModal` owns the waiting state.

## Key Conventions

- **Comments:** one-line comment above every named function, and above any non-obvious block; skip inline arrow callbacks.
- **Components:** function components only; consume contexts via their hooks (`useWorkout()`, `useNutrition()`, `useSettings()`, `useBilling()`, `useAuth()`).
- **Styling:** `StyleSheet.create()` for static styles, or a `makeStyles(colors)` + `useMemo` pattern for theme-reactive ones. Never hardcode colors/fonts/radii — pull from `@/context/ThemeContext`:
  - `useColors()` — scheme-aware palette (reacts to dark/light toggle)
  - `fonts` / `type` — typography (the `FONT_FAMILY` constant in typography.ts flips Poppins↔Archivo app-wide)
  - `radius` / `spacing` / `motion` / `macroColors` — scheme-independent tokens
- **Navigation:** modals use `presentation: 'modal'` with swipe-to-dismiss; pushed screens use the native OS back chevron (`headerBackButtonDisplayMode: 'minimal'`) — don't add custom `headerLeft` back buttons (iOS 26 Liquid Glass mis-centers custom JS views).
- **Errors:** route crashes are reported to Sentry once via the exported `ErrorBoundary` in `_layout.tsx`, then fall through to expo-router's default error UI.

## Dev Tooling

- `app/devTest/` — a Dev Hub (`devTest/index`) of `__DEV__`-guarded preview/diagnostics screens for individual components and flows; register new UI experiments here.
- `lib/devtools/` — failure-injection toggles (`forceLoadFailure`, `forceSaveFailure`, `forceFreeMode`) for exercising retry/error/free-tier paths.
