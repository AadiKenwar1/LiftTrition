# Graph Report - .  (2026-06-21)

## Corpus Check
- Large corpus: 1541 files · ~782,775 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 892 nodes · 1741 edges · 48 communities (43 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.74)
- Token cost: 64,811 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Graph & Progression Functions|Graph & Progression Functions]]
- [[_COMMUNITY_Nutrition AI & CRUD|Nutrition AI & CRUD]]
- [[_COMMUNITY_App Architecture Concepts|App Architecture Concepts]]
- [[_COMMUNITY_Root Layout & Providers|Root Layout & Providers]]
- [[_COMMUNITY_Expo Dependencies|Expo Dependencies]]
- [[_COMMUNITY_Theming & UI Boilerplate|Theming & UI Boilerplate]]
- [[_COMMUNITY_Nutrition Persistence Layer|Nutrition Persistence Layer]]
- [[_COMMUNITY_Expo App Config|Expo App Config]]
- [[_COMMUNITY_Graph UI Components|Graph UI Components]]
- [[_COMMUNITY_Onboarding & UI Widgets|Onboarding & UI Widgets]]
- [[_COMMUNITY_Billing & Subscriptions|Billing & Subscriptions]]
- [[_COMMUNITY_Package Manifest & Tests|Package Manifest & Tests]]
- [[_COMMUNITY_Nutrition Modals & Headers|Nutrition Modals & Headers]]
- [[_COMMUNITY_Food Database (FatSecret)|Food Database (FatSecret)]]
- [[_COMMUNITY_Workout Persistence Layer|Workout Persistence Layer]]
- [[_COMMUNITY_Exercise Constants & Selectors|Exercise Constants & Selectors]]
- [[_COMMUNITY_Macro & Settings Calc|Macro & Settings Calc]]
- [[_COMMUNITY_Workout CRUD Functions|Workout CRUD Functions]]
- [[_COMMUNITY_Fatigue Algorithm|Fatigue Algorithm]]
- [[_COMMUNITY_Macro Goal Editing|Macro Goal Editing]]
- [[_COMMUNITY_Sync Watchdog Status|Sync Watchdog Status]]
- [[_COMMUNITY_Auth & Supabase Connector|Auth & Supabase Connector]]
- [[_COMMUNITY_Exercise Library V2|Exercise Library V2]]
- [[_COMMUNITY_Unit Conversions|Unit Conversions]]
- [[_COMMUNITY_PowerSync Orchestrator|PowerSync Orchestrator]]
- [[_COMMUNITY_Fatigue Baseline Tests|Fatigue Baseline Tests]]
- [[_COMMUNITY_Upload Flush & Queue|Upload Flush & Queue]]
- [[_COMMUNITY_One-Rep-Max Estimation|One-Rep-Max Estimation]]
- [[_COMMUNITY_Tab Nav & Mode Switch|Tab Nav & Mode Switch]]
- [[_COMMUNITY_Log CRUD & Validation|Log CRUD & Validation]]
- [[_COMMUNITY_Account & Sign-Out|Account & Sign-Out]]
- [[_COMMUNITY_Onboarding Validation|Onboarding Validation]]
- [[_COMMUNITY_Exercise CRUD Functions|Exercise CRUD Functions]]
- [[_COMMUNITY_Connector Upload Internals|Connector Upload Internals]]
- [[_COMMUNITY_Image Map Generator|Image Map Generator]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Victory Chart Wrappers|Victory Chart Wrappers]]
- [[_COMMUNITY_Camera Capture Flow|Camera Capture Flow]]
- [[_COMMUNITY_How It Works Screen|How It Works Screen]]
- [[_COMMUNITY_FatSecret Edge Function|FatSecret Edge Function]]
- [[_COMMUNITY_Metro Config|Metro Config]]

