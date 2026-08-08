# SettingsContext functions tests

## Logic kind

Mixed, by file:

- **Formulas** — `macroCalculation.test.ts`, `calculateCalorieTarget.test.ts`, `derivedPace.test.ts`,
  `splitMacros.test.ts`: Mifflin-St Jeor and the preset splits have answers outside the app, so every
  expectation is a reference value computed by hand, never by running the code. Bar: exhaustive against
  the source, 8–15 per file.
- **Business rules** — `computeBwUpdate.test.ts` (the Issue 8 weigh-in rules), `bodyWeightFunctions.test.ts`
  (chart windowing), `belowCalorieMinimum.test.ts` (the one adequacy rule, walked one kcal either side of
  both gender lines), `projectGoal.test.ts`
  (the always-derive projection policy: weeks from the calorie target in play, never the stored pace;
  maintain's fixed 12-week horizon; and the null/"—" guard that keeps a derived 0 away from
  `weeksToGoal`'s 1 lb/week fallback — persona maintenances hand-computed; the guard checks the
  post-`lbsToKg` display pace, not the raw lb one, so a metric pace too small to round above 0.0 kg/week
  also renders "—" instead of tripping the fallback), and `wontReachGoal.test.ts` (the direction rule: at
  or across maintenance warns, delegating to `derivedPace` so the warning card and the dateless projection
  can't drift apart; boundary walked one kcal either side on both a cut and a bulk; maintain never warns;
  the predicate takes `unitSystem` and re-runs `derivedPace`'s result through `lbsToKg` on the metric path
  — the same conversion `projectGoal` guards on — so a real-but-sub-0.1kg pace that displays as 0.0 still
  warns instead of silently agreeing to disagree with the "—" the projection renders), and
  `macrosWereEdited.test.ts` (the rule deciding `macrosCustomized`, which is what stops the next weigh-in
  regenerating over a typed card: any one of the four goals differing counts, and the computed side is
  rounded because both plan screens seed their editable state that way — an unrounded formula output must
  not read as an edit nobody made).
- **Validation** — `validator.test.ts`: accept once, then attack the boundary.

## Harness

Direct calls on pure functions with hand-built `Settings` objects — no provider, no renderer, no DB.

## Fixtures

Each file rolls its own `makeSettings(overrides)` builder. That duplication is deliberate: Jest's default
`testMatch` collects **every** file under `__tests__/`, so a shared `fixtures.ts` here would be picked up
as an empty test suite and fail the run.

Files whose math depends on age also carry `birthDateForAge(age)` — mid-month, ~6 months back, minus the
age — because `calculateAge` runs on the wall clock: an absolute birthDate silently ages the fixture every
year and rots every hand-computed expectation, and a boundary-day date flips ages on birthdays.

## Non-obvious cases

- **The 799 / 800 / 801 trio uses a metric body** (F 30y · 160cm · 70kg · sedentary): BMR = 1389 exactly, so
  maintenance (1666.8) is exact by hand and paces can be chosen to land raw targets on each. An imperial
  body's `/2.20462` conversion makes exact boundary values unreachable. The three now march straight
  through where the old 800 clamp sat — that is the point of keeping them.
- **The degenerate fence**: F age 90 · 24in · 50 lb drives BMR negative (−3.2); every goal must fence at 1
  because `GraphStats` divides by the goal. With no adequacy clamp above it, that fence is the only guard.
- **The round-trip bound is < 0.001 lb/week** because the only error source is the target's integer
  rounding: ≤ 0.5 kcal / 500. Fixtures avoid raw targets sitting exactly on .5.
- **Nothing clamps for adequacy any more.** `calculateMacros` delegates to `calculateCalorieTarget`, so the
  two agree by construction — pinned directly in `macroCalculation.test.ts`. 1,500/1,200 survives only as
  the `belowCalorieMinimum` predicate the warning surfaces read, so a sub-minimum target is stated honestly
  and warned about rather than silently rewritten.

## Known gaps

- Metric conversion of `derivedPace`'s result now happens inside `projectGoal` (`lbsToKg` before the weeks
  division) and is pinned by its metric case; screens no longer convert at call sites.
- The new functions are not yet exposed through the SettingsContext provider, so no provider-memo identity
  coverage exists for them (`providerMemo.test.tsx` covers only current members).
- `isImperial` having no default on `calculateCalorieTarget` is a compile-time contract; nothing at runtime
  pins it.
