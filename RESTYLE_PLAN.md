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
- Extend the `Colors` type and **both** `light`/`dark` palettes with the new handoff tokens: `surface`, `surfaceInset`, `toggleTrack`, `hairline`, `divider`, `navBorder`, `labelMuted`, `tabInactive`, `ringTrack`, `chevron`, `iconChipBg`, `nutritionInk`, `warning` (amber — "off-target" stat tone; dark `#FFB020` / light `#9C5D00`), plus gradient tuples `workoutGradient` and `nutritionGradient` (`readonly [string, string]` for `expo-linear-gradient`). Keep existing values.
- **Accents are per-theme** (no longer in the shared `brand` object). The bright values are dark-only; light uses the **same hue deepened** for legibility on white (the bright green ≈ 1.7:1 on white). Values: `workout` dark `#2F80ED` / light `#2570D8`; `nutrition` dark `#00BD48` (emerald) / light `#168516`; gradients land on the same deepened base on light. `nutritionInk` stays for tiny green text (AA). Everything reading `useColors().workout/nutrition` (graphs, FAB, toggle, accent bars, chevrons) updates automatically.
- Add a radii/spacing constant set (`context/ThemeContext/tokens.ts`): `radius.card=10`, `radius.cardLg=12`, `radius.toggle=9`, `radius.macroCell=9`, `radius.iconButton=full`, `radius.chip=999`; screen padding 18, card padding 14–16, card gap 11.
- `useColors()`, `useColorScheme()`, `useSetColorScheme()` already exist in `context/ThemeContext/index.tsx` — no API change.
- **Contrast tweaks (a11y):** the green/blue **accents and their gradient fills are now one deep, AA-safe shade, unified across light + dark** — so white text/icons clear 4.5:1 everywhere and every CTA/Fab/ModeSwitcher matches the icon/border/numeral accent. Values: `nutrition` `#168516` + `nutritionGradient` `['#168516','#0F7A0F']` (white ~4.8–5.5:1); `workout` `#2570D8` + `workoutGradient` `['#2570D8','#2064C8']` (white ~4.8–5.6:1); `nutritionInk` `#168516`. This deliberately trades the prior neon-on-dark accent for consistency + AA (a bright green/blue cannot carry white at AA — the neon and white-text buttons are mutually exclusive). Side effect: the `StagedSection` count badge (white on the accent) now passes (~4.5:1). Muted text nudged to AA 4.5:1: `labelMuted` light `#6C6D75`→`#5A5B64`, dark `#6B6B73`→`#82838C`; `textMuted` light `#6A6A6E`→`#5E5E62`. Known minor: charts/`ProgressWheel` rings keep their own hardcoded gradient stops, so the Daily Intake ring may read slightly brighter than the accent.
- **Usage-aware AA contrast pass (2026-06):** audited every token against the *actual* background it renders on (text 4.5:1, large/icon 3:1), not a generic backdrop. Fixes, all value-only in `colors.ts`: `placeholder` light `#8A8B92`→`#6A6B72`, dark `#555555`→`#86878F` (placeholders sit in *active* inputs, so not exempt); `tabInactive` dark `#5C5C64`→`#86878F` (was 2.6:1 — failed even the 3:1 icon bar for the unselected tab/ModeSwitcher icons); `textFaint` dark `#666666`→`#8A8A8A` (used as 14px slider range labels); `warning` light `#C77700`→`#9C5D00` (deeper amber, AA on card surface); dark `nutritionInk` `#168516`→`#00BD48` for the 10px calorie badge. **Dark CTA fills are all neon for visual consistency — a DELIBERATE vibrancy override (supersedes the "deep #008A00" / "unified deep shade" notes above):** the app has two CTA-fill families (solid `backgroundColor: colors.nutrition/workout` buttons AND the `*Gradient` buttons); to stop a flat button and a gradient button clashing on the same screen, **both** use the neon brand accents on dark. `nutritionGradient` `['#00BD48','#009A3B']` (cohesive emerald green; white text/icons run **~2.5–3.7:1 — below AA**, accepted for the energetic look, documented like the measurement amber), `workoutGradient` `['#2f80ed','#2064C8']` (vivid blue, ~3.9–5.6:1, icon/large-text ok). The same `#00BD48`/`#2f80ed` also stay the chart/ring/icon accents, where they read ~6.9:1 on dark and fully pass. (Emerald `#00BD48` chosen over the prior lime `#22C922` — more refined and it pairs/gradients better with the workout blue.) **Light gradients stay deep + AA** (`['#168516','#0F7A0F']` / `['#2570D8','#2064C8']`) — neon looks washed-out on white. FAB child buttons read `colors.*Gradient[0]` so they always match the trigger. Small accent *text/links* still use the AA `*Ink` tokens, never the neon fill. **`measurement` was checked and left as-is** — it's only ever a 65px icon, a border, and a white-on-fill CTA, all of which clear their 3:1 / 4.5:1 thresholds, so the deep amber needs no per-theme split. **Borders deliberately untouched** — `hairline`/`border`/`divider`/`navBorder` are decorative shadow-accents, not control boundaries, so AA imposes no contrast requirement on them.
- **Readable-text accents (`*Ink`) + per-theme `destructive`:** the deep fill accents are tuned to carry *white text on the fill*, but as *small accent text on a background* they fall to ~3.5–3.9:1 (fail AA). So small accent links/labels use per-theme **ink** tokens instead: `nutritionInk` (green) and **new `workoutInk`** (blue — dark `#4D9BFF`, light `#1A57B0`; AA on the dark background and on light surfaces respectively). Likewise `destructive` is now **per-theme** (dark `#FF453A`, light **deepened `#C20012`**) so red text/icons on light tinted surfaces (Delete button, error blocks) clear AA. Use `workout`/`nutrition` for fills, borders, and large/icon glyphs; use `*Ink` for small colored text.
- **`measurement` gold (Adjust Measurements accent), per-theme + theme-flipped CTA text:** the third accent is now a **yellow/gold**, split by theme so it's vivid yet fully AA. **Dark `#FBBF24`** (bright golden yellow) — vivid icon/border on the dark surface (10.3:1), and its `measurementGradient` `['#FBBF24','#F59E0B']` carries **DARK** Save-button text (`#1A1B1E`, ~8–10:1) because white can't sit on bright yellow. **Light `#A16207`** (deep gold) — icon reads on the white surface (4.8:1), and its gradient `['#A16207','#854D0E']` carries **white** Save text (4.9:1). The button text color flips in `adjustMeasurements.tsx` (`isDark ? '#1A1B1E' : '#fff'`). This resolves the old "white on bright amber ~1.4:1" problem: bright fill → dark text (dark mode), deep fill → white text (light mode).

