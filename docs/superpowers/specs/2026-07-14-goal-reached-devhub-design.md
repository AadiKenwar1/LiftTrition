# Goal-Reached Dev Hub Variants (Issue 8 preview) — Design

Date: 2026-07-14
Status: IMPLEMENTED 2026-07-14 — the real fix shipped per
docs/superpowers/plans/2026-07-14-issue8-goal-intent.md (rules live in
context/SettingsContext/functions; the Dev Hub sim delegates to them). Pending at
release: run lib/supabase/migrations/settings_goal_intent_flags.sql in Supabase.
Refinement 2026-07-15 (plans/2026-07-15-goal-prompt-host.md): the prompt is now
raised as transient context state (pendingGoalPrompt) and hosted once by
GoalPromptHost in the root layout — the weigh-in sheet always closes first, the
card opens after the dismiss animation (InteractionManager), persists until
answered (no AppState dismiss, decided in review), and every weigh-in entry point
(updateBWModal + adjustMeasurements) gets it for free.

## The rule being previewed

TARGETS ARE DERIVED, INTENT IS OWNED. Weigh-ins recalculate calorie/macro targets for
the user's CURRENT goal but never flip goalType or reset pace. (Revised 2026-07-15:)
Automation NEVER changes direction — it asks via the level-triggered prompt and
reminds via the persistent banner; every goalType change is a user tap.

## Agreed behavior (refined from the audit plan during review)

Goal-reached prompt (REVISED 2026-07-15 — level-triggered): any weigh-in landing
at/past goalWeight (lose/gain only) fires the 3-option prompt, from ANY screen (it
is hosted globally). It asks again on every such weigh-in until answered. Prompt
condition = banner condition + !goalOvershootAcknowledged.

| Prompt answer            | Effect                                                        |
| ------------------------ | ------------------------------------------------------------- |
| Switch to Maintenance    | goalType='maintain' immediately, with consent; targets regen anchored at goalWeight (respecting macrosCustomized) |
| Set a New Goal           | routes to adjustNutrition wizard; new goal re-arms everything |
| Keep Going               | sets goalOvershootAcknowledged=true → mutes the asking while at/past goal; banner stays (re-arm 2026-07-15: crossing back before goal clears the mute) |
| (scrim/back dismiss)     | nothing changes; banner persists; asks again next weigh-in past goal |

Safety net: REMOVED (2026-07-15). Automation never switches goalType — no deadband,
no auto-maintain, no announcement card. Rationale: the net could only fire on a
weigh-in, and every weigh-in now raises the level-triggered ask wherever it happens
(prompt follows the person), while the banner holds the progress screen — silence is
re-asked, never acted on.

Maintenance anchors (decided 2026-07-14): maintain targets are computed at
goalWeight (the maintain weight), NOT the drifting scale weight. Weigh-ins never
move a maintain user's targets; the displayed goal stays meaningful; mild drift
self-corrects (eating TDEE-at-anchor while heavier is a gentle implicit pull back
— a static target is not automation acting). Lose/gain keep tracking the scale so
the deficit/surplus stays sized to actual TDEE. Real-fix requirement: every
maintain user must have a sane goalWeight anchor — onboarding and the wizard set
it to current weight when maintain is chosen; verify legacy rows.

macrosCustomized: set by hand-editing macros; while true, every implicit recalc
(weigh-in, height/activity edit) preserves the hand-tuned numbers. Cleared only by
explicit regeneration (wizard / accepting a recalc prompt).

goalOvershootAcknowledged: set by "Keep Going"; cleared when goalWeight/goalType
change, and (refined 2026-07-15, specs/2026-07-15-goal-banner-copy-and-rearm-design.md)
by any weigh-in landing back before goal — zero-margin re-arm, so re-reaching the
goal asks again. Both flags become settings columns in the real implementation.
Deploy note (verified 2026-07-14): sync rules use SELECT * on settings (reference
copy: lib/powersync/sync-rules.yaml), so the new columns need NO sync-rules change
or PowerSync redeploy — just the Postgres migration (with a touch-update or
mapper-side null→false defaults for backfill, since PowerSync only replicates row
changes) and the EAS build carrying the AppSchema/type/mapper updates.

Banner (pure derived state, no storage): visible while goalType is lose/gain AND
weight is at/past goalWeight. Tap routes to the wizard. Placement (decided
2026-07-14): the progress screen, directly beneath the ActivityBanner, rendered in
nutrition mode only — that's where weigh-ins happen (the body-weight chart's Update
button), so the banner appears right where the state changed. Mounts only WITH the
real fix: today's computeBwUpdate goalType flip would falsify the banner's condition
the moment it crosses.

## Components (built in their final homes, preview-only for now)

- `components/NutritionComponents/GoalReachedBanner.tsx` — ActivityBanner's visual
  language (tinted pill, accent icon, bold label) + chevron, tappable. Trophy icon,
  copy: "Goal reached — set your next goal" (2026-07-15: dynamic — past a display-only
  band of 2 lbs / 1 kg it becomes "N lbs past your goal — set your next goal").
- `components/NutritionComponents/GoalReachedPrompt.tsx` — EditHeightModal's
  scrim/card pattern with a celebratory spring entrance (2026-07-15: single variant;
  the autoMaintain announcement card was removed with the safety net):
  - Trophy, "Goal Reached!", gradient primary "Switch to Maintenance",
    secondary "Set a New Goal", ghost "Keep Going". Scrim tap = plain dismiss.

## Sim logic (dev-only, the porting target for the real fix)

`components/devTest/goalReachedLogic.ts` — pure functions over a `SimState`
(goalType/goalWeight/pace/bodyWeight/targets + the two flags), using the real
`calculateMacros` with a fixed dev profile (male, 28, 5'10"/178 cm, moderate).
`applyWeighIn` returns `{ state, events, prompt }`; prompt actions and hand-tune/
clear-custom helpers are separate pure functions. Unit tests in
`components/devTest/__tests__/goalReachedLogic.test.ts` cover: noise never flips
maintain, crossing both directions, level-triggered re-asking, keep-going silencing,
customized preservation everywhere.

## Dev Hub pages

- `GoalReachedTest.tsx` (route `devTest/goalReached`) — UI variants: theme + unit +
  variant toggles, live banner, prompt launcher, last-action readout.
- `GoalReachedSimTest.tsx` (route `devTest/goalReachedSim`) — interactive sandbox:
  setup (goal type/weights/pace/unit) → reset → log weigh-ins (typed or ±quick-steps
  to simulate scale noise) → real prompt/banner components react → event log shows
  every decision the logic made.

Registration follows the Dev Hub recipe: `app/devTest/goalReached.tsx` +
`goalReachedSim.tsx` `__DEV__` stubs, two `Stack.Screen` entries in `app/_layout.tsx`,
two rows in the DevHub `GROUPS` Components section.
