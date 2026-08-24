# settingsScreens tests

## Logic kind

Mixed — each file covers a different screen-level guarantee, not a shared function:

- `subscription.test.tsx` — state & concurrency (a purchase surviving the screen unmounting
  under it; CTA enablement gated on identity proof).
- `devStatsModal.test.tsx` — state & concurrency (the `__DEV__` route guard renders nothing in
  a production build).
- `howNutritionIsCalculated.test.tsx` / `howGraphsWork.test.tsx` — presentation, but of an
  unusual kind: the screens display static copy that *restates* real constants and formulas
  owned elsewhere (`macroCalculation.tsx`, `oneRepMaxFunctions.tsx`). These are drift guards,
  not screen-behavior tests — every assertion is cross-checked against the real exported
  function/constant, never a second hardcoded copy of the number.

## Harness

All four render the real screen with `react-test-renderer`'s `create`/`act` inside the real
`ThemeProvider` (no snapshot testing — assertions read specific `Text` nodes or flattened
rendered copy). `subscription.test.tsx` additionally mocks `react-native-purchases`,
`@/context/BillingContext`, and several visual-only deps that drag in native modules the
renderer cannot host, and spies on `Alert.alert`. The two info-screen tests need no mocking beyond the
global `react-native-safe-area-context` mock in `jest.setup.js` — neither screen touches
navigation, billing, or an icon library.

## Fixtures

The info-screen tests build a full `Settings` object locally (`makeSettings`, same shape as
`macroCalculation.test.ts`'s own helper) so `calculateCalorieTarget` can be called directly as
the oracle for what the screen should say.

## Non-obvious cases

- `howNutritionIsCalculated.test.tsx`'s pace-step assertions compare *differences* between
  `calculateCalorieTarget` calls (e.g. `targetAt(0.5) - targetAt(1)`) rather than one absolute
  value against a hardcoded 250/500/750/1,000. `round(x − n) === round(x) − n` for any real `x`
  and integer `n`, so the differences hold exactly regardless of the fixture's (unrounded,
  never-asserted) maintenance — no floating-point tolerance needed.
- `howGraphsWork.test.tsx` solves the Epley coefficient from two calls to the real `estimate1RM`
  (`reps = 2`, since `reps === 1` is a special case that returns the weight unmodified) instead
  of hardcoding `0.0333` — the only way to actually catch a retune of that formula.
- `FormulaPanel` splits each formula line into one `<Text>` per operator/operand
  (`InfoPage.tsx`'s `OPERATOR_SPLIT`); `allText` in both info-screen tests flattens every `Text`
  node found by `findAllByType`, including the un-splittable parent line (which stringifies to
  `[object Object]` noise) — harmless for a `.toContain` check, since the real substrings still
  appear intact from the per-token children.

## Known gaps

- The info-screen tests cover the low-calorie thresholds, the activity-multiplier ratios, the
  pace→kcal step, and the Epley coefficient — the four *real* shipped constants the screens
  restate. The macro-split percentages (30/30/40 etc.) and the MiniBars/MiniLine diagram values
  are deliberately not pinned: the splits are private to `MACRO_PRESETS` in
  `macroCalculation.tsx` (not exported, and re-deriving the percentages from grams would just be
  re-testing `splitMacros`), and the MiniBars/MiniLine values are explicitly diagram shapes only
  per both screens' own header comments, not restated constants.
- Neither test renders in dark mode specifically — `ThemeProvider` defaults its scheme, and
  nothing here asserts on color. Contrast is a visual concern, not a copy-drift one.
