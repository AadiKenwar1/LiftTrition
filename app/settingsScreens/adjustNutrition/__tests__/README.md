# adjustNutrition wizard tests

## Logic kind

Two kinds in one file. State & concurrency — `adjustNutrition4`'s save step is a guard (log a
weigh-in only when the wizard's weight actually changed) plus an unconditional settings commit;
bar: the guard's full state × event matrix (weight changed / unchanged), not a count. Presentation —
the projection block: the quoted weeks/date come from `projectGoal` against `params.calorieGoal`
(the calories actually leaving step 3, hand-edits included), never the `goalPace` param; a
wrong-direction plan renders "—" with its explanation while Save still commits the params verbatim.
The derivation arithmetic itself is pinned in
`context/SettingsContext/functions/__tests__/projectGoal.test.ts`; this file proves only the wiring.

## Harness

`react-test-renderer`'s `create` inside the real `ThemeProvider`. `useSettings` and `expo-router`
(the `router` singleton's `dismissTo`, plus `useLocalSearchParams`) are jest-mocked with mutable
`mock`-prefixed refs assigned per test; the screen module is `require`d inside the render helper so
the mocks are in place first, matching `workoutScreens/__tests__/logsModal.test.tsx`.
`GoalProjectionChart` (reanimated/SVG-backed) is stubbed to `null` — its own rendering is not under
test here, and the harness elsewhere avoids mounting reanimated-backed components directly (see
`settingsScreens/__tests__/subscription.test.tsx`'s `PressableScale` stub). Copy assertions flatten
every on-screen `Text` via the `allText` helper.

## Fixtures

None shared — each test sets `mockSettings`/`mockParams` directly; the shapes are small enough that
a builder would only hide them. `mockSettings` carries the full body (gender, birthDate via
`birthDateForAge`, height, activityLevel) because the screen derives maintenance from the merged
settings+params state; the fixture body is M 40y · 70in · 200 lb · sedentary → maintenance
2188.12298, hand-computed so the week expectations (1688 kcal → 20 wk, 1188 → 10 wk) have answers
outside the code. `birthDateForAge` exists because `calculateAge` runs on the wall clock — an
absolute birthDate would rot the expectations yearly.

## Non-obvious cases

- The provider-side consequence of this screen's call order — `handleUpdateBw` fired before the
  settings commit, not after — is pinned in
  `context/SettingsContext/__tests__/goalPrompt.test.tsx` ("weigh-in fired before the goal commit"),
  not here. This file only pins the screen's own decision of *whether* to call it.
- "skips the weigh-in when the wizard weight matches the stored one" is the regression case: before
  weight was editable on step 1, this screen never called `handleUpdateBw` at all, so re-running the
  wizard without changing Current must stay a no-op weigh-in-wise even though it now can.
- The maintain case asserts `not.toContain('—')` as an exact element, not a substring — the recomp
  subtitle legitimately contains an em dash mid-sentence; only a standalone "—" stat/date would mean
  the maintain path lost its 12-week horizon.
- "a wrong-direction plan still commits the params verbatim on Save" pins that the derived pace is
  display-only: `setSettings` receives the slider `goalPace` and the edited `calorieGoal` untouched.
- `macrosCustomized` on the commit is threaded from `params.macrosCustomized`, which step 3 sets by
  comparing its own `macroGoals` against the formula's output — not hardcoded false — so a card hand-edited
  on step 3 is protected from `withRegeneratedTargets` on the next weigh-in the same way `profile.tsx`'s
  identical modal already protects a standalone edit. A missing/absent param (any caller that doesn't send
  it) defaults to `false`, preserving the prior always-regenerate behavior for a plain walk-through.

## Known gaps

- `adjustNutrition1`, `adjustNutrition2` and `adjustNutrition3` have no render tests. Step 1's
  seeding/clearing of the target-weight field and its live delta/suggested-placeholder math are
  local, screen-only presentation logic, not state-and-concurrency in a save path.
- `StepProgress`'s `total` never disagreeing between step 1 (computed from local `goal` state) and
  steps 3–4 (computed from `params.goal`) is untested — the two can't drift because `goal` is what
  gets pushed as `params.goal` in the same synchronous `handleNext`, and back-navigation pops the
  pushed routes rather than reusing stale ones, so there is no transition that reaches them with
  different values.
