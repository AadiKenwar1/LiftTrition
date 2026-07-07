# PLATES — Architecture Reference

> Deep-dive reference document. For the quick session orientation, see CLAUDE.md.

---

## Table of Contents

1. [Full Directory Tree](#full-directory-tree)
2. [Tech Stack & Dependencies](#tech-stack--dependencies)
3. [Entry Points & Routing](#entry-points--routing)
4. [Context / State Management](#context--state-management)
5. [Components](#components)
6. [Library Layer](#library-layer)
7. [Database Schema](#database-schema)
8. [Authentication Flow](#authentication-flow)
9. [Key Algorithms](#key-algorithms)
10. [Data Models](#data-models)
11. [Testing](#testing)
12. [Build & Deployment](#build--deployment)
13. [Code Conventions](#code-conventions)
14. [Dependency Map — What Breaks If X Changes](#dependency-map)
15. [Quirks & Non-Obvious Decisions](#quirks--non-obvious-decisions)

---

## Full Directory Tree

```
App/
├── app/                            Expo Router — every file is a route
│   ├── _layout.tsx                 Root layout: providers, route guards, font loading
│   ├── +not-found.tsx              404 screen
│   ├── modal.tsx                   Generic modal (unused/placeholder)
│   ├── (tabs)/
│   │   ├── _layout.tsx             Tab bar (Log, Progress, Settings)
│   │   ├── index.tsx               Log tab: WorkoutScreen ↔ NutritionScreen
│   │   ├── progress.tsx            Progress tab: graphs, ProgressWheel, stats
│   │   └── settings.tsx            Settings tab: navigation list
│   ├── authScreens/
│   │   └── login.tsx               Apple Sign-In CTA
│   ├── onboardingScreens/
│   │   ├── introduction.tsx        Welcome screen
│   │   ├── preboard.tsx            Pre-onboarding info
│   │   ├── onboarding2.tsx         Birth date
│   │   ├── onboarding3.tsx         Gender
│   │   ├── onboarding4.tsx         Height
│   │   ├── onboarding5.tsx         Body weight
│   │   ├── onboarding6.tsx         Unit system
│   │   ├── onboarding7.tsx         Activity level
│   │   ├── onboarding8.tsx         Goal type (lose/gain/maintain)
│   │   ├── onboarding9.tsx         Goal weight + pace
│   │   └── onboarding10.tsx        Completion + macro reveal
│   ├── nutritionScreens/
│   │   ├── addNutritionModal.tsx   Entry point: manual, camera, barcode, saved, foodDB
│   │   ├── analyzingModal.tsx      AI photo analysis waiting screen
│   │   ├── barcodeScreen.tsx       Camera barcode scanner
│   │   ├── cameraScreen.tsx        Photo capture for AI analysis
│   │   ├── dateModal.tsx           Change selected date
│   │   ├── editManualEntry.tsx     Edit manually-entered meal
│   │   ├── editPhotoEntry.tsx      Edit AI-analyzed meal
│   │   ├── foodDBModal.tsx         FatSecret database search + selection
│   │   ├── nutritionScreen.tsx     Daily log list + summary
│   │   ├── openAiTestScreen.tsx    Dev-only AI testing screen
│   │   ├── savedNutritionModal.tsx Browse/add saved meal templates
│   │   └── updateBWModal.tsx       Update body weight from nutrition tab
│   ├── workoutScreens/
│   │   ├── addExerciseModal.tsx    Add exercises to a workout
│   │   ├── addWorkoutModal.tsx     Create new workout
│   │   ├── archiveModal.tsx        View/restore archived workouts/exercises
│   │   ├── exerciseScreen.tsx      Log sets for an exercise
│   │   ├── logsModal.tsx           Full log history for exercise
│   │   ├── notesModal.tsx          Edit workout notes
│   │   ├── renameModal.tsx         Rename workout
│   │   └── workoutScreen.tsx       Workout detail: exercise list
│   └── settingsScreens/
│       ├── adjustMeasurements.tsx  Edit height/weight/unit system
│       ├── adjustNutrition/
│       │   ├── adjustNutrition1.tsx  Activity level
│       │   ├── adjustNutrition2.tsx  Goal type
│       │   └── adjustNutrition3.tsx  Goal weight + pace
│       ├── devStatsModal.tsx       Developer diagnostics (PowerSync stats)
│       ├── howItWorks.tsx          App explainer
│       ├── profile.tsx             Name, Apple account info
│       ├── subscription.tsx        RevenueCat paywall
│       ├── support.tsx             Contact / feedback
│       └── termsAndPrivacy.tsx     Legal text

├── components/
│   ├── ExpoComponents/             Thin Expo wrappers (ExternalLink, StyledText, Themed, useColorScheme)
│   ├── GraphComponents/
│   │   ├── Graph1.tsx              VictoryLine chart (workout data: 1RM, volume)
│   │   ├── Graph2.tsx              VictoryLine chart (nutrition: macros, BW)
│   │   ├── ProgressWheel.tsx       Circular SVG gauge (fatigue %, macro %)
│   │   ├── ActivityBanner.tsx      Activity level + nutrition streak banner
│   │   ├── GraphStats.tsx          Text stat rows below graphs
│   │   ├── RangeSelectionModal.tsx 7/14/21-day range picker
│   │   └── SelectionModal.tsx      Exercise or macro type picker
│   ├── GuardComponents/
│   │   ├── AppLoadingScreen.tsx    Spinner shown while contexts hydrate
│   │   ├── PowerSyncGuard.tsx      Blocks rendering until PowerSync is ready
│   │   └── SyncWatchdog.tsx        Background monitor — reconnects stale PowerSync
│   ├── NeutralComponents/
│   │   ├── CustomHeader.tsx        Branded screen header
│   │   ├── DatePicker.tsx          Inline date selector
│   │   ├── Fab.tsx                 Floating action button (expandable multi-button)
│   │   ├── ModeSwitcher.tsx        Workout ↔ Nutrition mode toggle
│   │   ├── ScrollableList.tsx      Searchable list (exercises, macros)
│   │   ├── StagedSection.tsx       Collapsible section wrapper
│   │   └── TermsAndPrivacyContent/Modal.tsx  Legal text components
│   ├── NutritionComponents/
│   │   ├── bwCard.tsx              Body weight display + quick edit
│   │   ├── EditMacroGoalModal.tsx  Manual macro target override
│   │   ├── Entry.tsx               Single nutrition log row
│   │   └── SavedEntry.tsx          Saved meal template row
│   ├── WorkoutComponents/
│   │   ├── DraggableList.tsx       Reorderable workout/exercise list
│   │   ├── Log.tsx                 Single set log row (weight × reps × RPE)
│   │   ├── LogDateModal.tsx        Date selector for log entry
│   │   └── LogHistoryList.tsx      Paginated log history for one exercise
│   └── WorkoutLogs/                Workout-specific log rendering

├── context/
│   ├── AuthContext/
│   │   ├── index.tsx               AuthProvider, useAuth()
│   │   ├── types.ts                AuthContextType
│   │   └── functions/
│   │       ├── authFunctions.tsx   signInWithApple()
│   │       └── accountFunctions.tsx signOut(), deleteAccount(), forceSignOut()
│   ├── BillingContext/
│   │   ├── index.tsx               BillingProvider, useBilling()
│   │   ├── types.ts                BillingContextType
│   │   └── functions/billingFunctions.tsx
│   ├── NutritionContext/
│   │   ├── index.tsx               NutritionProvider, useNutrition()
│   │   ├── types.ts                NutritionEntry, Ingredient, NutritionContextType
│   │   ├── database/powersyncStore.ts  Queries against PowerSync for nutrition tables
│   │   └── functions/
│   │       ├── aiFunctions.tsx     analyzeAndAddPhoto(), analyzeText()
│   │       ├── crudFunctions.tsx   add/delete/edit/save nutrition entries
│   │       ├── graphFunctions.tsx  getMacrosForDate(), getMacroDataForGraph(), getNutritionStreakState()
│   │       └── validator.tsx       Input validation
│   ├── SettingsContext/
│   │   ├── index.tsx               SettingsProvider, useSettings()
│   │   ├── types.ts                Settings, SettingsContextType
│   │   ├── database/powersyncStore.ts
│   │   └── functions/
│   │       ├── macroCalculation.tsx  calculateMacros() — Mifflin-St Jeor
│   │       ├── bodyWeightFunctions.tsx  computeBwUpdate(), getBodyWeightProgressData()
│   │       └── validator.tsx
│   ├── ThemeContext/
│   │   ├── index.tsx               ThemeProvider, useColorScheme(), useColors(), useSetColorScheme()
│   │   ├── colors.ts               Dark + light palette definitions
│   │   └── types.ts                Colors type
│   └── WorkoutContext/
│       ├── index.tsx               WorkoutProvider, useWorkout()
│       ├── types.ts                Workout, Exercise, Log, ExerciseLib, WorkoutContextType
│       ├── database/powersyncStore.ts
│       ├── exerciseLibrary/
│       │   ├── constants.ts        fatigueFactor weights per equipment/muscle group
│       │   ├── data/ (legacy — do not modify)
│       │   └── dataV2/
│       │       ├── exerciseImgs/   200+ PNG exercise images
│       │       └── exerciseLists/  JSON exercise library (base data)
│       └── functions/
│           ├── createExerciseFunctions.tsx  Build new exercise entries
│           ├── exerciseFunctions.tsx        Exercise CRUD helpers
│           ├── fatigueFunctions.tsx         calculateFatiguePercentage(), calculateFatigueSummary()
│           ├── graphFunctions.tsx           getOneRepMaxData(), groupAllExerciseLogsByDate()
│           ├── logFunctions.tsx             Log CRUD helpers
│           ├── oneRepMaxFunctions.tsx       estimate1RM() — Epley formula
│           ├── volumeFunctions.tsx          getVolumeData(), getSetsData()
│           ├── workoutFunctions.tsx         Workout CRUD helpers
│           └── validator.tsx               Log input validation

├── lib/
│   ├── foodDB/
│   │   ├── foodDB.ts       getFoodSearchResults(), getFoodDetails(), getFoodItem()
│   │   └── types.ts        FoodSearchResult, FoodDetails, FoodItem, CacheEntry
│   ├── openAI/
│   │   └── openAI.ts       askOpenAIVision(), askOpenAIText() — routes through Edge Function
│   ├── powersync/
│   │   ├── AppSchema.ts    Table schema (10 tables)
│   │   ├── Connector.ts    PowerSyncBackendConnector — upload queue → Supabase
│   │   ├── FlushUploads.ts flushUploadsOrThrow() — Gate C
│   │   ├── orchestrator.ts ensurePowerSyncConnected(), disconnectPowerSync(), kickPowerSync()
│   │   ├── system.ts       Singleton PowerSyncDatabase instance
│   │   └── uploadQueueStats.ts  getPendingUploadEstimate()
│   ├── supabase/
│   │   └── client.ts       createClient() with AsyncStorage session persistence
│   ├── theme/              Theme utility functions
│   └── utils/
│       ├── dateHelper.ts           getDateKey(), formatDate(), calculateStartDate()
│       ├── unitConversions.ts      lbsToKg, kgToLbs, inchesToCm, cmToInches, etc.
│       ├── downsample.ts           downsampleData(), downsampleDataPreserveEndpoints()
│       └── graphChartNote.ts

├── constants/Colors.ts     Light/dark base palette (used by ThemeContext/colors.ts)
├── scripts/
│   └── generateImageMap.js  One-off script: generates exercise image map from dataV2/exerciseImgs/
└── assets/
    ├── fonts/SpaceMono-Regular.ttf
    ├── images/              App icons, splash, marketing screenshots, SVGs
    └── legal/               Terms and privacy text
```

---

## Tech Stack & Dependencies

### Production Dependencies

| Dependency                                | Version  | Role                                       |
| ----------------------------------------- | -------- | ------------------------------------------ |
| expo                                      | ~54.0.32 | SDK & build toolchain                      |
| react                                     | 19.1.0   | UI framework                               |
| react-native                              | 0.81.5   | Native runtime                             |
| expo-router                               | ~6.0.22  | File-based navigation                      |
| **Database**                              |          |                                            |
| @powersync/react-native                   | ^1.30.1  | Offline-first sync + local SQLite          |
| @journeyapps/react-native-quick-sqlite    | ^2.5.1   | SQLite native module (PowerSync dep)       |
| @supabase/supabase-js                     | ^2.95.3  | Postgres + Auth + Edge Functions client    |
| @react-native-async-storage/async-storage | ^2.2.0   | Lightweight KV store (session, prefs)      |
| **Navigation & Gesture**                  |          |                                            |
| @react-navigation/native                  | ^7.1.8   | Navigation primitives                      |
| react-native-gesture-handler              | ~2.28.0  | Touch gestures                             |
| react-native-reanimated                   | ~4.1.1   | JS-driven animations                       |
| react-native-safe-area-context            | ~5.6.0   | Notch/home-bar insets                      |
| react-native-screens                      | ~4.16.0  | Native navigation screens                  |
| **UI**                                    |          |                                            |
| expo-linear-gradient                      | ~15.0.8  | Gradient backgrounds                       |
| lucide-react-native                       | ^0.563.0 | Primary icon set                           |
| @expo/vector-icons                        | ^15.0.3  | Ionicons / MaterialCommunityIcons fallback |
| react-native-inner-shadow                 | ^2.4.0   | Inset shadow effects                       |
| **Charts & Graphics**                     |          |                                            |
| react-native-svg                          | 15.12.1  | SVG rendering                              |
| react-native-svg-transformer              | ^1.5.3   | Import SVG as components                   |
| victory-native                            | ^41.20.2 | Line charts                                |
| **Input Controls**                        |          |                                            |
| @react-native-community/datetimepicker    | 8.4.4    | Date/time pickers                          |
| @react-native-community/slider            | 5.0.1    | RPE sliders                                |
| @react-native-picker/picker               | 2.11.1   | Picker dropdowns                           |
| react-native-draggable-flatlist           | ^4.0.3   | Drag-to-reorder lists                      |
| react-native-reorderable-list             | ^0.18.0  | Alternative reorderable list               |
| **Auth & Purchases**                      |          |                                            |
| expo-apple-authentication                 | ~8.0.8   | Native Apple Sign-In                       |
| react-native-purchases                    | ^9.10.5  | RevenueCat SDK                             |
| **Camera & Media**                        |          |                                            |
| expo-camera                               | ~17.0.10 | Barcode scanning                           |
| expo-image-picker                         | ~17.0.10 | Photo library access                       |
| expo-image-manipulator                    | ~14.0.8  | Resize/compress photos before upload       |
| expo-image                                | ~3.0.11  | Optimized Image component                  |
| **Utilities**                             |          |                                            |
| fuse.js                                   | ^7.3.0   | Fuzzy search (exercise search)             |
| react-native-uuid                         | ^2.0.3   | UUID v4 generation                         |
| jsonwebtoken                              | ^9.0.3   | JWT decode (auth token inspection)         |
| base-64                                   | ^1.0.0   | Base64 encoding (image upload)             |
| react-native-url-polyfill                 | ^3.0.0   | URL constructor polyfill                   |
| react-native-worklets                     | 0.5.1    | Reanimated worklet support                 |
| @expo-google-fonts/poppins                | ^0.4.1   | Poppins typeface                           |
| @sentry/react-native                      | ^8.3.0   | Crash reporting                            |

### Dev Dependencies

- `typescript ~5.9.2` — strict mode
- `jest ~29.7.0` + `jest-expo ~54.0.16` — test runner
- `react-test-renderer 19.1.0` — component test renderer
- `@types/jest 29.5.14`, `@types/react ~19.1.0`, `@types/base-64 ^1.0.2`

---

## Entry Points & Routing

### Boot Sequence

1. `expo-router/entry` (from `package.json#main`) loads `app/_layout.tsx`
2. `_layout.tsx` preloads fonts (all Poppins weights, SpaceMono, FontAwesome) and assets
3. **Provider stack** wraps the entire app (outermost → innermost):
    ```
    GestureHandlerRootView
      SafeAreaProvider
        ThemeProvider
          NavigationThemeProvider
            AuthProvider
              PowerSyncGuard
                SyncWatchdog
                  SettingsProvider
                    BillingProvider
                      WorkoutProvider
                        NutritionProvider
                          StackLayout (Expo Router Stack)
    ```

### Route Guard Logic (in `_layout.tsx` / `RootLayoutNav`)

```
if (!session)           → authScreens/login
if (!onboardingComplete) → onboardingScreens/introduction
if (all contexts loaded) → (tabs)   [else AppLoadingScreen]
```

### Tab Navigation

| Tab      | File                  | Content                                                    |
| -------- | --------------------- | ---------------------------------------------------------- |
| Log      | `(tabs)/index.tsx`    | WorkoutScreen or NutritionScreen (toggled by ModeSwitcher) |
| Progress | `(tabs)/progress.tsx` | Victory charts, ProgressWheel, GraphStats, range selector  |
| Settings | `(tabs)/settings.tsx` | Settings links list                                        |

### Stack Routes (modal / detail screens)

Accessed via `router.push()` from components; defined in the Stack in `_layout.tsx`.

---

## Context / State Management

All global state lives in React Context. Each context follows the pattern:

- `index.tsx` — Provider component + custom hook export
- `types.ts` — TypeScript types for state and context
- `database/powersyncStore.ts` — PowerSync SQL query helpers
- `functions/*.tsx` — Pure business logic, separated from context file

### AuthContext

**State:** `user`, `session`, `loading`, `userID`

**Functions:**

- `signInWithApple()` — Apple native sign-in → Supabase identity token exchange
- `signOut()` — Gate C flush → `disconnectAndClearPowerSync()` → clear AsyncStorage
- `deleteAccount()` — Supabase Edge Function → then sign out

**Side effects:**

- On mount: restores existing Supabase session
- On session change: connects/disconnects PowerSync
- PowerSync only reconnects when `userID` changes (not on every session token refresh)

---

### BillingContext

**State:** `offerings`, `customerInfo`, `hasPremium`, `loading`, `loaded`, `error`

**Derived state:**

- `hasPremium` — checks for `"LiftTrition Pro"` entitlement in `customerInfo`
- `monthlyPackage`, `annualPackage` — from RevenueCat offerings
- `priceInfo`, `annualPriceInfo` — formatted price strings

**Functions:** `purchasePackage(pkg)`, `restorePurchases()`

**Init:** RevenueCat configured on mount. 15-second timeout — app continues even if billing fails (hasPremium defaults false). Customer info listener stays active for subscription state changes.

---

### SettingsContext

**State (Settings object):**

```typescript
{
  onboardingComplete: boolean
  onboardingCompletedAt?: Date       // used as graph start date baseline
  birthDate: Date
  gender: 'male' | 'female'
  height: number                     // in user's unit system
  bodyWeight: number                 // in user's unit system
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat'
  unitSystem: 'imperial' | 'metric'
  goalType: 'lose' | 'gain' | 'maintain'
  goalWeight: number
  goalPace: number                   // lbs/kg per week
  calorieGoal: number                // auto-calculated
  proteinGoal: number
  carbsGoal: number
  fatsGoal: number
}
```

**Additional state:** `bwProgress: Record<string, number>`, `mode: boolean`

**Key behaviors:**

- `handleUpdateBw()` — updates bodyWeight, re-runs `calculateMacros()`, persists settings + new weight entry atomically
- `setSettings()` — marks `persistDirty = true`; a `useEffect` watches the flag and persists to PowerSync
- `mode` boolean is a UI display toggle (not color scheme) — used by the Log tab to remember the last view

---

### NutritionContext

**State:** `nutritionData: NutritionEntry[]`, `savedNutritionEntries: NutritionEntry[]`, `selectedDate: Date`, `loaded: boolean`

**Derived:** `nutritionStreak: { loggedToday, streakIncludingToday, streakThroughYesterday }`

**Key behaviors:**

- Entries loaded from PowerSync on mount with a JOIN across `nutrition_entries` + `nutrition_entry_ingredients`
- `handleAnalyzeAndAddPhoto()` — calls `askOpenAIVision()`, parses JSON response, creates a fully hydrated `NutritionEntry` with ingredients array
- Saved meals stored separately in `saved_nutrition_entries` + `saved_nutrition_entry_ingredients`, sorted by `createdAt` (most recently saved first)

---

### WorkoutContext

**State:**

- `workouts: Workout[]` — ordered array, archived items included
- `exercises: Exercise[]` — all exercises across all workouts
- `logs: Log[]` — all set logs, loaded on mount
- `userExercises: ExerciseLib` — user-created custom exercises
- `fullExerciseLib: ExerciseLib` — base library merged with `userExercises`
- `lastExercise: string` — last opened exercise (AsyncStorage, per user, per device)
- `workoutDaysThisWeek: number` — computed from logs

**Key behaviors:**

- Ordering: Insert workout at `order = 0`, bump all existing by +1
- Archiving: When archiving, remove from active order; unarchiving appends to bottom
- Duplicate workout: Deep clone workout + non-archived exercises (no logs)
- `handleCreateUserExercise()` — calculates `fatigueFactor` from equipment + muscle constants before persisting
- `setUserExercises()` — bulk-sets (used during onboarding for pre-populating exercises)

---

### ThemeContext

**State:** `colorScheme: 'light' | 'dark'`, `colors: Colors`

**Hooks exported:** `useColorScheme()`, `useColors()`, `useSetColorScheme()`

**Palettes (key colors):**
| Token | Light | Dark |
|---|---|---|
| background | `#F2F2F7` | `#121212` |
| surface | `#FFFFFF` | `#1e1e1e` |
| workout (brand blue) | `#2f80ed` | `#2f80ed` |
| nutrition (brand green) | `#22C922` | `#22C922` |
| destructive | `#FF453A` | `#FF453A` |

Persisted to AsyncStorage under a stable key.

---

## Components

### GraphComponents

- **Graph1 / Graph2** — VictoryLine charts. Consume context data via props. Apply `downsampleDataPreserveEndpoints()` before rendering. Graph1 = workout, Graph2 = nutrition.
- **ProgressWheel** — Pure SVG ring drawn with `react-native-svg`. Props: `percentage`, `color`, `label`.
- **ActivityBanner** — Shows activity level icon, nutrition streak count, week's workout days. Reads from `SettingsContext` and `NutritionContext`.
- **RangeSelectionModal** — Bottom sheet picker for 7/14/21-day window.
- **SelectionModal** — Searchable list (exercises or macro types) using `fuse.js`.

### GuardComponents

- **PowerSyncGuard** — Subscribes to PowerSync status; renders children only when status is `SyncStatus.Connected` or `SyncStatus.Syncing`. Prevents rendering with stale/empty DB.
- **SyncWatchdog** — Runs in background after mount; polls PowerSync connection health; calls `kickPowerSync()` if stale. Transparent to UI.
- **AppLoadingScreen** — Simple centered spinner shown while `!loaded` in contexts.

### NeutralComponents

- **Fab** — Floating action button with expandable child buttons. Animates with reanimated.
- **ModeSwitcher** — Segmented control (Workout | Nutrition). Updates `settings.mode` on toggle.
- **ScrollableList** — Searchable FlatList using `fuse.js` fuzzy matching.

---

## Library Layer

### PowerSync (`lib/powersync/`)

**Architecture:** PowerSync acts as a local SQLite cache that syncs bidirectionally with Supabase Postgres. Writes go to local SQLite first (instant), then are queued for upload. Reads always hit local SQLite.

**Connector (`Connector.ts`):**

- `fetchCredentials()` — returns Supabase endpoint + user access token
- `uploadData(database)` — dequeues CRUD operations and applies them to Supabase:
    - For most tables: direct INSERT/UPDATE/DELETE
    - For `settings`: checks for existing row → INSERT or UPDATE
    - For `weight_progress`: checks unique constraint on `(user_id, date)` → upsert
    - For `user_exercises`: converts JSON arrays → PostgreSQL array literal syntax

**Orchestrator (`orchestrator.ts`):**

- Mutex-protected connection lifecycle — concurrent calls are serialized
- Tracks `lastError`, `lastAttemptReason`, `lastAttemptAt` for diagnostics
- `kickPowerSync()` skips reconnect if app is backgrounded (iOS background execution limit)

**FlushUploads (`FlushUploads.ts`):**

- `flushUploadsOrThrow(timeoutMs = 15000)` — polls upload queue until empty, with consecutive-zero check (to avoid flapping on a momentarily empty queue)
- Custom error classes: `UploadFlushTimeoutError`, `UploadFlushNotConnectedError`

### Supabase (`lib/supabase/client.ts`)

- Initialized with `AsyncStorage` as session store
- `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false` (no web OAuth redirect)
- Used for: Auth, Edge Function invocations (OpenAI, FoodDB, deleteAccount)

### OpenAI (`lib/openAI/openAI.ts`)

- **Never calls OpenAI directly** — routes through Supabase Edge Function `fetchOpenAI`
- `askOpenAIVision(base64Image)` — sends JPEG base64 → expects JSON `{ name, ingredients: [{ name, quantity, protein, carbs, fats, calories }] }`
- `askOpenAIText(foodName)` — sends text query → expects macro string response
- 30-second timeout on both calls

### FoodDB (`lib/foodDB/foodDB.ts`)

- Routes through Supabase Edge Function `fetchFoodDB` (FatSecret API)
- In-memory cache with 7-day TTL (survives hot reload, not app restart)
- `getFoodSearchResults(query)` → array of `FoodSearchResult`
- `getFoodDetails(item)` → single `FoodDetails` with macros
- `getFoodItem(searchItem)` → convenience wrapper for the barcode flow

### Utils (`lib/utils/`)

- **`dateHelper.ts`** — All date manipulation. `getDateKey()` is the canonical way to get YYYY-MM-DD from a `Date`. Uses `en-CA` locale — critical for correct ISO format across all device locales.
- **`unitConversions.ts`** — All imperial ↔ metric conversions. Always pass raw values through these helpers at context boundaries.
- **`downsample.ts`** — Graph data compression. `downsampleDataPreserveEndpoints()` keeps exact first and last data points (anchors the graph) while compressing the middle into averaged buckets.

---

## Database Schema

All 10 tables managed by PowerSync (local SQLite) + Supabase Postgres mirror.

| Table                               | Key Fields                                                                                                                                                                                                        | Unique Constraint          | Notes                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| `settings`                          | user_id, birth_date, gender, height, body_weight, unit_system, activity_level, goal_type, goal_weight, goal_pace, calorie_goal, protein_goal, carbs_goal, fats_goal, onboarding_complete, onboarding_completed_at | user_id (one row per user) | Connector upserts                                    |
| `user_exercises`                    | user_id, name, main_muscle, accessory_muscles[], fatigue_factor, equipment, is_compound                                                                                                                           | —                          | Arrays stored as PostgreSQL array literals           |
| `weight_progress`                   | user_id, date, weight                                                                                                                                                                                             | (user_id, date)            | Connector upserts on conflict                        |
| `nutrition_entries`                 | user_id, name, date, time, protein, carbs, fats, calories, is_photo, photo_uri                                                                                                                                    | —                          | Indexed by user_id + date                            |
| `nutrition_entry_ingredients`       | nutrition_entry_id, name, quantity, protein, carbs, fats, calories                                                                                                                                                | —                          | FK to nutrition_entries                              |
| `saved_nutrition_entries`           | user_id, name, protein, carbs, fats, calories, is_photo, photo_uri                                                                                                                                                | —                          | Templates; indexed by user_id                        |
| `saved_nutrition_entry_ingredients` | saved_nutrition_entry_id, name, quantity, protein, carbs, fats, calories                                                                                                                                          | —                          | FK to saved_nutrition_entries                        |
| `workouts`                          | user_id, name, order, archived, note                                                                                                                                                                              | —                          | Indexed by user_id                                   |
| `exercises`                         | user_id, workout_id, name, user_max, order, archived                                                                                                                                                              | —                          | Indexed by workout_id + user_id                      |
| `logs`                              | user_id, workout_id, exercise_id, date, time, weight, reps, rpe                                                                                                                                                   | —                          | Indexed by exercise_id + workout_id + user_id + date |

All tables include PowerSync-generated `id` (UUID) and `created_at`/`updated_at` timestamps.

---

## Authentication Flow

```
1. LOGIN
   app → login.tsx
   login.tsx → signInWithApple()
     → expo-apple-authentication (native iOS dialog)
     → receives { identityToken, nonce }
     → supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })
     → AuthContext receives session via onAuthStateChange listener

2. SESSION ESTABLISHMENT
   AuthContext.onAuthStateChange(SIGNED_IN):
     → set user, session, userID
     → ensurePowerSyncConnected('user signed in')

3. DATA HYDRATION
   PowerSyncGuard renders children once PowerSync ready
   SettingsProvider.useEffect[userID] → load settings from PowerSync
   WorkoutProvider.useEffect[userID] → load workouts/exercises/logs
   NutritionProvider.useEffect[userID] → load nutrition entries
   BillingProvider → RevenueCat.logIn(userID)

4. NAVIGATION
   _layout.tsx detects session + onboardingComplete + contexts.loaded
     → navigate to (tabs)

5. SIGN-OUT
   signOut():
     → flushUploadsOrThrow(15000)     // Gate C: wait for upload queue
     → supabase.auth.signOut()
     → disconnectAndClearPowerSync()  // wipes local SQLite
     → AsyncStorage.clear()
   AuthContext.onAuthStateChange(SIGNED_OUT):
     → clear user/session/userID
   _layout.tsx re-evaluates → navigates to login
```

---

## Key Algorithms

### Macro Calculation (Mifflin-St Jeor TDEE)

File: `context/SettingsContext/functions/macroCalculation.tsx`

```
1. Convert to metric if imperial

2. BMR:
   Male:   10*weight_kg + 6.25*height_cm - 5*age + 5
   Female: 10*weight_kg + 6.25*height_cm - 5*age - 161

3. TDEE = BMR × activity_factor:
   sedentary=1.2, light=1.375, moderate=1.55, active=1.725, gymrat=1.9

4. Calorie adjustment:
   lose:     TDEE -= (goalPace × 3500) / 7  [per day deficit]
   gain:     TDEE += (goalPace × 3500) / 7
   maintain: TDEE unchanged

5. Macro split by goal:
   lose:     P=35%, F=25%, C=40%
   maintain: P=30%, F=25%, C=45%
   gain:     P=25%, F=25%, C=50%

6. Convert to grams:
   protein_g = (calories × P%) / 4
   fat_g     = (calories × F%) / 9
   carbs_g   = (calories × C%) / 4

7. Floor minimums:
   calories: max(1500 male / 1200 female, calculated)
   macros:   max(1g, calculated)
```

---

### 1RM Estimation (Epley Formula)

File: `context/WorkoutContext/functions/oneRepMaxFunctions.tsx`

```
e1RM = weight × (1 + 0.0333 × reps)   [if reps > 1]
e1RM = weight                          [if reps = 1]
```

Used for: progress graph y-axis, fatigue `refMax` baseline.

---

### Fatigue Calculation

File: `context/WorkoutContext/functions/fatigueFunctions.tsx`
Reference data: `fatigueBaseline_v1.txt`, `fatigueBaseline_v2.txt` (in root)

**Per-Set Fatigue Score:**

```
refMax = max(e1RM for this exercise in last 30 days)
currentMax = max(refMax, estimate1RM(weight, reps))

if currentMax = 0:
  fatigue = 0
else:
  base = (weight / currentMax) × (1 + reps / 30)
  rpeScale = (rpe ?? 7) / 10
  fatigue = base × rpeScale × fatigueFactor

fatigueFactor = base (compound=0.75, isolation=0.47)
              + muscle modifier (Back=0.18, Legs=0.15, Chest=0.12, Shoulders=0.08, Arms=0.05, Core=0.03)
              + equipment modifier (Barbell=0.1, Machine=-0.1, Cable=0, Dumbbell=0.05, Bodyweight=-0.05)
              clamped to [0.5, 1.1]
```

**Daily Budget (max healthy fatigue per day):**

```
sedentary=8, light=9, moderate=10, active=11, gymrat=12
```

**Summary (today / last 3 / last 6 / last 9 days):**

```
fatiguePercentage = Σfatigue(period) / (budget × days) × 100
```

Bodyweight exercises use `bodyWeight + added_weight` for load, looking up bodyweight from `bwProgress` keyed by date (handles changing bodyweight over time).

---

### Nutrition Streak

File: `context/NutritionContext/functions/graphFunctions.tsx`

```
today = getDateKey(new Date())
yesterday = getDateKey(yesterday)

loggedToday = any entry with date = today

streakIncludingToday:
  if loggedToday: count consecutive logged days ending today
  else: 0

streakThroughYesterday:
  if entry on yesterday: count consecutive logged days ending yesterday
  else: 0
```

---

### Graph Data Downsampling

File: `lib/utils/downsample.ts`

```
downsampleDataPreserveEndpoints(data, targetCount):
  if data.length <= targetCount: return data

  keep first point raw
  keep last point raw
  compress middle (data[1..n-2]) into (targetCount - 2) averaged buckets

  bucket size = floor(middle.length / (targetCount - 2))
  aggregate: average of values in bucket
  day label: from middle point of bucket
```

Used for all victory-native charts to avoid over-plotting on small screens.

---

## Data Models

### Entity Relationships

```
User (Supabase Auth)
  ├── Settings (1:1)
  ├── WeightProgress (1:many, one per date)
  ├── Workout (1:many)
  │     └── Exercise (1:many per workout)
  │           └── Log (1:many per exercise)  -- set logs
  ├── UserExercise (1:many, custom exercises)
  ├── NutritionEntry (1:many)
  │     └── NutritionEntryIngredient (1:many per entry)
  └── SavedNutritionEntry (1:many, templates)
        └── SavedNutritionEntryIngredient (1:many per saved entry)
```

### TypeScript Types (key ones)

```typescript
// WorkoutContext
type Workout = { id; userID; name; order; archived; note; createdAt; updatedAt }
type Exercise = { id; userID; workoutID; name; userMax; order; archived; createdAt; updatedAt }
type Log = { id; userID; workoutID; exerciseID; date; time; weight; reps; rpe; createdAt; updatedAt }

type ExerciseLibItem = {
    mainMuscle: string
    equipment: string
    isCompound: boolean
    fatigueFactor: number
    imgUrl?: string
    accessoryMuscles?: string[]
}
type ExerciseLib = Record<string, ExerciseLibItem> // keyed by exercise name

// NutritionContext
type Ingredient = { name; quantity; protein; carbs; fats; calories }
type NutritionEntry = {
    id
    userId
    name
    date
    time
    protein
    carbs
    fats
    calories
    isPhoto
    photoUri?
    ingredients: Ingredient[]
    createdAt
    updatedAt
}

// SettingsContext
type Settings = {
    /* all user profile + goal + macro fields */
}
```

---

## Testing

**Framework:** Jest 29 + jest-expo preset

**Run:** `npm test`

**Test file locations:** co-located in `__tests__/` subdirectories adjacent to the functions they test.

### Test Coverage by Area

| Area                | Files                                                           | What's Tested                                                |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Fatigue             | `fatigueFunctions.test.ts`, `fatigueFunctions.baseline.test.ts` | Per-set scores, daily summaries, edge cases (no logs, rpe=0) |
| 1RM                 | `oneRepMaxFunctions.test.ts`                                    | Epley formula, reps=1 edge case                              |
| Graphs (workout)    | `graphFunctions.test.ts`                                        | 1RM data extraction, grouping by date                        |
| Volume              | `volumeFunctions.test.ts`                                       | Volume and sets-per-day calculations                         |
| Logs                | `logFunctions.test.ts`                                          | CRUD helpers                                                 |
| Workouts            | `workoutFunctions.test.ts`                                      | Workout ordering, archive logic                              |
| Exercises           | `exerciseFunctions.test.ts`                                     | Exercise CRUD and reordering                                 |
| Validation          | `validator.test.ts`                                             | Log input rules (weight/reps/rpe ranges)                     |
| Nutrition CRUD      | `crudFunctions.test.ts`                                         | Add/delete/edit/save entries                                 |
| Nutrition graphs    | `graphFunctions.test.ts` (nutrition)                            | Macro summaries, streak calculation                          |
| Body weight         | `bodyWeightFunctions.test.ts`                                   | BW progress computation                                      |
| Food DB             | `foodDB.test.ts`                                                | API wrapper with mock Edge Function                          |
| OpenAI              | `openAI.test.ts`                                                | Vision + text calls with mocked responses                    |
| PowerSync Connector | `connector.test.ts`                                             | Upload queue → Supabase mapping                              |
| Downsampling        | `downsample.test.ts`                                            | Bucket compression, endpoint preservation                    |
| Graph notes         | `graphChartNote.test.ts`                                        | Chart annotation utility                                     |
| Progression         | `progressionFunctions.test.ts`                                  | (new, WIP)                                                   |
| Integration         | `flowOfLayers.test.ts`                                          | Cross-function data flow                                     |

**Mocking patterns:**

- PowerSync and Supabase are mocked at the module level
- No live DB connections in tests
- Edge Function calls mocked via `jest.fn()`

---

## Build & Deployment

**No local native build.** No `ios/` or `android/` directories. All native builds go through EAS.

```bash
# EAS builds
eas build --platform ios --profile development   # internal testing (Expo Go compatible)
eas build --platform ios --profile preview       # TestFlight distribution
eas build --platform ios --profile production    # App Store

eas build --platform android --profile production  # Google Play
```

**`eas.json` profiles:**

- `development` — internal distribution
- `preview` — internal distribution (TestFlight)
- `production` — auto-increment build number, store submission

**`app.json` key config:**

- App name: **PLATES**, slug: **App**, version: **1.0.4**
- iOS: `com.LiftTrition.App`, Sign In with Apple entitlement
- Android: edge-to-edge, adaptive icon
- Sentry DSN configured in app.json (not in env)
- Expo Typed Routes experiment enabled

**Environment files:**

- `.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, RevenueCat API keys (iOS/Android)
- `.env.local` — overrides for local dev
- `.gitignore` excludes all `.env*.local` files

---

## Code Conventions

### File & Directory Naming

- Screen files: `PascalCase` with `Screen` or `Modal` suffix (e.g., `workoutScreen.tsx`, `logsModal.tsx`)
- Components: `PascalCase` (e.g., `ActivityBanner.tsx`)
- Utility functions: `camelCase` (e.g., `dateHelper.ts`)
- Context directories: `PascalCase` with `Context` suffix
- Context entry: always `index.tsx`
- Tests: `[filename].test.ts` in adjacent `__tests__/` folder

### Component Structure

```typescript
// 1. Imports
// 2. Type definitions (local, not exported)
// 3. Component function with destructured props
// 4. Hooks (context, state, refs, memo, callbacks)
// 5. Handler functions
// 6. JSX return
// 7. StyleSheet.create({}) at bottom
```

### Styling

- `StyleSheet.create()` per component file, defined at the bottom
- No styled-components or Tailwind — raw React Native StyleSheet
- Colors via `useColors()` hook — never hardcode hex in components
- Theme-agnostic components pass color as prop or derive from `useColors()`
- Fonts: Poppins as default, SpaceMono for monospaced content

### State & Side Effects

- `useState` for local component state
- `useCallback` for handlers passed as props
- `useMemo` for expensive derived values
- `useEffect` with explicit dependency arrays — no missing deps lint warnings
- `useRef` for stable object references (PowerSync instance, mutex, etc.)

### Error Handling

- Contexts use `console.warn('[ContextName] message')` pattern
- No error boundaries except the Sentry wrapper at root
- Async failures in contexts set error state but don't crash the app
- Billing failures are swallowed silently (app continues with hasPremium=false)

### PowerSync Write Pattern

```typescript
// Simple write
await powerSync.execute('INSERT INTO table (cols) VALUES (?)', [val])

// Transaction
await powerSync.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM exercises WHERE workout_id = ?', [id])
    await tx.execute('DELETE FROM logs WHERE workout_id = ?', [id])
})
```

---

## Dependency Map

> What breaks if you change X?

| Change                                                    | Impact                                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/powersync/AppSchema.ts`                              | Connector must be updated to handle new table. Any context powersyncStore.ts reading the table must add queries. PowerSync local DB schema migration may be needed. |
| `lib/powersync/Connector.ts`                              | All write operations across the entire app. Test with `connector.test.ts`.                                                                                          |
| `lib/powersync/orchestrator.ts`                           | Sign-in, sign-out, and SyncWatchdog all depend on this. Auth flow breaks if orchestrator is broken.                                                                 |
| `lib/supabase/client.ts`                                  | All API calls, auth, Edge Function invocations. Everything.                                                                                                         |
| `context/AuthContext`                                     | All other contexts depend on `userID` from AuthContext. PowerSync lifecycle depends on AuthContext.                                                                 |
| `context/SettingsContext` — `calculateMacros()`           | `handleUpdateBw()` calls this. Onboarding step 10 calls this. Any change in macro algorithm changes all users' goals on next settings mutation.                     |
| `lib/utils/dateHelper.ts` — `getDateKey()`                | All date-keyed data (weight_progress, nutrition by date, log filtering, streak calculation). Changing locale breaks existing data.                                  |
| `context/WorkoutContext/functions/oneRepMaxFunctions.tsx` | Fatigue calculation uses `estimate1RM` for `currentMax`. Graph data uses it for y-axis values. Changes affect all historical graph display.                         |
| `context/WorkoutContext/exerciseLibrary/dataV2/`          | Base exercise library. Adding/renaming exercises here affects fuzzy search, fatigue factor lookup. Don't remove entries that users may have logged against.         |
| `lib/openAI/openAI.ts`                                    | NutritionContext `aiFunctions.tsx` calls this. Camera flow breaks if shape changes.                                                                                 |
| `lib/foodDB/foodDB.ts`                                    | Barcode screen and foodDB modal both depend on this. Cache is in-memory only.                                                                                       |
| `context/NutritionContext/types.ts` — `NutritionEntry`    | `crudFunctions.tsx`, `graphFunctions.tsx`, `powersyncStore.ts`, every nutrition component.                                                                          |

---

## Quirks & Non-Obvious Decisions

1. **`mode` in SettingsContext is NOT the color theme.** It's a UI state boolean that remembers whether the Log tab was last showing workouts or nutrition. It persists to PowerSync alongside settings but has no effect on colors.

2. **PowerSync schema has no explicit foreign keys in the local SQLite.** Referential integrity is enforced only in Supabase Postgres. Locally, orphaned ingredient rows can exist if a parent entry delete fails. Contexts clean up by deleting children first in transactions.

3. **The `order` field for workouts counts down from the most recently created.** `order = 0` is the newest/top workout. On insert, all existing workouts get `order += 1`. This means display order = sort by `order ASC` and the newest item is always at the top.

4. **`lastExercise` in WorkoutContext is stored in AsyncStorage (not PowerSync), keyed by userID.** This is intentional — it's a UX hint per device, not shared data. It survives sign-out/sign-in on the same device.

5. **Supabase Edge Functions are the single gateway for secrets.** OpenAI API key, FatSecret API key — none of these are in the client. If the Edge Function URL or response format changes, `lib/openAI/openAI.ts` and `lib/foodDB/foodDB.ts` are the sole update points.

6. **SyncWatchdog is silent.** It doesn't show any UI. If PowerSync silently stalls, the watchdog calls `kickPowerSync()` in the background. Users never see this happen.

7. **Fatigue algorithm has two baseline files (`fatigueBaseline_v1.txt`, `fatigueBaseline_v2.txt`) in the repo root.** These are research/calibration notes from algorithm development. They document expected fatigue values for test scenarios and were used to tune the `fatigueFactor` constants. Not code — reference documents for the algorithm author.

8. **Exercise library dataV2 has 200+ PNG images.** The `generateImageMap.js` script produces a static mapping file so images can be loaded dynamically without dynamic `require()` paths (which Metro bundler can't handle). If new exercises + images are added, run the script to regenerate.

9. **RevenueCat entitlement key is hardcoded as `"LiftTrition Pro"` string.** If the RevenueCat entitlement name ever changes, `BillingContext` `hasPremium` check silently breaks (returns false, everyone looks unpaid). Single string in `context/BillingContext/index.tsx`.

10. **The `openAiTestScreen.tsx` is a dev-only screen** accessible via a settings route. It's not gated by `hasPremium` or any role — just not surfaced in the main UI. It should not be shipped prominently.

11. **`downsampleDataPreserveEndpoints` preserves the last data point exactly.** This means graph lines always end exactly at the most recent value, even if that value is an outlier. This is intentional for UX (users can see their latest number clearly), but it means the last visible point may not match the downsampled average trend.

12. **Body weight updates recalculate macros automatically.** `handleUpdateBw()` in SettingsContext runs `calculateMacros()` and persists both the new weight and the new macro goals atomically. This means if a user logs weight, their calorie/macro goals change silently — this is by design (adaptive nutrition plan).

13. **The `devStatsModal.tsx` in settings** shows PowerSync upload queue stats and sync status. It's accessible from settings but not labeled prominently. Useful for debugging sync issues in production without Sentry.
