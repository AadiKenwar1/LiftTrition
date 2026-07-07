# Handoff: PLATES "Refined" Restyle (Dark + Light)

## Overview

A visual refresh of the PLATES dual-mode tracker (lifting + nutrition). The **Refined** direction keeps the app's existing structure and the established **Lift = blue / Nutrition = green** color coding, but modernizes the surface treatment: softer charcoal/white surfaces, hairline borders, glowing accent edges, a tightened type scale, Space-Mono micro-labels, and consistent data-viz (progress rings, macro bars, strength line graph). Both a **dark** and a **light** theme are specified, built from one shared token set.

Scope of this restyle: the four primary screens — **Workouts (Lift home)**, **Nutrition (Today's Logs)**, **Progress (Lift)**, and **Settings**.

## About the Design Files

The file in this bundle (`PLATES Restyle.dc.html`) is a **design reference created in HTML** — a prototype showing the intended look, not production code to copy. Each "phone" in it is a static mockup laid out side by side.

The implementation task is to **recreate these designs inside the existing PLATES React Native / Expo codebase**, using its established patterns: the `ThemeContext` + `colors.ts` token system, `react-native-svg` for rings/graphs, `expo-linear-gradient` for the mode toggle and FAB, and Expo Router screens under `app/(tabs)/`. Do **not** ship the HTML. Reuse existing components (`WorkoutComponents`, `NutritionComponents`, `GraphComponents`, `NeutralComponents`) and restyle them — don't rebuild data/sync logic.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, and component structure below are final and exact. Recreate the UI to match, pulling every color from theme tokens (never hardcode) so light/dark both work.

---

## Design Tokens

These extend the existing `ThemeContext/colors.ts` palettes. Add the new keys to **both** `light` and `dark`. Existing brand values are unchanged.

### Brand (shared across themes)

| Token               | Value                      | Use                                      |
| ------------------- | -------------------------- | ---------------------------------------- |
| `workout`           | `#2F80ED`                  | Lift accent (existing)                   |
| `workoutGradient`   | `#3A8BF0 → #2F80ED` (135°) | Lift toggle, FAB, buttons                |
| `nutrition`         | `#22C922`                  | Nutrition accent (existing)              |
| `nutritionGradient` | `#34D63A → #22C922` (135°) | Nutrition toggle, FAB                    |
| `nutritionInk`      | `#1BA81B`                  | Green numerals on light bg (AA contrast) |
| `destructive`       | `#FF453A`                  | Sign out / delete (existing)             |

### Surfaces & text

| Token           | Dark                     | Light                   | Use                                                                   |
| --------------- | ------------------------ | ----------------------- | --------------------------------------------------------------------- |
| `background`    | `#0F1012`\*              | `#F2F2F7`               | Screen background (\*mock uses `#0F1012`; existing `#121212` is fine) |
| `surface`       | `#1A1B1E`                | `#FFFFFF`               | Cards / raised panels                                                 |
| `surfaceInset`  | `#0F1012`                | `#F2F2F7`               | Macro cells, wells inside cards                                       |
| `toggleTrack`   | `#16171A`                | `#E6E6EC`               | Mode-toggle container                                                 |
| `hairline`      | `rgba(255,255,255,0.06)` | `#E9E9EF`               | Card borders                                                          |
| `divider`       | `rgba(255,255,255,0.05)` | `#EFEFF3`               | Row separators                                                        |
| `navBorder`     | `rgba(255,255,255,0.06)` | `#E1E1E6`               | Tab bar top border                                                    |
| `text`          | `#FFFFFF`                | `#000000`               | Primary text                                                          |
| `textSecondary` | `#9A9AA3`                | `#3C3C43`               | Body copy                                                             |
| `labelMuted`    | `#6B6B73`                | `#9A9AA0`               | Small caption / meta labels                                           |
| `tabInactive`   | `#5C5C64`                | `#A0A0A8`               | Inactive tab icon/label                                               |
| `ringTrack`     | `#26272B`                | `#E5E5EA`               | Progress-ring & macro-bar track                                       |
| `chevron`       | `#5C5C64`                | `#C0C0C8`               | List-row chevrons                                                     |
| `iconChipBg`    | `rgba(47,128,237,0.16)`  | `rgba(47,128,237,0.10)` | Round icon-button bg (accent-tinted)                                  |

### Typography

| Role                           | Family  | Weight  | Size  | Tracking                  |
| ------------------------------ | ------- | ------- | ----- | ------------------------- |
| Screen title                   | Archivo | 800     | 26    | -0.02em                   |
| Section title                  | Archivo | 800     | 19    | -0.02em                   |
| Card title                     | Archivo | 700     | 16–17 | normal                    |
| Hero number (ring %, calories) | Archivo | 800     | 20–26 | normal                    |
| Body                           | Archivo | 400–500 | 13–14 | normal                    |
| Value / stat                   | Archivo | 700     | 13–17 | normal                    |
| Caption / meta label           | Archivo | 500–600 | 10–13 | normal, **sentence case** |

> **No monospace, no all-caps micro-labels.** The earlier draft used Space Mono uppercase captions (e.g. `6 EXERCISES`, `KCAL`) — that read like a dev dashboard. Use normal sentence-case sans for all meta text (`6 exercises`, `1,148 kcal left`, `Last 3 days`). The only intentional uppercase is the two mode-toggle segment labels (`LIFT` / `NUTRITION`).

Fonts: add **Archivo** (`@expo-google-fonts/archivo`, weights 400/500/600/700/800) loaded in `app/_layout.tsx`. Space Mono is no longer needed for this design.

### Radii

**Principle: large surfaces crisp, small controls round.** Cards get tight corners so the UI reads as a serious instrument, not a bubbly SaaS console — but small interactive controls (icon buttons, chips) stay fully round/pill so taps feel soft and the sharpening looks intentional rather than uniformly boxy.

| Token                     | Value                                           |
| ------------------------- | ----------------------------------------------- |
| `radius.card`             | 10                                              |
| `radius.cardLg`           | 12                                              |
| `radius.toggle`           | 9 (inner segment 7)                             |
| `radius.macroCell`        | 9                                               |
| `radius.settingsIconTile` | 9 (soft square)                                 |
| `radius.iconButton`       | **full circle** (pencil / menu / edit, 32–34px) |
| `radius.chip`             | **pill / 999** (date chip, badges)              |
| `radius.fab`              | full circle                                     |

### Spacing

Screen horizontal padding **18**. Card padding **14–16**. Gap between cards **11**. Section vertical gaps **16–20**. Icon buttons **34×34**. FAB **58×58**. Min hit target ≥ 44.

### Shadows / effects

Keep it **matte and restrained** — heavy neon glow was part of what made the earlier draft feel SaaS-y. Glows are barely-there accents, not light sources.

- **Accent left bar (dark):** 3px-wide bar in accent color + a faint `box-shadow: 0 0 4px 0 rgba(accent, 0.28)`. On light, solid 3px bar, no glow.
- **Card (light):** `0 2px 6px -2px rgba(0,0,0,0.08)`. Dark cards are border-driven (no shadow).
- **FAB:** `0 8px 18px -8px rgba(accent,0.45)` (both themes).
- **Active toggle segment:** `0 3px 9px -4px rgba(accent,0.4)`.
- **Ring stroke (dark only):** `filter: drop-shadow(0 0 2px rgba(accent,0.3))` — subtle, optional.

---

## Screens / Views

### 1. Workouts (Lift home) — `app/(tabs)/index.tsx`, Lift mode

- **Purpose:** Browse/select workout routines; create new.
- **Layout:** Status bar → mode toggle → screen title `Workouts` + subtitle `5 routines` → vertical list of routine cards (gap 11) → floating FAB (bottom-right, 20px inset, ~96px above tab bar) → bottom tab bar.
- **Routine card (`AccentCard`):** surface bg, hairline border, `radius.card` (10). Left accent bar = `workout` (faint glow on dark). Left content: title (Archivo 700/16) + sub `N exercises` (sentence case). Right: two **round** 34px icon buttons — **edit** (pencil) and **menu** (3 lines), accent-tinted bg, accent stroke. Cards: Upper (6), Lower (7), Push (5), Pull (6), Legs (8).
- **FAB:** 58px circle, `workoutGradient`, white `+` icon (stroke 2.4).
- **Tab bar:** Log (active = `workout`), Progress, Settings (inactive = `tabInactive`).

### 2. Nutrition (Today's Logs) — `app/(tabs)/index.tsx`, Nutrition mode

- **Purpose:** Review daily intake and logged meals.
- **Layout:** toggle (NUTRITION active, green) → **Daily Intake card** → header row `Today's Logs` + date chip → meal cards → green FAB → tab bar.
- **Daily Intake card:** left = `ProgressRing` (84px, `nutrition`) with center `1052` (Archivo 800/20) over `/ 2200` caption. Right = `1,148 kcal left` caption + three macro bars (Protein 62g/55%, Carbs 73g/42%, Fats 25g/35%): label (`textSecondary` 600/11) + value (`text` 700/11) over a 5px track (`ringTrack`) with accent fill, radius 3.
- **Date chip:** surface bg, hairline border, **pill** (`radius.chip`), calendar icon (green) + `Today` (green 700/11).
- **Meal card (`AccentCard`, green):** title (700/16); calories = big number in `nutrition`/`nutritionInk` (800/17) + `kcal`; **round** edit button (green-tinted). Footer = three `MacroCell`s (flex row, gap 8): value (700/13) over caption `Protein / Carbs / Fats` (sentence case). Data: Chicken and Rice — 350 / 25·45·7; Eggs and Toast — 702 / 37·28·18.
- **FAB:** `nutritionGradient`. **Tab bar:** Log active = `nutrition`.

### 3. Progress (Lift) — `app/(tabs)/progress.tsx`, Lift mode

- **Purpose:** Recovery/fatigue + strength trend.
- **Layout:** toggle (LIFT) → `Today's Fatigue` → fatigue card → row of 3 mini-ring cards → `Strength Graph` + subtitle → chart card → tab bar (Progress active).
- **Fatigue card:** left `ProgressRing` 96px (`workout`) center `82%` (Archivo 800/26); right body copy (`textSecondary` 13/1.5): "Nice work today. You pushed pretty hard — make sure you recover well."
- **Mini cards (×3, equal flex, gap 10):** caption `Last 3 days / 6 days / 9 days`; 58px `ProgressRing` (`workout`, r=50) center % (700/14). Values 27% / 14% / 10%.
- **Strength chart card:** subtitle `Est. 1RM · Barbell Bench Press`; `StrengthChart` — `react-native-svg` line (`workout`, width 2.5, round cap) with vertical gradient area fill (accent 0.45→0 dark / 0.28→0 light), 3 horizontal gridlines (`ringTrack`/`#EDEDF1`), end dot (r 4.5, faint glow on dark); x-axis `Jan Feb Mar Apr`.

### 4. Settings — `app/(tabs)/settings.tsx`

- **Purpose:** Profile, preferences, account.
- **Layout:** screen title `Settings` → profile card → `Preferences` group → `Account` group → tab bar (Settings active).
- **Profile card:** 52px circle avatar with initials `AM` on a `workout→nutrition` gradient; name (700/16) + email (`textSecondary`/12); `PRO` badge (700/9, green, tinted bg, pill).
- **Grouped list:** rounded surface container, rows separated by `divider`. Each `ListRow`: 30px soft-square icon tile (`radius.settingsIconTile`, tinted bg, colored icon) + label (600/14) + optional trailing value (`textSecondary`/13) + chevron. Group label above = sentence case (`labelMuted`).
    - PREFERENCES: **Units** → `lbs · in`; **Appearance** → `Dark`/`Light` (toggles theme); **Macro Goals** (green chip).
    - ACCOUNT: **Help & Support**; **Sign Out** (destructive — red icon + red label, no chevron).

---

## Reusable Primitives (build these first)

| Component                  | Key props                                                         | Notes                                                                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SegmentedModeToggle`      | `mode: 'lift'\|'nutrition'`, `onChange`                           | Track = `toggleTrack`, `radius.toggle` (9). Active segment filled with mode gradient (lift=blue text white; nutrition=green); inactive label `tabInactive`. Labels UPPERCASE 700/13, tracking 0.08em (the one intentional all-caps). |
| `AccentCard`               | `accent`, `glow?`, `children`                                     | surface + hairline + `radius.card` (10); absolutely-positioned 3px left bar in `accent` (+faint glow on dark).                                                                                                                       |
| `ProgressRing`             | `size`, `pct`, `color`, `track`, `stroke`, `children`             | `react-native-svg`. C = 2π·r; `strokeDashoffset = C·(1-pct)`; rotate -90°; round cap. r=52 for 84–96px rings, r=50 for 58px.                                                                                                         |
| `IconButton`               | `icon`, `color`                                                   | **Round** 32–34px, tinted bg (`iconChipBg`), accent stroke.                                                                                                                                                                          |
| `MacroCell`                | `value`, `label`                                                  | `surfaceInset` bg, `radius.macroCell`, centered value over sentence-case caption.                                                                                                                                                    |
| `MacroBar`                 | `label`, `value`, `pct`, `color`                                  | label/value row over 5px track fill.                                                                                                                                                                                                 |
| `ListRow`                  | `icon`, `iconTint`, `label`, `value?`, `chevron?`, `destructive?` | settings row; 30px soft-square icon tile.                                                                                                                                                                                            |
| `BottomTabBar` / `TabItem` | `active`, `accent`                                                | icons: Log (list), Progress (line chart), Settings (gear). Active uses current mode accent (or `text` on Settings).                                                                                                                  |
| `Fab`                      | `gradient`, `icon`                                                | 58px circle, gradient + restrained colored shadow.                                                                                                                                                                                   |
| `Caption`                  | `children`                                                        | text style: Archivo 500–600, sentence case, `labelMuted`.                                                                                                                                                                            |

## Interactions & Behavior

- **Mode toggle:** switches Lift/Nutrition; the existing smooth mode transition stays. Accent color across toggle, FAB, active tab, and accent bars switches blue↔green.
- **Appearance row:** flips `ThemeContext` light/dark; all tokens resolve from theme so no per-screen work.
- **Tab bar:** navigates Log / Progress / Settings (Expo Router tabs); active tab tinted to current mode accent.
- **Icon buttons / FAB / rows:** existing handlers (edit, menu, add, navigate) — restyle only, keep behavior.
- **Rings/bars/chart:** driven by existing computed values (Mifflin–St Jeor goals, Epley 1RM, fatigue) — bind to current data, restyle the presentation.

## State Management

No new state. Reuse: theme/colorScheme (`ThemeContext`), mode (lift/nutrition), nutrition logs + goals (`NutritionContext`), workouts (`WorkoutContext`), fatigue/1RM series (`GraphComponents`). Animated values for transitions can stay as-is.

## Assets

No raster assets required — all icons are simple line glyphs (recreate with `react-native-svg` or your existing icon set: pencil, 3-line menu, plus, calendar, list, line-chart, gear, log-out, sliders, target, moon/sun). Avatar is initials on a gradient. Font: Archivo (Google) — Space Mono is no longer used.

## Files

- `PLATES Restyle.dc.html` — the high-fidelity reference (open in any browser). Scroll: top row = **Refined · Dark**, second row = **Refined · Light**; columns are Workouts / Nutrition / Progress / Settings.
- Target files to modify in the app: `app/(tabs)/index.tsx`, `app/(tabs)/progress.tsx`, `app/(tabs)/settings.tsx`, plus components under `components/WorkoutComponents`, `components/NutritionComponents`, `components/GraphComponents`, `components/NeutralComponents`, and tokens in `context/ThemeContext/colors.ts`.

## Suggested order

1. Tokens → `colors.ts` (both palettes) + load Archivo.
2. Primitives (table above).
3. Workouts → Nutrition → Progress → Settings, one screen per PR, styling-only changes.
