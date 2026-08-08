# workoutScreens tests

## Logic kind

State & concurrency — modal screens whose risk is guards and derived display state, not markup.
`renameModal` cases cover the submit-once guard and the taken-name check; `logsModal` cases cover
which date the progression indicator is evaluated for. Bar: the state × event matrix for the
guard in question, not a count.

## Harness

`react-test-renderer`'s `create` inside the real `ThemeProvider`. Router and contexts are
jest-mocked with mutable `mock`-prefixed refs assigned per test, and the screen module is
`require`d inside the render helper so the mocks are in place first. `logsModal` additionally
runs under fake timers with system time pinned to noon of a fixed day, so the modal's own
`new Date()` and the mocked `useToday` agree on the calendar day.

## Fixtures

- `renameModal`: local `wk()` builder for minimal `Workout` rows.
- `logsModal`: `buildLogs()` taking `[daysAgo, weight, reps]` tuples — the same SetSpec shape as
  the progression engine suite in `context/WorkoutContext/functions/__tests__/`, built into
  minimal `Log` rows.

## Non-obvious cases

- `logsModal`'s assertions read the props handed to the real `ProgressIndicator`. The modal's
  entire job under test is choosing the evaluation date for `getIndicatorState`, so those props
  are the output.
- In the false-goal-hit case the expected goal is 105×9 (off yesterday's session), not numbers
  from the backfilled day. A backfilled day may legitimately become the anchor — but only by
  being the most recent session before *today*; the indicator must never be evaluated for the
  picker date itself.
- `DatePickerPopup` is stubbed and driven directly through `onConfirm`; the sheet and calendar
  internals are not under test. `LogHistoryList` is stubbed as display-only.

## Known gaps

- The other workoutScreens modals (addWorkout, exercises, notes, archive) have no render tests.
- `logsModal`'s post-add highlight/scroll behaviour is untested — timers are deliberately never
  advanced.
