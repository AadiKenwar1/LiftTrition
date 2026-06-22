# LIFTRI "Refined" Restyle — Implementation Plan

## Context

The team produced a high-fidelity design handoff (`Updated app style mockup/design_handoff_liftri_restyle/`) for a visual refresh of the four primary screens — **Workouts, Nutrition (tracking), Progress, Settings**. The "Refined" direction keeps the existing structure and Lift-blue / Nutrition-green coding but modernizes the surface treatment: charcoal/white surfaces, hairline borders, tight 10–12px card corners, fully-round small controls, restrained glows, a tighter type scale, and consistent data-viz. It specifies **both dark and light** themes from one shared token set.

Two structural realities in today's code drive the bulk of the work:
1. **Colors are hardcoded** (`#121212`, `#1e1e1e`, `#fff`, `#aaa`, `#2f80ed`, …) in every screen/component instead of reading `useColors()`. The light palette exists in `colors.ts` but is ignored, so **light mode does not actually work today**. Centralizing tokens is the prerequisite for the dark/light toggle.
2. **Font is Poppins**, hardcoded per-component (`fontFamily: 'Poppins_600SemiBold'`). Fonts should be centralized so Poppins vs. Archivo can be A/B-tested with a one-line flip.

### Decisions locked
- **Settings:** keep current rows/sections as-is (do NOT adopt the mockup's simplified IA). **Add** a profile card at top (name + email + PRO badge) and **one new "Appearance" row** that toggles dark/light. Nothing else changes structurally.
- **Daily Intake card** (calorie ring + macro bars) moves to the **tracking/nutrition screen**.
- **Fatigue wheels are removed entirely** from Progress (least-accurate metric). The fatigue *algorithm* in `WorkoutContext` stays intact (dormant), just not displayed.
- **Body-weight card moves to the Progress screen** (nutrition mode), next to the body-weight graph. It leaves the nutrition screen.
- **Mode toggle keeps the dumbbell/nut icons** (restyle the container only).
- **Routine card (`Log`) keeps its single button** (mockups were drawn against an older app version).
- **Graph stays victory-native** (v41/XL, Skia-backed — the 2026 top pick); restyle, no rewrite.

### Intended outcome
The four screens match the Refined mockup in dark mode, are driven entirely by theme tokens (so the new Appearance toggle flips dark↔light cleanly on these screens), and fonts can be switched Poppins↔Archivo from one constant.

---

## Foundation (do first)

> **One theme home.** All design tokens live under `context/ThemeContext/` (the folder that already owns `colors.ts` + `useColors()`). Do **not** add a separate `lib/theme/` — CLAUDE.md lists one but it doesn't exist. Two consumption patterns coexist here: **colors** are scheme-dependent and served reactively via `useColors()`; **fonts/radii/spacing** are scheme-independent static constants, imported directly. `index.tsx` re-exports everything so consumers import from one path (`@/context/ThemeContext`).
>
> ```
> context/ThemeContext/
>   index.tsx      provider + hooks; re-exports everything below
>   colors.ts      palettes (extend with new tokens)          ← reactive, via useColors()
>   typography.ts  FONT_FAMILY switch + font map + type scale ← static
>   tokens.ts      radius / spacing                            ← static
>   types.ts       Colors type + token types
> ```

### 1. Centralize typography — `context/ThemeContext/typography.ts` (new)
- Export a single switch `export const FONT_FAMILY: 'poppins' | 'archivo' = 'archivo'`.
- Two maps (`POPPINS`, `ARCHIVO`) keyed by weight → loaded font name (`regular/medium/semibold/bold/extrabold`), and `export const fonts = FONT_FAMILY === 'archivo' ? ARCHIVO : POPPINS`.
- Optionally a semantic scale (`type.screenTitle`, `type.cardTitle`, `type.body`, `type.caption`, …) bundling family + size + tracking.
- Migration: replace literal `fontFamily: 'Poppins_XXX'` with `fonts.semibold` etc. in the restyled files. Flipping `FONT_FAMILY` swaps the whole app.
- Load **Archivo** (`@expo-google-fonts/archivo`, weights 400/500/600/700/800) alongside the existing Poppins in `app/_layout.tsx`. Remove the redundant `useFonts({ 'SpaceMono-Regular' })` in `app/(tabs)/progress.tsx`.

### 2. Centralize color tokens — `context/ThemeContext/types.ts` + `context/ThemeContext/colors.ts`
- Extend the `Colors` type and **both** `light`/`dark` palettes with the new handoff tokens: `surface`, `surfaceInset`, `toggleTrack`, `hairline`, `divider`, `navBorder`, `labelMuted`, `tabInactive`, `ringTrack`, `chevron`, `iconChipBg`, `nutritionInk`, plus gradient tuples `workoutGradient` and `nutritionGradient` (`readonly [string, string]` for `expo-linear-gradient`). Keep existing values.
- Add a radii/spacing constant set (`context/ThemeContext/tokens.ts`): `radius.card=10`, `radius.cardLg=12`, `radius.toggle=9`, `radius.macroCell=9`, `radius.iconButton=full`, `radius.chip=999`; screen padding 18, card padding 14–16, card gap 11.
- `useColors()`, `useColorScheme()`, `useSetColorScheme()` already exist in `context/ThemeContext/index.tsx` — no API change.

### 3. Theme-aware StyleSheet pattern
For restyled files, adopt `const styles = useMemo(() => makeStyles(colors), [colors])` where `makeStyles(colors)` returns the StyleSheet. Keeps layout static, makes color react to the toggle.

> **Scope caveat:** tokens are global, but this restyle migrates only the 4 main screens + their components + shared primitives. Non-migrated surfaces (onboarding, sub-modals, settings sub-screens) still hardcode dark hexes and will look wrong in light mode. Recommend wiring the Appearance row now (works on migrated screens) and treating full light-mode migration of remaining screens as a tracked follow-up.

---

## Shared primitives / chrome

- **`ModeSwitcher.tsx`** — restyle container to the mockup toggle: `toggleTrack` bg, hairline border, `radius.toggle` (9, inner 7), active segment filled with the mode **gradient** (135°, 2-color) + soft shadow, inactive `tabInactive`. **Keep the dumbbell/nut icons.** Colors/gradients from tokens.
- **`app/(tabs)/_layout.tsx`** — theme- and mode-aware tab bar: active tint = current mode accent (blue lift / green nutrition; `text` on Settings), inactive = `tabInactive`, bar bg = `surface`/`background`, top border = `navBorder`. Read `mode` from `useSettings()`. Drop legacy `constants/Colors` + `ExpoComponents/useColorScheme`.
- **`Fab.tsx`** — keep the expanding multi-action behavior; restyle trigger + child buttons to gradient (`workoutGradient`/`nutritionGradient`) with the restrained colored shadow. Token-drive colors.
- **`ProgressWheel.tsx`** — add a `children` prop for custom center content (Daily Intake ring shows `1052 / 2200` not `%`); support solid stroke + `ringTrack` track. Keep `%` default for any remaining callers.

---

## Screen work

### Workouts — `app/workoutScreens/workoutScreen.tsx`, `components/WorkoutComponents/Log.tsx`
- `Log` card: `radius` 16→10, accent bar 4px→3px (faint dark-only glow), hairline border, `surface` bg, tokens + fonts. Keep the single edit button.
- Screen title `Workouts` + subtitle `N routines` (sentence case), token-driven.

### Nutrition (tracking) — `app/nutritionScreens/nutritionScreen.tsx`, `components/NutritionComponents/Entry.tsx`, new `DailyIntakeCard`
- **New `components/NutritionComponents/DailyIntakeCard.tsx`:** left = `ProgressRing` (restyled `ProgressWheel`, calorie %, center shows `consumed / goal`), right = `N kcal left` caption + three `MacroBar`s (Protein/Carbs/Fats). Data: `useNutrition().handleGetMacrosForDate(new Date())` → `{ totalCalories, totalProtein, totalCarbs, totalFats }`; goals from `useSettings().settings.{calorieGoal,proteinGoal,carbsGoal,fatsGoal}`. Percentage math already exists in `progress.tsx:103–107` — lift it.
- Place `DailyIntakeCard` at the **top** of the FlatList header; **remove `BwCard`** from this screen (moves to Progress).
- `Entry` meal card: `radius` 16→10, accent 4px→3px, macro cells → `surfaceInset` + `radius.macroCell`, order Protein/Carbs/Fats, `kcal` label, calorie number in `nutrition`/`nutritionInk`, round edit button. Tokens + fonts.
- Date control → pill chip (`radius.chip`, hairline, green calendar icon + label).

### Progress — `app/(tabs)/progress.tsx`, `components/GraphComponents/Graph1.tsx` / `Graph2.tsx`
- **Remove** the fatigue UI (lift mode: "Todays Fatigue" title + fatigue card + 3-card fatigue mini-wheel row) **and** the nutrition calorie/macro UI (nutrition mode: "Todays Calories" card + 3 macro mini-wheels). `handleGetFatigueSummary`/`getFatigueFeedback` drop out of this screen; leave the WorkoutContext functions intact.
- **Add `BwCard`** in nutrition mode, above/near the body-weight graph (`components/NutritionComponents/bwCard.tsx`; self-contains its edit→`updateBWModal` flow).
- Result: `ActivityBanner` → Graph 1 (strength / nutrition) → Graph 2 (sets / body weight, with `BwCard` in nutrition mode) → existing selection modals. Restyle remaining cards to `radius.cardLg` (12), `surface`, hairline, tokens.
- **Graph restyle (victory-native, in place):**
  - `Line`: `strokeWidth` 3.5→~2.5, keep `curveType="monotoneX"`, round cap.
  - `Area`: replace the flat `opacity={0.15}` fill with a Skia gradient — nest `<LinearGradient start={vec(0,0)} end={vec(0, <chartHeight>)} colors={[accent + 'CC', accent + '00']} />` (from `@shopify/react-native-skia`) as a **child of `<Area>`** (documented children pass-through) for the 0.45→0 ramp.
  - Gridlines: thin to ~3 horizontal lines via `yAxis` `tickValues`; gridline color `ringTrack`.
  - Dots: render only the **end** point (filter the per-point loop) with the subtle layered-circle glow already used for the active-press state.
  - Axis label colors/fonts from tokens; route graph fonts through `context/ThemeContext/typography.ts` (replaces Graph2's SpaceMono).

### Settings — `app/(tabs)/settings.tsx`
- **Add a profile card** at the top: 52px avatar with initials on a `workout→nutrition` gradient, name (`useAuth().user.user_metadata?.full_name`), email (`useAuth().user.email`), and a **PRO badge** when `useBilling().hasPremium` (green, tinted, pill).
- **Add one "Appearance" row** that reads `useColorScheme()` and calls `useSetColorScheme()` to toggle Dark/Light, with the current value as the trailing label.
- Keep all existing rows/sections and handlers. Restyle surfaces/icon tiles/text to tokens + fonts (soft-square icon tiles, `divider` separators, `chevron` token).

---

## Critical files

| Area | Files |
|---|---|
| Foundation | `context/ThemeContext/typography.ts` (new), `context/ThemeContext/tokens.ts` (new), `context/ThemeContext/types.ts`, `context/ThemeContext/colors.ts`, `context/ThemeContext/index.tsx` (re-exports), `app/_layout.tsx` |
| Chrome / primitives | `components/NeutralComponents/ModeSwitcher.tsx`, `components/NeutralComponents/Fab.tsx`, `app/(tabs)/_layout.tsx`, `components/GraphComponents/ProgressWheel.tsx` |
| Workouts | `app/workoutScreens/workoutScreen.tsx`, `components/WorkoutComponents/Log.tsx` |
| Nutrition | `app/nutritionScreens/nutritionScreen.tsx`, `components/NutritionComponents/Entry.tsx`, `components/NutritionComponents/DailyIntakeCard.tsx` (new) |
| Progress | `app/(tabs)/progress.tsx`, `components/GraphComponents/Graph1.tsx`, `components/GraphComponents/Graph2.tsx` |
| Settings | `app/(tabs)/settings.tsx` |

## Reuse (don't rebuild)
- Macro/goal data: `useNutrition().handleGetMacrosForDate`, `useSettings().settings.*Goal`; percentage math already in `progress.tsx:103–107`.
- Body weight: existing `components/NutritionComponents/bwCard.tsx` (self-contained edit flow).
- Profile/billing: `useAuth().user`, `useBilling().hasPremium`.
- Theme: `useColors`/`useColorScheme`/`useSetColorScheme` (no API changes).
- Charts: existing victory-native `CartesianChart`/`Line`/`Area` + `@shopify/react-native-skia` (`LinearGradient`, `vec`) — already installed.

## Execution & agent strategy

### Branch
All restyle work lands on a dedicated branch off `main` (`restyle/refined-theme`); nothing commits to `main` directly. Create it before Phase 0. Merge back only after the full integration QA (final phase) passes.

### Governing principle
**Parallelize by disjoint file ownership; serialize anything that touches shared files.** Two agents must never edit the same file. The foundation and shared primitives are imported by everything, so they land **first and are frozen** before any fan-out. Screens are disjoint file sets → safe to run in parallel.

### Phases & agent allocation
Run Phases 0–1 (and ideally the first screen) in the main session to set conventions and shake out the primitive APIs; delegate Phase 2 to parallel agents only after the recipe is proven.

| Phase | Agents | Files owned | Notes |
|---|---|---|---|
| **0 — Foundation** | **1, solo (blocking)** | `context/ThemeContext/{types,colors,typography,tokens,index}.ts`, `app/_layout.tsx` | Everything imports these. Produces the migration recipe. Dark mode must look identical to pre-change (regression baseline). |
| **1 — Primitives + chrome** | **1, after P0** | `ModeSwitcher`, `Fab`, `ProgressWheel`, `(tabs)/_layout`, any extracted `MacroBar`/`AccentCard`/`IconButton` | Freeze each primitive's prop API so screen agents can rely on it. |
| **2 — Screens** | **up to 4, parallel** | A: `workoutScreen`+`Log` · B: `nutritionScreen`+`Entry`+`DailyIntakeCard` · C: `progress`+`Graph1`+`Graph2` · D: `settings` | Disjoint files → true parallelism. **C is heaviest** (graph + fatigue removal + BwCard move) — most context/time. BwCard move is conflict-free: B removes the reference, C adds one; neither edits `bwCard.tsx`. |
| **3 — Integration / QA** | **1, solo** | — | Full Verification section below across dark/light × lift/nutrition. |

### Per-phase checkpoint gate (run at the end of EVERY phase, before the next)
This is a styling/refactor effort — the headline invariant is **behavior preservation**. Each phase ends with:
1. **Diff against the previous commit** — `git diff <last-phase-commit>` (or `git diff` of the phase's work). Read the whole diff.
2. **Behavior-preservation review** — confirm changes are limited to styling (tokens/fonts/layout) **plus only the structural edits explicitly planned for that phase**. Verify no handlers, conditionals, data bindings, props, context calls, or list/key logic were dropped or altered. For phases with intended removals (fatigue UI) or moves (BwCard), confirm the removed behavior isn't needed elsewhere and moved code is wired identically in its new home.
3. **Build/type/test gate** — `npx tsc --noEmit` and `npm test` pass; app boots; spot-check the phase's surfaces in dark + light × lift + nutrition.
4. **Commit** — one scoped commit per phase (clean, revertible history), then proceed. Do not start the next phase with an uncommitted working tree.

### Reusable migration recipe (per file — used now and for the full-app rollout)
> import `useColors` + `fonts`/`radius` from `@/context/ThemeContext` → convert `StyleSheet.create({…})` to `makeStyles(colors)` + `useMemo` → replace hardcoded hexes with the matching token and `Poppins_XXX` with `fonts.X` → verify the file renders in both themes.

### Agent-prompt checklist (every delegated agent gets all five)
1. The migration recipe (above). 2. The token reference (names + when to use each). 3. The frozen primitive prop APIs from Phase 1. 4. Its exact file list — "touch nothing outside it." 5. Verification = renders in both themes × both modes + `tsc` clean. Keep each PR/commit to one screen.

### Full-app rollout (onboarding, modals, settings sub-screens, …) — later
Same recipe at scale, mechanical once the token set is proven by the 4 screens. After extending tokens for any gaps, fan out **one agent per folder** (disjoint sets): `onboardingScreens/`, `authScreens/`, `workoutScreens/*Modal`, `nutritionScreens/*Modal`, `settingsScreens/`, `GuardComponents/`, etc. Same per-phase gate (diff → behavior review → tsc/test → commit) applies per folder. **Gate the light-mode toggle behind "all folders migrated"** — until then ship dark-only or feature-flag it.

## Verification (Phase 3 — full sweep before merging the branch to `main`)
- Run the app (`npm start`, Expo Go / device) and walk all four tabs.
- **Dark mode:** each screen matches the Refined mockup (surfaces, hairlines, radii, accent bars, rings, restyled graph with gradient fill + end dot).
- **Appearance toggle:** flip Dark↔Light in Settings → the four migrated screens recolor correctly with no hardcoded-hex artifacts; persists across relaunch (AsyncStorage).
- **Mode toggle:** Lift↔Nutrition switches accent across toggle, FAB, active tab, accent bars, rings, graph.
- **Font flip:** change `FONT_FAMILY` between `'poppins'`/`'archivo'`, reload, compare — no missing-glyph fallback.
- **Data correctness:** Daily Intake numbers match logged meals/goals; body-weight card on Progress opens `updateBWModal` and updates; Progress graphs render strength/sets (lift) and nutrition/body-weight (nutrition) with the new styling.
- **Regression:** confirm fatigue removal didn't break WorkoutContext consumers; `npx tsc --noEmit` and `npm test` pass.
