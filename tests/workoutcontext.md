# WorkoutContext

## What was tested

The workout logging modal, rendered for real against the real theme provider and the real
progression engine. Router, user contexts, and the date-picker sheet are faked; log history is
injected as fixture rows spanning multiple days.

**Hardest to prove:** backfilling an old day with a set that exactly matches that day's own
target — the case that used to light the goal-hit banner for a day the user never trained.

## What these tests prove

- Logging a set to a past day never shows a goal-hit — the hit banner only responds to sets
  logged today.
- Backfilling an old day never swaps the suggested set onto that old day's numbers; the
  suggestion keeps following the most recent session.
- Adding a log with the date picker on a past day still saves the set to that day.
- A brand-new exercise shows the first-time calibration message no matter which day the picker
  is on.
- On a normal day the suggested set shows before logging, and beating it flips to the goal-hit
  state carrying the next session's set.

## Not proven

- The progression engine's own rules (which session holds the bar, off-day holds, weight jumps,
  staleness, grading) have a full module suite, but their guarantees are not yet written up in
  this file.
- Fatigue, volume, and one-rep-max behaviour: suites exist in the module folders; no area
  write-up yet.
- Log persistence — insert, delete, and sync round-trips — is not covered here.

Area: context/WorkoutContext · 5 cases · reviewed 2026-07-30
