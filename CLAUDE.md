# PLATES — Claude Code Orientation

## What This Is

PLATES (LiftTrition) is a React Native / Expo app — a dual-mode fitness tracker for workout logging (with progressive overload algorithms) and nutrition tracking (with AI photo analysis). It targets iOS first (Apple Sign-In only), with Android support.

---

## Tech Stack

| Layer            | Library                                                | Version |
| ---------------- | ------------------------------------------------------ | ------- |
| Framework        | Expo SDK                                               | ~54     |
| Language         | TypeScript (strict)                                    | ~5.9    |
| Routing          | Expo Router (file-based)                               | ~6      |
| Local DB / Sync  | PowerSync + SQLite                                     | ^1.30   |
| Backend          | Supabase (Postgres + Auth + Edge Functions)            | ^2.95   |
| Auth             | Supabase + Apple Sign-In (`expo-apple-authentication`) | —       |
| In-App Purchases | RevenueCat (`react-native-purchases`)                  | ^9      |
| Charts           | victory-native                                         | ^41     |
| Icons            | lucide-react-native + @expo/vector-icons               | —       |
| Animation        | react-native-reanimated                                | ~4      |
| Error Tracking   | Sentry                                                 | ^8      |
| Testing          | Jest + jest-expo                                       | ~29/~54 |

---

## Commands

```bash
# Start dev server (Expo Go / tunnel)
npm start           # or: npx expo start --tunnel

# Platform-specific
npm run ios
npm run android
npm run web

# Tests
npm test            # runs Jest
npx jest --watch    # watch mode

# EAS Build (cloud)
eas build --platform ios --profile preview
eas build --platform ios --profile production
```

**No local native build** — the project has no `ios/` or `android/` directories; builds go through EAS cloud.

**Environment:** `.env` holds `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never commit secrets; Supabase API keys are public-safe anon keys.

---

## Project Structure

```
app/                    Expo Router screens (file = route)
  (tabs)/               Main tab navigator (index, progress, settings)
  authScreens/          Login (Apple Sign-In only)
  onboardingScreens/    Onboarding flow (goals → obstacles → aboutYou → activity → goal → pace → timeline → plan → projection → paywall; pace is skipped when goalType is "maintain")
  nutritionScreens/     Nutrition logging modals/screens
  workoutScreens/       Workout logging modals/screens
  settingsScreens/      Settings + subscription
  devTest/              Dev-only test routes (__DEV__-guarded stubs; see Dev tooling)

components/
  ExpoComponents/       Minor Expo wrappers
  GraphComponents/      Charts, ProgressWheel, ActivityBanner
  GuardComponents/      AppLoadingScreen, PowerSyncGuard, SyncWatchdog
  NeutralComponents/    Shared UI (CustomHeader, Fab, DatePicker, etc.)
  NutritionComponents/  Nutrition-specific UI
  WorkoutComponents/    Workout-specific UI
  devTest/              Dev Hub + isolated test pages (dev-only; see Dev tooling)

context/
  AuthContext/          Session, user ID, sign-in/out
  BillingContext/       RevenueCat subscriptions
  NutritionContext/     Nutrition entries + saved meals + AI
  SettingsContext/       User profile, goals, macro targets, body weight
  ThemeContext/         Design tokens — palette + typography + radii (useColors / fonts / radius)
  WorkoutContext/       Workouts, exercises, logs, fatigue

lib/
  powersync/            Schema (10 tables), Connector, orchestrator, flush logic
  supabase/             Client setup
  openAI/               Vision + text calls (via Edge Function)
  foodDB/               FatSecret search (via Edge Function, in-memory cache)
  utils/                dateHelper, unitConversions, downsample

