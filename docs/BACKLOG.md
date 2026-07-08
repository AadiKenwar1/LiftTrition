# Backlog

Deferred work agreed during the July 2026 code review (details in `CODE_REVIEW.md`). One line each; strike items as they land.

## Pre-launch (manual — no code)

- [ ] **Verify Supabase RLS on all 10 tables** (`user_id = auth.uid()` policies). With the publishable key in the client, RLS is the only authorization layer. _Most important unfinished item._
- [ ] **Confirm production EAS env vars** (`eas env:list --environment production`) — `.env` is gitignored and not uploaded with builds.
- [ ] **App Store Connect privacy labels**: health/fitness data, photos (meal photos processed via OpenAI — mention third-party AI processing in the privacy policy), identifiers, purchases.

## Billing

- [ ] **Cache last-known `hasPremium` in AsyncStorage** (per-user key), hydrate at startup, overwrite when RevenueCat responds; then **remove `billingLoaded` from the `allContextsLoaded` gate** in `app/_layout.tsx`. Kills the 15 s worst-case startup while keeping flicker prevention; offline premium users stop being locked out. (Design agreed in review chat; current gate shows wrong state anyway when RC fails.)

## App Store polish

- [ ] **`expo-camera` plugin in app.json** with a purpose-specific `cameraPermission` string (current builds get the generic auto-applied default; guideline 5.1.1 risk).

## Data integrity (CODE_REVIEW §5)

- [ ] **Connector silent PATCH drop** (`Connector.ts:194`): insert the settings row instead of bare `return`.
- [ ] **Insert-conflict fallback** in `createRecord` for `settings`/`weight_progress` (retry as update on 23505) — the select→insert race can wedge the upload queue.
- [ ] **Fail-closed `getPendingUploadEstimate`** + shape-pinning test — unknown SDK stats shape currently reads as 0 pending and lets sign-out wipe unsynced data.
- [ ] **Offline first-launch timeout**: contexts await `waitForFirstSync()` bare; a fresh install with no connectivity spins forever. Race against a timeout + retry state. (Verify on device first.)
- [ ] **PowerSync watch queries** (or foreground refresh) — remote changes currently invisible until app restart.

## Performance (CODE_REVIEW §4)

- [ ] Memoize provider `value` for Auth/Settings/Workout/Nutrition; `useCallback` NutritionContext + Settings handlers.
- [ ] `React.memo` list rows (`Log`, `Entry`, ScrollableList row); memoize `filteredData`/`renderItem` in the 1,318-item exercise pickers; hoist per-render `.filter().sort()` (workoutScreen, exerciseScreen, nutritionScreen, logsModal, DailyIntakeCard).
- [ ] `foodDBModal` search results → FlatList (currently ScrollView + `.map`).
- [ ] ProgressWheel: isolate the animated counter so the SVG wheel stops re-rendering per frame.
- [ ] Trim font loading (both full Poppins + Archivo families load; `FONT_FAMILY` uses one).
- [ ] Date-windowed data loading (e.g. last 90 days + lazy history) before user histories grow — full-table loads are unbounded today.

## Security

- [ ] **SecureStore-backed Supabase session storage** (with AsyncStorage fallback) — refresh token is plaintext today. Requires a dev-client/EAS rebuild.

## Cleanup

- [ ] Remove unused deps: `jsonwebtoken`, `base-64` + `@types/base-64`, `react-native-draggable-flatlist`, `react-native-inner-shadow`, `expo-web-browser`.
- [ ] Delete orphan `settingsScreens/adjustMeasurements.tsx`; empty dirs (`lib/theme/`, `settingsScreens/createExercise/`, `exerciseLibrary/data/`).
- [ ] `settings.mode` → `domainMode` (dedicated migration — persisted column).
- [ ] Branding unification (app.json name/slug vs bundle id vs "Plates" strings vs Sentry project vs entitlement name).
- [ ] Consolidate icons onto `lucide-react-native` (~15 files still on `@expo/vector-icons`).
- [ ] Fix pre-existing failures: ~31 tsc errors (stale Sentry option, `devStatsModal` effect return, `BillingContext:100` listener type, exclude `lib/supabase/functions/**` from tsconfig) and 6 failing jest suites (incl. 0-byte `openAI.test.ts`).
- [ ] Decide `RESTYLE_PLAN.md` retirement once the restyle is declared done (then strip its two CLAUDE.md references).
- [ ] Move embedded `workoutScreen.tsx` / `nutritionScreen.tsx` out of `app/` route folders into `components/`.
