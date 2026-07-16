# Goal Banner Dynamic Copy + Keep-Going Re-Arm — Design

Date: 2026-07-15
Refines: 2026-07-14-goal-reached-devhub-design.md (issue 8). That spec's rules
stand; this changes exactly two things that fell out of the post-ship review.

## Change 1 — zero-margin re-arm of the Keep-Going mute

Bug: "Keep Going" sets goalOvershootAcknowledged and nothing clears it on the
scale path — hit goal → Keep Going → backtrack above goal → hit goal again =
no prompt. The mute was scoped "forever for this goal"; it should be scoped
"while you remain at/past goal".

Rule: in computeBwUpdate, when the new weight is NOT at/past goal
(!isGoalReached), clear goalOvershootAcknowledged. Zero margin — the mute's
edge is exactly the banner's edge (isGoalReached). Crossing back to the
pre-goal side re-arms the ask; re-reaching the goal prompts again.

Consequences (decided in review):
- Committed cutter (never crosses back): prompted once, muted all the way down. Unchanged.
- Oscillator hovering exactly at goal (169.8 ↔ 170.4): each re-entry re-prompts.
  Accepted cost of zero margin — chosen over a hysteresis band for simplicity
  and because banner state and prompt arming now share one boundary.
- Not the deleted deadband: this gates when a QUESTION reappears; it never
  changes goalType/targets. Existing clears (Switch to Maintenance, wizard
  completion) stay as-is.

## Change 2 — banner dynamic copy (display band)

Bug: the banner reads "Goal reached — set your next goal" even when the user
tapped Keep Going and drifted 15 lbs past — stale, inaccurate.

Rule: a DISPLAY-ONLY band picks which sentence renders (it gates no behavior):

- within band of goal: "Goal reached — set your next goal" (unchanged copy)
- at/past band:        "{N} {unit} past your goal — set your next goal"

Band: 2 lbs imperial / 1 kg metric (`GOAL_COPY_BAND`). Delta = distance past
goal in the user's display unit, rounded to 1 decimal, trailing .0 stripped
("4", "4.5"). No pluralization edge: imperial deltas shown are ≥ 2 ("lbs"),
"kg" is invariant.

Scope: BANNER ONLY. The prompt keeps its single celebratory line — with the
re-arm it fires at the reach moment, where "at your goal" is accurate; drift
copy on the prompt would almost never render (decided in review).

## Implementation shape

- `bodyWeightFunctions.tsx`: re-arm inside computeBwUpdate;
  `GOAL_COPY_BAND` + pure `goalReachedBannerCopy(s)` exported beside
  isGoalReached (same Pick fields + unitSystem).
- `GoalReachedBanner.tsx`: new required prop
  `state: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight' | 'unitSystem'>`;
  label = goalReachedBannerCopy(state). progress.tsx passes `settings`; the
  dev sim passes its structurally-compatible SimState; GoalReachedTest passes
  a literal.
- Dev sim (`goalReachedLogic.ts`): applyWeighIn narrates the re-arm when the
  flag flips false; applyKeepGoing event text scoped to "while you stay
  at/past goal". SimTest chip copy likewise.
- Tests: computeBwUpdate (re-arm, re-reach re-prompt, mute persists while
  past goal, gain mirror, copy helper cases); goalReachedLogic (sim re-arm +
  narration).

No schema/migration change (flag column already exists). No git operations —
user owns version control.