constants/Colors.ts     Base color definitions
assets/                 Fonts, images, legal
```

---

## Architecture Summary

**Provider stack (outermost → innermost):**
`GestureHandlerRootView → SafeAreaProvider → ThemeProvider → NavigationThemeProvider → AuthProvider → PowerSyncGuard → SyncWatchdog → SettingsProvider → BillingProvider → WorkoutProvider → NutritionProvider → StackLayout`

**Route guard logic** (in `app/_layout.tsx`):

1. No session → `authScreens/login`
2. Session + no onboarding → `onboardingScreens/goals` (entry screen; `paywall` sets `onboardingComplete` + `onboardingCompletedAt` and `router.replace('/(tabs)')`)
3. Session + onboarded + all contexts loaded → `(tabs)`

**Offline-first data flow:**

- All user data lives in a local SQLite DB managed by PowerSync.
- PowerSync syncs bidirectionally with Supabase Postgres in the background.
- App reads from local DB (fast, works offline); Connector uploads writes back to Supabase.
- Sign-out is gated by `flushUploadsOrThrow` (Gate C) to avoid data loss.

**AI / external calls:**

- OpenAI vision and food DB (FatSecret) calls go through Supabase Edge Functions — no API keys in the client.

---

## Key Conventions

- **No comments** unless non-obvious. Function names and types are self-documenting.
- **Function components only.** No class components.
- **Context hooks re-exported** from each context's `index.tsx` (e.g., `useWorkout()`, `useNutrition()`).
- **Styling:** `StyleSheet.create()` for static files, or `makeStyles(colors)` + `useMemo` for theme-reactive files. No CSS-in-JS library. Pull colors/fonts/radii from `@/context/ThemeContext` — see **Theming & UI** below.
- **Icons:** Prefer `lucide-react-native`; fallback to `@expo/vector-icons` (Ionicons, MaterialCommunityIcons).
- **Dates:** Always use `getDateKey(date)` from `lib/utils/dateHelper` for YYYY-MM-DD keys. Use `en-CA` locale to ensure consistent ISO format.
- **UUIDs:** `react-native-uuid` — never use `Math.random()` for IDs.
- **Graph data:** All graph functions return `{ day: string, value: number }[]`. Charts pre-slice data by range in `progress.tsx`; `downsampleDataPreserveEndpoints` (`lib/utils/downsample`) is available for long series but is not currently in the live render path.
- **Persistence pattern:** Write to PowerSync via `powerSync.execute()` or `writeTransaction()`. Contexts use a `persistDirty` flag + `useEffect` for debounced saves.
- **Unit system:** All values stored in the user's chosen unit system (imperial or metric). Convert at boundaries with `lib/utils/unitConversions`.
- **Ordering:** Workouts/exercises use explicit `order` integer (0 = first/newest). Decremented on insert to bump others.

---

## Theming & UI

The app is mid-migration to the "Refined" design system. **Reuse the centralized tokens and shared primitives — never hardcode colors, fonts, or one-off card styles.** (Source of truth is the code below, not pixel values written in docs.)

- **Design tokens live in `context/ThemeContext/`** (single import path: `@/context/ThemeContext`):
    - `useColors()` — scheme-aware palette (surfaces, hairlines, text, accents, gradients); reacts to the dark/light toggle.
    - `fonts` / `type` — typography; the `FONT_FAMILY` constant flips Poppins↔Archivo app-wide.
    - `radius` / `spacing` — scheme-independent layout tokens.
- **Reuse shared primitives, don't re-roll them.** Cards, rings, and charts live in `components/GraphComponents/` (chart primitives, `ProgressWheel`) and the per-feature `*Components/` folders (`Log`, `Entry`, `DailyIntakeCard`, `ModeSwitcher`, `Fab`). If a pattern already exists, import it — divergence (e.g. two different card headers) comes from hand-rolling instead of reusing.
- **Migration recipe** (restyling a not-yet-migrated screen): import `useColors` + `fonts`/`radius` → `const styles = useMemo(() => makeStyles(colors), [colors])` → replace hardcoded hexes with tokens and `Poppins_XXX` with `fonts.X` → verify in dark **and** light.
- **Standing rule:** if you add or change a shared UI token, primitive, or pattern, update `RESTYLE_PLAN.md` in the same commit so the design doc tracks the code.
- **Full system + per-folder rollout plan:** `RESTYLE_PLAN.md`.

---

## Dev tooling

**Dev Hub** — a dev-only harness for previewing components/charts in isolation, without logging real data. Reach it from **Settings → Developer → Dev Hub** (the row is `{__DEV__ && …}`-gated, so it's hidden in production).

- **Routes:** `app/devTest/` holds thin `__DEV__`-guarded route stubs (`index`, `lineChart`, `barChart`) that `require()` the real screen and return `null` otherwise. Metro replaces `__DEV__` with `false` in production and strips the branch + its `require`, so the dev code never ships.
- **Screens:** the hub + test pages live in `components/devTest/` (kept **outside `app/`** so Expo Router doesn't bundle them). Each test page renders a real component (`Graph1`, `BarChart`, …) with prebuilt scenario toggles (`DevControls`: `Field` + `Segmented`) and a Light/Dark switch, so every edge case (1 point, empty, goal far off, bar > goal, etc.) is viewable on a simulator.
- **Zero production cost** depends on the `__DEV__`-guarded `require` pattern: never pull a `components/devTest/*` file into shipped code via a top-level `import`.
- **Add a test:** drop `XTest.tsx` in `components/devTest/`, add a stub `app/devTest/x.tsx`, then register it in the `app/_layout.tsx` Stack and the `GROUPS` array in `DevHub.tsx`.

---

## Critical Gotchas

1. **No `ios/` or `android/` folder.** Native builds go through EAS. Don't try to run `pod install` or Gradle locally.

2. **PowerSync Gate C (sign-out).** Sign-out calls `flushUploadsOrThrow` before disconnecting. If this times out (15 s default), it throws — don't swallow that error. Skipping it risks losing unsynced user data.

3. **Settings table is constrained to one row per user.** The Connector upserts settings (checks for existing row before insert). Same for `weight_progress` (unique on `user_id + date`). New tables added to the schema must handle their own conflict resolution in `Connector.uploadData()`.

4. **Fatigue algorithm uses a rolling 30-day max for `refMax`.** If an exercise has no logs in 30 days, `refMax = 0` and fatigue is also 0. This is intentional — cold-start protection.

5. **OpenAI calls are expensive and slow (30 s timeout).** The `analyzingModal` screen handles the waiting state. If you add new AI calls, always go through the Edge Function, never put API keys in the client.

6. **RevenueCat has a 15-second timeout.** BillingContext continues loading the app even if billing fails — `hasPremium` defaults to `false`. Don't block UX on billing.

7. **Theme vs. color scheme.** `ThemeContext` manages the actual palette (`useColors()`). `SettingsContext` has a `mode` boolean that is a UI display toggle — unrelated to dark/light mode.

8. **Exercise library has two versions.** `exerciseLibrary/data/` is legacy. The active one is `exerciseLibrary/dataV2/`. Don't add to the old one.

9. **`getDateKey` must use `en-CA` locale.** This guarantees YYYY-MM-DD output regardless of device locale. Using `toISOString()` instead will give UTC midnight, which can be the wrong day in negative-offset timezones.

10. **`lastExercise` is per-user in AsyncStorage** (`lastExercise_${userID}`). It is NOT in PowerSync — it doesn't sync across devices and is intentionally ephemeral per device.