### 3. Theme-aware StyleSheet pattern
For restyled files, adopt `const styles = useMemo(() => makeStyles(colors), [colors])` where `makeStyles(colors)` returns the StyleSheet. Keeps layout static, makes color react to the toggle.

> **Scope caveat:** tokens are global, but this restyle migrates only the 4 main screens + their components + shared primitives. Non-migrated surfaces (onboarding, sub-modals, settings sub-screens) still hardcode dark hexes and will look wrong in light mode. Recommend wiring the Appearance row now (works on migrated screens) and treating full light-mode migration of remaining screens as a tracked follow-up.

---

## Shared primitives / chrome

- **`ModeSwitcher.tsx`** — restyle container to the mockup toggle: `toggleTrack` bg, hairline border, `radius.toggle` (9, inner 7), active segment filled with the mode **gradient** (135°, 2-color) + soft shadow, inactive `tabInactive`. **Keep the dumbbell/nut icons.** Colors/gradients from tokens.
- **`app/(tabs)/_layout.tsx`** — theme- and mode-aware tab bar: active tint = current mode accent (blue lift / green nutrition; `text` on Settings), inactive = `tabInactive`, bar bg = `surface`/`background`, top border = `navBorder`. Read `mode` from `useSettings()`. Drop legacy `constants/Colors` + `ExpoComponents/useColorScheme`.
- **`Fab.tsx`** — keep the expanding multi-action behavior; restyle trigger + child buttons to gradient (`workoutGradient`/`nutritionGradient`) with the restrained colored shadow. Token-drive colors.
- **`ProgressWheel.tsx`** — add a `children` prop for custom center content (Daily Intake ring shows `1052 / 2200` not `%`); support solid stroke + `ringTrack` track. Keep `%` default for any remaining callers.
- **`components/NeutralComponents/PressableScale.tsx`** — reanimated press-scale wrapper (0.96, transform-only). Production port of the V4-onboarding devTest primitive; drop-in for TouchableOpacity where tactile press is wanted.
- **`components/NeutralComponents/OptionCard.tsx`** — V4-onboarding selectable card: neutral `surface` + 2px `border` that turns `accent` when selected (`accent + '10'` tint), optional leading icon tile, optional multi-select check, staggered `FadeInDown` entrance. Used by the settings adjust flows; the future real-onboarding V4 should reuse it.
- **`components/NeutralComponents/StepProgress.tsx`** — V4 progress dots (`total` dots, 0-based `current` elongated + accent-tinted). Callers pass a skip-adjusted total (Adjust Nutrition: 4 dots, 3 on the maintain path).
- **`components/NeutralComponents/EditHeightModal.tsx`** — inline height editor, sibling of `EditMacroGoalModal` (same scrim/card/animation/buttons). Unit-aware (ft+in / cm), validates via `validateHeightWeight`, returns TOTAL height via `onSave`; the caller (profile) recalcs macros + commits. Profile edits height inline and routes weight through `updateBWModal` (the canonical `handleUpdateBw` path). Adjust Measurements is fully unlinked (no Settings-tab row, no `_layout` registration) — the screen file is kept but unreachable.
- **`components/NutritionComponents/GoalProjectionChart.tsx`** — the V4 signature projection chart (react-native-svg, animated draw, reduced-motion aware). Variants: `lose` (green down-slope), `gain` (green up-slope), `maintain` (recomp: flat green weight line + rising blue strength line). Used by `adjustNutrition4`.