## God Nodes (most connected - your core abstractions)
1. `useSettings()` - 55 edges
2. `Expo Router` - 50 edges
3. `useAuth()` - 39 edges
4. `getDateKey()` - 34 edges
5. `Log` - 23 edges
6. `useNutrition()` - 21 edges
7. `useWorkout()` - 21 edges
8. `Exercise` - 17 edges
9. `expo` - 16 edges
10. `powerSync` - 14 edges

## Surprising Connections (you probably didn't know these)
- `UpdateBWModal()` --calls--> `useSettings()`  [EXTRACTED]
  app/nutritionScreens/updateBWModal.tsx → context/SettingsContext/index.tsx
- `Onboarding6Screen()` --calls--> `useSettings()`  [EXTRACTED]
  app/onboardingScreens/onboarding6.tsx → context/SettingsContext/index.tsx
- `AdjustNutrition2Screen()` --calls--> `useSettings()`  [EXTRACTED]
  app/settingsScreens/adjustNutrition/adjustNutrition1.tsx → context/SettingsContext/index.tsx
- `AdjustNutrition3Screen()` --calls--> `useSettings()`  [EXTRACTED]
  app/settingsScreens/adjustNutrition/adjustNutrition2.tsx → context/SettingsContext/index.tsx
- `FloatingActionMenu()` --calls--> `useSettings()`  [EXTRACTED]
  components/NeutralComponents/Fab.tsx → context/SettingsContext/index.tsx

## Import Cycles
- None detected.

## Communities (48 total, 5 thin omitted)

### Community 0 - "Graph & Progression Functions"
Cohesion: 0.07
Nodes (39): getBodyWeightProgressData(), countConsecutiveLoggedDays(), getMacroDataForGraph(), getMacrosForDate(), getNutritionStreakState(), getOneRepMaxData(), groupAllExerciseLogsByDate(), applyProgression() (+31 more)

### Community 1 - "Nutrition AI & CRUD"
Cohesion: 0.07
Nodes (41): analyzeAndAddPhoto(), analyzeText(), withTimeout(), addNutrition(), deleteNutrition(), editNutrition(), getFilteredSavedNutritionEntries(), saveNutrition() (+33 more)

### Community 2 - "App Architecture Concepts"
Cohesion: 0.06
Nodes (53): ActivityBanner, AppSchema (10 tables), Apple Sign-In, AsyncStorage, AuthContext, BillingContext, Camera / AI Photo Flow, PowerSync Connector (+45 more)

### Community 3 - "Root Layout & Providers"
Cohesion: 0.07
Nodes (35): modalPresentation, StackLayout(), styles, unstable_settings, AuthProvider(), useAuth(), BillingProvider(), AppLoadingScreen() (+27 more)

### Community 4 - "Expo Dependencies"
Cohesion: 0.04
Nodes (47): dependencies, base-64, expo, expo-apple-authentication, expo-camera, expo-constants, expo-dev-client, expo-font (+39 more)

### Community 5 - "Theming & UI Boilerplate"
Cohesion: 0.09
Nodes (26): NavigationTheme(), styles, styles, EditScreenInfo(), styles, ExternalLink(), MonoText(), Text() (+18 more)

### Community 6 - "Nutrition Persistence Layer"
Cohesion: 0.07
Nodes (33): defaultSettings, loadNutritionData(), loadSettingsAndBw(), nutritionEntryToRow(), rowToSettings(), savedNutritionEntryToRow(), settingsToRow(), upsertNutritionEntry() (+25 more)

### Community 7 - "Expo App Config"
Cohesion: 0.05
Nodes (36): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, predictiveBackGestureEnabled, projectId, typedRoutes, expo (+28 more)

### Community 8 - "Graph UI Components"
Cohesion: 0.08
Nodes (26): getFatigueFeedback(), ActivityBanner(), ActivityBannerProps, getNutritionBannerText(), styles, Graph1Props, styles, computeStats() (+18 more)

### Community 9 - "Onboarding & UI Widgets"
Cohesion: 0.08
Nodes (23): LoginScreen(), AnimatedCircle, ProgressWheel(), ProgressWheelProps, styles, DatePicker(), DatePickerProps, styles (+15 more)

