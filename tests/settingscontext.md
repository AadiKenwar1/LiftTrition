# SettingsContext

## What was tested

The pure functions behind the settings model — calorie and macro math, the weigh-in update rules,
weight-chart windowing, and input validation — called directly with hand-built settings objects. No
provider, no screens, no database; reference numbers for the calorie math were worked out by hand from
the published formula, never read back from the code.

**Hardest to prove:** a chosen pace surviving the calorie rounding invisibly (< 0.001 lb/week), now that no
clamp can absorb the error; goal-reached prompting being level-triggered with a mutable, re-arming mute
rather than a one-shot.

## What these tests prove

- Daily calories follow Mifflin-St Jeor, and a maintain goal anchors to the goal weight — weigh-ins never
  move a maintain user's targets.
- No calorie target is ever adjusted for adequacy. Whatever pace the user picks is priced honestly and
  stated in full — a deep cut lands where the arithmetic puts it, however far below the daily minimums —
  and macro grams are split over that same number, so they always reconcile with the calories shown.
- 1,500 (men) / 1,200 (women) is now advisory only: the app can say a target is under a body's daily
  minimum, one kcal either side of each gender's own line, and each gender reads its own number. Landing
  exactly on the line is not under it.
- The app also warns when a plan points the wrong way for the goal: a cut sitting at or above maintenance,
  or a bulk at or below it, is flagged before the user leaves onboarding. It fires on exactly the plans
  whose projection has no date to show, including on a metric plan whose derived pace is real but too
  small to round above 0.0 kg/week, and a maintain goal never triggers it — eating at maintenance is the
  goal there.
- The two entry points into the calorie number cannot disagree — the macro pass and the target pass return
  the same figure for every goal type, which is what lets the pace slider quote what the plan screen commits.
- Legal-but-degenerate bodies still can't produce a zero or negative target; a single 1 kcal fence is now
  the only thing holding that, on every goal.
- The pace a calorie target implies matches the chosen pace to within 0.001 lb/week at any pace including
  the fastest, and reads zero (never negative) when the calories point away from the goal.
- Every quoted goal date now derives from the calorie target in play, never from the stored slider pace:
  a hand-edited calorie number moves the quoted weeks, calories pointing away from the goal produce "—"
  instead of a fabricated date (the divide-by-pace fallback is provably never reached), a maintain plan
  keeps its fixed 12-week horizon whatever the calories say, a kg body's weeks are divided in kg, and a
  metric pace too small to round above 0.0 kg/week also renders "—" rather than tripping the fallback.
- A target the user typed is recognised as theirs: any one of the four goals differing from what the
  formula produced marks the plan as hand-tuned, while a plain walk-through does not — which is what
  decides whether the next weigh-in may regenerate over it. Rounding the formula's own output can never
  count as an edit.
- A weigh-in never flips the goal or the chosen pace, and hand-tuned macros survive both weigh-ins and the
  consented switch to maintenance. Crossing the goal asks — and keeps asking at or past it — unless muted,
  and the mute re-arms after bouncing back.
- The weight chart starts at onboarding (or the earliest entry), carries the last known weight across
  gap days, clamps to the last year, and never opens with a false zero.
- Heights and weights below the published minimums, and any NaN / non-finite / negative entry, are
  rejected; macro edits only need to be finite and non-negative — no floor, by design.

## Not proven

- Screen wiring is proven in the screens' own suites, not here: the wizard's final step and the onboarding
  projection prove they render what the shared projection returns; the paywall's goal line uses the same
  function but has no render test (mounting it would drag in the billing stack).
- That the warning is actually *shown* is not proven here. This suite pins the predicate; whether
  `LowCalorieWarning` or `WontReachGoalWarning` mounts on the pace, plan, adjust-nutrition and profile
  screens is screen wiring, and has no render test yet. The profile screen carries the adequacy warning
  but not the wrong-direction one: it edits one goal at a time against no projection, so there is no
  quoted date for a direction warning to explain there.
- Provider-level guarantees (memo identity for the new functions, persist/rollback of settings writes) are
  outside this suite.

Area: context/SettingsContext · 151 cases · reviewed 2026-08-06