### Settings adjust flows (restyled to V4, June 2026)
Both flows are headerless (`headerShown: false`, safe-area top pad `max(insets.top, 12) + 16`) with the V4 footer (neutral Back + primary CTA, 50/50) and `StepProgress` dots.

`app/settingsScreens/adjustNutrition/` is a 4-screen V4-styled flow: **1 goal** ("What's your goal?", Cut/Maintain/Bulk `OptionCard`s mapped to stored `lose/maintain/gain`, target-weight input, existing validators) → **2 pace** (unit-aware display, **storage stays lb/week** — `macroCalculation.tsx` assumes lbs, metric converts via `kgToLbs`) → **3 plan** (V4 macro grid, V4 macro colors `#FF9500/#FF5A5A/#EAB308/nutrition`, EditMacroGoalModal) → **4 projection** (`GoalProjectionChart` + stat cards, **save point**: Back + neutral Save Changes). Maintain skips pace (goalPace `'0'`); dots show 3 on that path, 4 otherwise.

`app/settingsScreens/adjustTraining.tsx` matches V4's Activity step: "How active are you?" + five `OptionCard`s with the blue (`colors.workout`) selected state; saving still recalculates all four macro goals via `calculateMacros` (activity feeds TDEE + the fatigue daily budget) and commits in one `setSettings`. CTA is Back + neutral Save.