### Community 10 - "Billing & Subscriptions"
Cohesion: 0.09
Nodes (18): BillingContext, useBilling(), BillingContextInterface, getAnnualPackage(), getMonthlyPackage(), getPackagePriceInfo(), purchasePackage(), restorePurchases() (+10 more)

### Community 11 - "Package Manifest & Tests"
Cohesion: 0.08
Nodes (23): devDependencies, jest, jest-expo, react-test-renderer, @types/base-64, @types/jest, @types/react, typescript (+15 more)

### Community 12 - "Nutrition Modals & Headers"
Cohesion: 0.09
Nodes (13): AdjustNutrition3Screen(), styles, Expo Router, CustomHeaderProps, styles, styles, styles, UpdateBWModal() (+5 more)

### Community 13 - "Food Database (FatSecret)"
Cohesion: 0.14
Nodes (16): detailsCache, getFoodDetails(), getFoodItem(), getFoodSearchResults(), isFresh(), searchCache, CacheEntry, FatSecretFood (+8 more)

### Community 14 - "Workout Persistence Layer"
Cohesion: 0.17
Nodes (14): insertDuplicateWorkout(), insertExercisesWithOrderBump(), insertExerciseWithOrderBump(), insertLog(), insertWorkoutWithOrderBump(), loadWorkoutData(), updateExerciseOrders(), updateWorkoutOrders() (+6 more)

### Community 15 - "Exercise Constants & Selectors"
Cohesion: 0.15
Nodes (13): IMAGE_MAP, EQUIPMENT_FATIGUE_FACTORS, EQUIPMENT_TYPES, EXERCISE_TYPES, MUSCLE_FATIGUE_FACTORS, MUSCLE_GROUPS, SelectionModalProps, styles (+5 more)

### Community 16 - "Macro & Settings Calc"
Cohesion: 0.21
Nodes (13): styles, computeBwUpdate(), calculateAge(), calculateMacros(), getActivityFactor(), MACRO_PRESETS, Onboarding8Screen(), defaultSettings (+5 more)

### Community 17 - "Workout CRUD Functions"
Cohesion: 0.18
Nodes (8): addWorkout(), archiveWorkout(), deleteWorkout(), incrementWorkoutOrders(), renameWorkout(), updateWorkoutNote(), updateWorkoutOrder(), Workout

### Community 18 - "Fatigue Algorithm"
Cohesion: 0.25
Nodes (12): addDays(), buildRefByName(), bwOnDate(), calculateFatiguePercentage(), calculateFatigueSummary(), calculateSetFatigue(), DAILY_BUDGETS, effectiveLoad() (+4 more)

### Community 19 - "Macro Goal Editing"
Cohesion: 0.16
Nodes (12): AdjustNutrition4Screen(), macroInitialValue(), styles, closeEasing, MacroGoalKind, META, openEasing, Props (+4 more)

### Community 20 - "Sync Watchdog Status"
Cohesion: 0.19
Nodes (14): getWatchdogStatus(), Listener, listeners, status, subscribeWatchdogStatus(), WatchdogReason, WatchdogStatus, DevStatsScreen() (+6 more)

### Community 21 - "Auth & Supabase Connector"
Cohesion: 0.22
Nodes (7): AuthContext, AuthContextInterface, signInWithApple(), styles, SubjectType, supabase, mockDatabase

### Community 22 - "Exercise Library V2"
Cohesion: 0.16
Nodes (12): allExercises, buildFromV2(), convertExerciseLibraryToList(), exerciseLib, exerciseLibAsList, V2Entry, CreateExerciseData, createUserExercise() (+4 more)

### Community 23 - "Unit Conversions"
Cohesion: 0.24
Nodes (11): validateHeightWeight(), styles, styles, AdjustMeasurementsScreen(), styles, cmToInches(), feetInchesToInches(), inchesToCm() (+3 more)