**Settings CTA rule:** in-app settings commit buttons (adjust flows' Save, `EditHeightModal` Save) use the NEUTRAL V4 button (`colors.text` bg / `colors.background` text) — the colored "go" gradients are reserved for onboarding-conversion moments (paywall) and the `updateBWModal` sheet, since existing users don't need the persuasion color.

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

### Progress — `app/(tabs)/progress.tsx` + `components/GraphComponents/*`
- **Removed** the fatigue UI (lift) and the nutrition calorie/macro mini-wheel UI. `WorkoutContext` fatigue functions stay intact (dormant), just not displayed.
- **`BwCard`** shows in nutrition mode next to the body-weight graph (`components/NutritionComponents/bwCard.tsx`; self-contained `updateBWModal` flow).
- **Layout:** `ActivityBanner` → **top card** → (`BwCard`, nutrition) → **bottom card**. Cards are `radius.cardLg`, `surface`, hairline; each has its **header inside the card** (title + subtitle).
- **Card type is fixed by position, not mode** — the **top card is always a line chart** (`Graph1`), the **bottom card is always a bar chart** (`BarChart`):
  - Top (line): lift = Strength (Est. 1RM), nutrition = Body Weight (+ goal line).
  - Bottom (bars): lift = Sets, nutrition = Calories/Macros (+ goal line).

#### Graph system (built state — supersedes the original handoff's line-only restyle)
> Two decisions postdate the handoff: **calories/macros render as bars** (not a line), and the bar charts use a **fixed Sun–Sat weekday view with ← → week paging** (no range selector). Sunday is the single week-start everywhere, via `getWeekStart`.

- **Shared chart primitives — `components/GraphComponents/chartPrimitives.tsx`** (Skia; rendered inside a `CartesianChart` children render-prop, each a component so it owns its hooks):
  - `EndValueFlag` — pill labelling the latest value above the end point/bar, clamped in-canvas.
  - `GoalLine` — dashed accent reference line (**no** text label).
  - `PressGuideline` + `PressDot` — line-chart press read-out (dashed guideline + ringed dot).
  - `BarRect` — one bar; featured bar = full accent, others 0.55, pressed bar lifts; zero/rest days render nothing.
- **`ChartReadoutPill.tsx`** — RN overlay value+date pill driven by `useChartPressState` (reanimated position, clamped). Shared by line + bar.
- **`Graph1.tsx` (line)** — 2.5px line + Skia `Area` gradient (`accent+'73'`→`'00'`), end dot (+dark glow), `EndValueFlag`, press read-out, optional `goal` line (y-domain widened to include the goal). Top headroom (`padding.top` 14 / `domainPadding.top` 30) so the flag never clips. Keyed by a data-signature in `progress.tsx` so it refreshes on data change.
- **`BarChart.tsx` (bars)** — weekday Sun–Sat bars on a 0 baseline; `tickCount={data.length}` so all 7 labels show; optional `goal` line; `highlightIndex` features **today** (current week, only when logged — nothing featured otherwise); inner `<CartesianChart key={valueSig}>` so it repaints on data change **without** re-triggering the load spinner (week paging stays smooth).
- **`GraphStats.tsx`** — single inset two-up row (`surfaceInset` bg, hairline divider), sentence-case labels, lucide arrow + **goal-aware tone**: 1RM/sets up=`nutrition`/down=`destructive`; body weight by direction toward `goalWeight`; calories/macros near-target=`textSecondary`, off=`warning`, far=`destructive` (averaged over **logged days only**).
- **`ActivityBanner.tsx`** — accent-tinted banner; lift shows a 7-dot Sun–Sat week strip lit from `trainedDaysThisWeek` (same source as the Sets bars, so dots and bars align).
- **`RangeSelectionModal.tsx`** — token-restyled sheet, 7/14/21 as pills (now used by the **top** line card only).
- **Data (Sunday week):** `getWeekStart` / `addDays` / `WEEKDAY_INITIALS` / `WeekDayPoint` in `lib/utils/dateHelper.ts`; `getSetsForWeek` (`volumeFunctions.tsx`) + `getMacroForWeek` (`graphFunctions.tsx`), exposed as `handleGetSetsForWeek` / `handleGetMacroForWeek`. `Graph2.tsx` deleted. The old range-based `getSetsData` / `getMacroDataForGraph` are now unused (kept + unit-tested; candidates for cleanup).

### Settings — `app/(tabs)/settings.tsx`
- **Add a profile card** at the top: 52px avatar with initials on a `workout→nutrition` gradient, name (`useAuth().user.user_metadata?.full_name`), email (`useAuth().user.email`), and a **PRO badge** when `useBilling().hasPremium` (green, tinted, pill).
- **Add one "Appearance" row** that reads `useColorScheme()` and calls `useSetColorScheme()` to toggle Dark/Light, with the current value as the trailing label.
- Keep all existing rows/sections and handlers. Restyle surfaces/icon tiles/text to tokens + fonts (soft-square icon tiles, `divider` separators, `chevron` token).

### Settings sub-screens — component & layout conventions (learned during migration)
Applies to `settingsScreens/` and is the default for the full-app rollout.
- **Surface tiers by context:** elements sitting on the screen `background` use `surface` (raised); only use `surfaceInset` for things nested *inside* a `surface` card. (`surfaceInset` == `background` in light mode, so an on-background inset disappears.)
- **Spacing = grouping (proximity), not uniformity.** Use a few steps from an 8/4 scale, chosen by relationship — never space everything equally:
  - *Within a cluster/pair* (icon→title, title→subtitle, a pair of links, items in a row): **2–8**.
  - *Within a group* (section title→card, row padding): **12**.
  - *Between groups/sections*: **24** on scrollable list screens (profile, settings), **16** on compact no-scroll screens (subscription).
  - *Distinct tier* (legal/fine print, destructive actions): separate further (**~24**) or anchor to the bottom — don't let it share a group's gap.
  - Perceived gap = container `gap` + each item's own `paddingVertical`; size touch targets with **`hitSlop`** so 44px taps don't distort the visual rhythm.
  - Horizontal screen inset: **20** (app standard).
  - Header→content gap (settings sub-screens have a native Stack header): **`scrollContent.paddingTop: 24`** — one mechanism for every screen, never outer-container padding (creates a non-scrolling dead band) or per-icon margins.
- **CTAs:** `TouchableOpacity` → `LinearGradient` (mode gradient) + white text, `overflow:'hidden'`, restrained colored shadow (see `LogDateModal`/`Fab`). `*Gradient` fills + white only — never white on the flat bright accent.
- **Accent usage:** `workout`/`nutrition` for fills, borders, and large/icon glyphs (≥3:1); **`*Ink`** for small accent text/links (AA); `destructive` per-theme.
- **Hero icons (settings sub-screens):** a `surface` circle — `backgroundColor: surface`, `borderWidth: 2` + `borderColor: accent` (accent ring), glyph in the full `accent`. (Tinted-disc, glow, and gradient-fill variants were tried and rejected; surface + ring is the chosen look.) Reserve gradient fills for avatars / FAB / CTAs.

---

## Critical files

| Area | Files |
|---|---|
| Foundation | `context/ThemeContext/typography.ts` (new), `context/ThemeContext/tokens.ts` (new), `context/ThemeContext/types.ts`, `context/ThemeContext/colors.ts`, `context/ThemeContext/index.tsx` (re-exports), `app/_layout.tsx` |
| Chrome / primitives | `components/NeutralComponents/ModeSwitcher.tsx`, `components/NeutralComponents/Fab.tsx`, `app/(tabs)/_layout.tsx`, `components/GraphComponents/ProgressWheel.tsx` |
| Workouts | `app/workoutScreens/workoutScreen.tsx`, `components/WorkoutComponents/Log.tsx` |
| Nutrition | `app/nutritionScreens/nutritionScreen.tsx`, `components/NutritionComponents/Entry.tsx`, `components/NutritionComponents/DailyIntakeCard.tsx` (new) |
| Progress | `app/(tabs)/progress.tsx`; `components/GraphComponents/{Graph1,BarChart,chartPrimitives,ChartReadoutPill,GraphStats,ActivityBanner,RangeSelectionModal}.tsx` (`Graph2.tsx` removed); data: `lib/utils/dateHelper.ts`, `context/WorkoutContext/functions/volumeFunctions.tsx`, `context/NutritionContext/functions/graphFunctions.tsx` |
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

> **Tracked follow-up — hardcoded accent hexes.** ~44 files still hardcode the raw brand hexes (`#2f80ed` / `#00BD48` / `#34C759` …) instead of reading `useColors().workout/nutrition`. These won't pick up the new **per-theme** light accents, so they'll show the bright dark-mode green/blue on white. Almost all are not-yet-migrated screens (onboarding, most modals, login). Sweep them to the token during the per-folder rollout above; until then, light mode is only fully accent-correct on the migrated surfaces (the 4 main screens + graph components).
>
> **Progress (branch `restyle/primitives-rollout`).** Shared primitives that render *inside* already-migrated screens are now fully token-driven: `ScrollableList`, `DatePicker`, `CustomHeader` (NeutralComponents), `SelectionModal` (GraphComponents), and `AppLoadingScreen` (GuardComponents) — including the last lime `#22C922` accent bar/thumbnail → `colors.nutrition` (emerald). `authScreens/login.tsx` migrated (terms link → `workoutInk`). **Layout retune (follow-up pass):** those primitives' card corners were then tightened from the old 16px literals to the `radius.*` tokens (`radius.card` 10 for list/picker cards, `radius.cardLg` 12 for the DatePicker header + login Apple button), `SelectionModal` inset 25→24, and `ScrollableList` cards adopted the reference **flat-in-dark / soft-in-light** shadow (matching `Entry`/`Log`) with `hitSlop` added to the `✕`/back-button glyphs for ≥44pt targets. Padding/gaps were left as literals — the Refined system tokenizes corners, not spacing. Residual-hex sweep of the already-migrated screens is complete: the remaining literals are **documented intentional exceptions** — white-on-accent/gradient text, black shadows, `cameraScreen` overlay chrome, `ProgressWheel` ring gradient stops, the `(tabs)/_layout` fixed dark "ink" tab bar, the web-only phone-chrome frame in `app/_layout.tsx` (sits outside `ThemeProvider`), and the Skia `useFont` loaders in `Graph1`/`BarChart` (already `FONT_FAMILY`-switched). **Still deferred:** `app/onboardingScreens/` (11 files) — excluded pending the `components/devTest/onboarding/` V4 redesign that will replace it; its onboarding-specific token gaps (macro colors `#FF6B6B`/`#FFD93D`, light-tinted CTA backgrounds, gradient-overlay rgba) are deferred with it.

## Verification (Phase 3 — full sweep before merging the branch to `main`)
- Run the app (`npm start`, Expo Go / device) and walk all four tabs.
- **Dark mode:** each screen matches the Refined mockup (surfaces, hairlines, radii, accent bars, rings, restyled graph with gradient fill + end dot).
- **Appearance toggle:** flip Dark↔Light in Settings → the four migrated screens recolor correctly with no hardcoded-hex artifacts; persists across relaunch (AsyncStorage).
- **Mode toggle:** Lift↔Nutrition switches accent across toggle, FAB, active tab, accent bars, rings, graph.
- **Font flip:** change `FONT_FAMILY` between `'poppins'`/`'archivo'`, reload, compare — no missing-glyph fallback.
- **Data correctness:** Daily Intake numbers match logged meals/goals; body-weight card on Progress opens `updateBWModal` and updates; Progress graphs render strength/sets (lift) and nutrition/body-weight (nutrition) with the new styling.
- **Regression:** confirm fatigue removal didn't break WorkoutContext consumers; `npx tsc --noEmit` and `npm test` pass.