### Community 24 - "PowerSync Orchestrator"
Cohesion: 0.22
Nodes (12): disconnectPowerSync(), enqueue(), ensurePowerSyncConnected(), getKickThrottleRemainingMs(), getPowerSyncOrchestratorState(), kickPowerSync(), mutexChain, orchestratorState (+4 more)

### Community 25 - "Fatigue Baseline Tests"
Cohesion: 0.14
Nodes (7): DaySpec, EMPTY_BW, LIB, NOW, output, runMiniSession(), SetSpec

### Community 26 - "Upload Flush & Queue"
Cohesion: 0.21
Nodes (8): FlushUploadsOptions, flushUploadsOrThrow(), sleep(), UploadFlushNotConnectedError, formatUploadQueueStatsRaw(), getPendingUploadEstimate(), SettingsOption, styles

### Community 27 - "One-Rep-Max Estimation"
Cohesion: 0.27
Nodes (6): estimate1RM(), oneRMMap(), CreateExerciseData, Exercise, WorkoutContextInterface, styles

### Community 28 - "Tab Nav & Mode Switch"
Cohesion: 0.17
Nodes (9): FabProps, FloatingActionMenu(), styles, CustomHeader(), LIFT_GRADIENT, NUTRITION_GRADIENT, styles, LogScreen() (+1 more)

### Community 29 - "Log CRUD & Validation"
Cohesion: 0.27
Nodes (4): addLog(), deleteLog(), validateLog(), mockAlert

### Community 30 - "Account & Sign-Out"
Cohesion: 0.33
Nodes (7): deleteAccount(), forceSignOut(), isUploadFlushTimeoutError(), signOut(), UploadFlushTimeoutError, disconnectAndClearPowerSync(), styles

### Community 31 - "Onboarding Validation"
Cohesion: 0.22
Nodes (6): AdjustNutrition2Screen(), styles, validateMacro(), validateTargetWeight(), Onboarding6Screen(), styles

### Community 32 - "Exercise CRUD Functions"
Cohesion: 0.36
Nodes (5): addExercise(), archiveExercise(), deleteExercise(), incrementExerciseOrders(), updateExerciseOrder()

### Community 34 - "Image Map Generator"
Cohesion: 0.25
Nodes (7): files, fs, imgDir, lines, outFile, output, path

### Community 35 - "TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, @/*

### Community 36 - "Victory Chart Wrappers"
Cohesion: 0.33
Nodes (4): Graph1Props, styles, victory-native, victory-native

## Knowledge Gaps
- **283 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+278 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Expo Router` connect `Nutrition Modals & Headers` to `Graph & Progression Functions`, `Nutrition AI & CRUD`, `App Architecture Concepts`, `Root Layout & Providers`, `Theming & UI Boilerplate`, `Camera Capture Flow`, `Onboarding & UI Widgets`, `Billing & Subscriptions`, `Food Database (FatSecret)`, `Exercise Constants & Selectors`, `Macro & Settings Calc`, `Macro Goal Editing`, `Unit Conversions`, `Upload Flush & Queue`, `One-Rep-Max Estimation`, `Tab Nav & Mode Switch`, `Account & Sign-Out`, `Onboarding Validation`?**
  _High betweenness centrality (0.295) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Expo Dependencies` to `Package Manifest & Tests`, `Nutrition Modals & Headers`, `Victory Chart Wrappers`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `expo-router` connect `Nutrition Modals & Headers` to `Expo Dependencies`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `getDateKey()` (e.g. with `insertLog()` and `getMacroDataForGraph()`) actually correct?**
  _`getDateKey()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _283 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Graph & Progression Functions` be split into smaller, more focused modules?**
  _Cohesion score 0.06512890094979647 - nodes in this community are weakly interconnected._
- **Should `Nutrition AI & CRUD` be split into smaller, more focused modules?**
  _Cohesion score 0.06836158192090395 - nodes in this community are weakly interconnected._