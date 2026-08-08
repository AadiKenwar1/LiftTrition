# paceIssue — the calorie floor makes the pace slider lie

_Rev 3 — final plan, 2026-08-04. Supersedes rev 2 (2026-08-03): the analysis and evidence stand unchanged;
the design is simplified. Rev 2's flag-conditional projection is replaced by **always-derive**, the stored
pace is never system-mutated, and the weigh-in prompt plumbing is cut from scope. Nothing coded. Test cases
come first, per repo convention._

_Rev 4 — scope widened, 2026-08-04. Rev 3's §1–§5 are unchanged and remain the source of truth for the floor
and the pace slider. A separate accuracy review of the same file adds two changes, carried here rather than in
their own doc because both edit `macroCalculation.tsx` and because §6 moves `maintenance` — the one input
§1–§5 all read. They are §6 (activity multiplier) and §7 (macro allocation). Nothing coded._

_Rev 5 — scope narrowed, 2026-08-05. §6's factor retune is dropped: the shipped 1.2–1.9 ladder stays, and the
dev wizard already computes on identical values, so §6 reduces to a copy-only reword and no longer moves
`maintenance`. §7 gains the activity-level term the dev implementation carries (base g/kg by goal plus an
activity bump) and takes the dev numbers wholesale. The ~25% deep-deficit warning trialled under rev 4 is
removed — scope, logic, and UI._

_Rev 6 — persona audit outcomes, 2026-08-05. A 20-persona maintenance sweep through the dev wizard math,
reviewed blind by an external nutrition pass, lands three decisions. §7's fat clamp retunes: the per-kg floor
rises to 0.6 (margin over the bare 0.5 hormonal minimum the heaviest bodies sat exactly on) and gains a 35 g
absolute floor for bodies so small that per-kg arithmetic under-prescribes. §2's maintain target gains a 1,200
adequacy floor — `maintenance` itself is still returned raw; only the stated target is floored, and the lose
and gain fences are untouched (the landed `calculateCalorieTarget` maintain fence `max(1, …)` becomes
`max(1200, …)` at adoption; `devCalorieTarget` already carries it). Protein's basis stays total bodyweight,
deliberately: adjusted-body-weight scaling and a BMI-30 basis cap were reviewed against the literature and
declined — g/kg of bodyweight is the convention the guidance itself is written in._

_Rev 7 — protein grid retuned to the gym ladder, 2026-08-05. §7's rule shape, basis weight, fat floors and
reconciliation are untouched; only the two protein maps move. Bases rise 0.1 (lose 2.2, maintain/gain 1.8) and
the activity rungs widen from 0.1 to 0.2 (sedentary −0.2 · light 0 · moderate +0.2 · active +0.4 ·
gymrat +0.6), restating the grid as the familiar gym ladder: maintain runs 0.73–1.09 g/lb and the cut
0.91–1.27, with 1 g/lb (2.2 g/kg) landing at active-maintain and light-cut. The sedentary column is unchanged,
so the heavy sedentary bodies rev 6's review flagged as protein-rich gain nothing — only training tiers rise —
and the top rows ride above the ~1.6 g/kg research plateau as deliberate insurance, a product choice over the
strict-evidence tune._

_Rev 8 — protein flattened to two figures, 2026-08-06. Rev 7's grid is withdrawn along with the activity term
rev 5 introduced. Protein is now **1.1 g per lb of basis weight on a cut and 0.95 maintaining or bulking**,
full stop: no base-plus-bump arithmetic, no activity input, one number a user can check in their head.
`devSplitMacros` loses its `activityLevel` parameter accordingly. Basis weight, the fat floors, carbs-as-
remainder and the proportional scale-down are all untouched. Two consequences worth stating rather than
discovering: protein's share of calories is no longer held steady up the activity ladder (grams are what the
rule pins, so the share falls from ~31% sedentary to ~19% at `gymrat` for a 77 kg maintainer), and the
sedentary column — unchanged across revs 5 through 7 — moves for the first time, up about 21% on a cut
(0.91 → 1.1 g/lb) and 31% maintaining (0.73 → 0.95)._

_Rev 9 — protein back on the activity ladder, 2026-08-06. Rev 8's two flat figures are withdrawn: activity
returns as an input, but as a plain grid of round numbers rather than rev 7's base-plus-bump arithmetic.
**Maintain runs 0.7 · 0.8 · 0.9 · 1.0 · 1.1 g per lb up the five tiers, and a cut carries a tenth more at
every tier (0.8 · 0.9 · 1.0 · 1.1 · 1.2). Bulk reads the maintain column.** Both columns are stored literally,
so no figure arrives via a float addition and every cell is a number a user can check in their head.
`devSplitMacros` takes `activityLevel` again. Basis weight, the fat floors, carbs-as-remainder and the
proportional scale-down are untouched, as is rev 8's half-gram tie fix. This is the rev that finally moves the
heavy sedentary bodies rev 6's review flagged: the 310 lb sedentary maintainer drops from 295 g (44% of
calories) to 217 g (32%), carbs recovering from 1.34 to 1.90 g/kg, while the extremely active athlete rises
from 219 g to 253 g. Across all twenty maintenance personas protein now spans 1.53–2.43 g/kg and 20–32% of
calories, against rev 8's 2.08–2.10 g/kg and 21–44%._

_Rev 10 — the maintain adequacy floor is withdrawn, 2026-08-06. Rev 6's `max(1200, …)` on the maintain branch
is gone; the branch is `max(1, round(maintenance))`, identical to shipped `calculateCalorieTarget` again. See
§2 for the full argument — in short, the clamp handed a 92 lb sedentary woman a **176 kcal daily surplus**
against a goal of holding weight, and parked her on exactly 1,200, the one value §4's `calories < threshold`
comparison is silent at, so it suppressed the very warning that justified it. Removing it makes that warning
fire on its own with no new warning code. Consequences: `devCalorieTarget` is now arithmetically identical to
production on all three goals, so `devMacroMath.test.ts`'s parity check walks all three rather than lose
alone; the maintain branch inherits gain's 1 kcal fence, since Mifflin-St Jeor is unbounded below and
GraphStats divides by the goal. Only one of the twenty personas moves — female 1, from a clamped 1,200 to her
true 1,024, with macros 64/35/113. Also this rev, from a blind review of the persona tables: the metric
conversions printed there were rounded too coarsely to reproduce their own kcal figures (5'7" is 170.18 cm,
not 170), and the fat-floor and gram-rounding columns now carry the one-line explanations they were being
misread without._

_Rev 11 — a cut's protein basis moves to the scale weight, 2026-08-06. `basisWeightKg` read `goalWeight` on
`lose`; it now reads `bodyWeight`, matching what `gain` already did, so **only `maintain` still prescribes
against the goal weight** — and its line is `maintenanceCalories`' `weightForTargets` verbatim, keeping the
protein basis and the calorie basis on the same weight there. Rationale in §7: the lean mass a cut defends is
the mass on the scale today, and the prescription should fall with the weigh-ins rather than sit at the
target's number the whole way down. The withdrawn guard is worth naming — `goalWeight` on `lose` was what kept
a very heavy cutter off a prescription scaled from total mass, and nothing replaces it. Measured effect at the
extreme: the 310 lb sedentary persona cutting at 2.0 lb/wk goes from 232 g to 248 g of protein, which tips
protein-plus-floored-fat past the 1,697 kcal target and triggers the proportional scale-down — so that body
now lands on 240 g / 82 g / 1 g of carbs, silently, since §4's warnings key on calories and this target clears
every one of them. Heavy cutters are the population that change moves, and the silent scale-down below is the
open item it runs into._

## The short version

The user picks a pace on the slider ("2 lbs per week"). Every screen after that divides the distance to their
goal weight by that number to quote a date. But the calorie calculator has a **floor** — today it will not set a
target below 1,500 kcal (male) / 1,200 kcal (female) — and for a lot of people the pace they picked would
require going under it. The floor wins, the deficit gets shrunk, and nobody tells the projection. So the app
quotes a date it will never hit.

Worst case found: a small sedentary woman who asks for 2 lbs/week on a 20 lb goal is quoted **10 weeks**. Her
actual delivered rate is 0.21 lbs/week, so the real answer is **95 weeks**.

The fix, in one breath: **the floor drops to 800 (lose only) so the promise becomes deliverable, the slider max
is capped at what 800 allows so undeliverable positions stop existing, projections always derive pace from the
actual calorie target so every date is honest by construction — including hand-edits and weigh-in drift — and
the health story moves from a silent clamp to visible warnings.** The stored pace is a pure input: only the
user's own slider commits ever write it, and no projection reads it raw.

## The five decisions (owner, 2026-08-04)

1. **800 threshold** — widens the honest slider range for most people and makes negative targets impossible by
   construction (cap ⇒ deficit ≤ maintenance − 800).
2. **Cap the sliders** so no position under 800 kcal is selectable.
3. **Warnings, not blocks, below 1,200/1,500** — plus a "won't lose at these calories" warning on the high side.
4. **Never system-change the stored pace; always derive projection pace from calories** — one code path, no
   `macrosCustomized` conditional in any projection. Fixes hand-edits and drift in the same stroke.
5. **Shared functions as the source of truth** — screens call the same math instead of trusting passed params.

Settled sub-decisions:

- **Profile's "Goal Pace" row keeps showing the stored pace** (`profile.tsx:264`). Framing: profile shows what
  you *set* (it has a pencil, it opens the wizard, the wizard slider seeds from the same number); projections
  show what you'll *get*. A hand-editor's slider being stale is expected. No "editing calories changes pace"
  copy — it would be wrong on the drift path, where calories hold still and the derived pace moves anyway.
- **Derived pace ≤ 0 clamps to 0 and never reaches `weeksToGoal`** — its `pace > 0 ? pace : 1` fallback
  (`goalMath.ts:11`) would silently substitute 1 lb/week and fabricate a date. 0 renders as "—" plus a warning.
- **Weigh-in prompt plumbing is out of scope** (rev 2 §6's crossing detection, `GoalPromptHost` branching,
  union widening). The provider currently discards `computeBwUpdate`'s prompt, so this is real plumbing work,
  and always-derive already keeps the visible projection honest as weight drifts. Revisit separately.

## What rev 3 drops from rev 2, and why

- **Flag-conditional derivation** (stored pace when `macrosCustomized` off, derived when on) → **always
  derive**. For slider users the two agree to three decimal places anyway (calories were computed *from* the
  slider, rounded to a whole kcal ⇒ error < 0.001 lb/week — invisible at one decimal). One path, no flag read,
  and it stays honest even where the flag is broken (`plan.tsx` forgets to set it — see Adjacent bug).
- **Re-capping the stored pace on weigh-in regeneration** → deleted. Nothing displays the stored pace raw
  except the profile row (which is *defined* as showing the setting), so a stale stored pace is harmless. Fewer
  background writes; `settings.goalPace` is written only by pace.tsx / adjustNutrition2 commits.
- **Weigh-in low-calorie prompts** → cut (above).
- **`paceLabel` switch to absolute thresholds** → reversed; fraction-of-max stays. Under a *real* ceiling,
  "Very fast" at your personal max is true. Rev 2's objection assumed the label lying about deliverability;
  the cap removes the lie.

## Why rev 1's fix was rejected

Rev 1 capped the slider at the health floor: `min(3, (maintenance − 1,500/1,200) / 500)`.

- It guts the slider for exactly the users it triggers for. F 5'4" 150 lb sedentary maxes at **0.9** — she
  cannot pick the 1.0 default. F 5'0" 115 lb 45 sedentary maxes at **0.2** — a two-position slider.
- It hard-blocks aggressive-but-physically-real choices. Product decision (owner, 2026-08-03): users may choose
  any goal; the app warns instead of blocking.
- Rev 1's central claim — "nothing downstream changes, requested == delivered by construction" — is false under
  *any* floor. Two divergence paths exist that no slider cap can ever fix, and they are why derivation returns:
  - **Hand-edited calories.** The plan screen, wizard step 3, and profile all let the user type any calorie
    number; the projection reads `goalPace` and never notices.
  - **Weigh-in drift.** Maintenance falls as weight falls; a pace that was honest at selection goes quietly
    stale. (Weigh-ins deliberately never reset pace — Issue 8 rules in `bodyWeightFunctions.tsx`.)

## Where it lives (facts)

- `context/SettingsContext/functions/macroCalculation.tsx` — Mifflin-St Jeor BMR → `× activityFactor` → TDEE →
  `dailyAdjustment = (goalPace * 3500) / 7` applied → **`calResult = Math.max(minCalories, Math.round(TDEE))`**
  where `minCalories = settings.gender === 'male' ? 1500 : 1200`. Activity factors: sedentary 1.2, light 1.375,
  moderate 1.55, active 1.725, gymrat 1.9.
- `TDEE` is **mutated in place** by the adjustment, so the maintenance value is destroyed and never returned.
  The split below fixes this; capture maintenance as a `const` **before** the adjustment or the refactor
  silently returns maintenance == target.
- The clamp sits **before** the macro split so the grams reconcile with the shown calorie target. That
  placement survives rev 3 — the 800 clamp must also precede the split; `macroCalculation.test.ts:75-80` pins it.
- `lib/utils/goalMath.ts` — `weeksToGoal(goalType, currentWeight, goalWeight, pace)` = `|current − goal| / pace`,
  with a `pace > 0 ? pace : 1` fallback. **Unchanged in rev 3**; the contract becomes "callers never pass ≤ 0",
  enforced by the "—" guard at each caller. `goalMath.test.ts:12-14` blesses the fallback — leave it pinned as
  the dead-man's guard it now is.
- Three `weeksToGoal` callers, all quoting the requested pace today: `app/onboardingScreens/projection.tsx:28`,
  `app/onboardingScreens/paywall.tsx:48`, `app/settingsScreens/adjustNutrition/adjustNutrition4.tsx:38`.
- `app/onboardingScreens/pace.tsx` — slider range is a fixed `{ min: 0.1, max: 3 }` imperial /
  `{ min: 0.1, max: 1.5 }` metric. Stored in lb/week always. Note 1.5 kg = 3.3 lb quietly exceeds the imperial
  3.0 ceiling; the computed cap unifies them.
- `app/settingsScreens/adjustNutrition/adjustNutrition2.tsx` is a byte-identical clone of the slider
  (`RANGES` + `paceLabel` duplicated verbatim). It reads wizard **params**, not settings.
- **The wizard's merge pattern already exists**: `adjustNutrition3.tsx:42-51` builds
  `{ ...settings, ...wizard params }` and calls `calculateMacros` — saved settings supply gender/birthDate/
  activityLevel (the wizard never edits them), params supply the not-yet-saved height/weight/goal/pace. Step 4
  copies this exact pattern to derive; its params carry `calorieGoal` from step 3 **including hand-edits**
  (`adjustNutrition3.tsx:70-76` → `:88`).
- `adjustNutrition4.tsx:17-28` params lack gender/birthDate/activityLevel — deriving from params alone is
  impossible; it already has `useSettings()` on line 13.
- `profile.tsx:260-268` — the "Goal Pace" info row: stored pace, unit-converted, pencil → adjustNutrition1.
- Production onboarding order is `goals → obstacles → activity → goal → aboutYou → pace → …`, so every input
  the calculation needs exists by the time the pace screen renders.
- Coupling sweep (2026-08-03): the provider **discards** `computeBwUpdate`'s returned prompt
  (`SettingsContext/index.tsx:107` consumes only `.newSettings`). `profile.tsx:63,67` and
  `adjustTraining.tsx:32,36` call `withRegeneratedTargets` directly — regeneration happens without a weigh-in.
  `validateMacro` rejects only negative/non-finite, so manual entry has no floor — kept deliberately.

## Who actually hits it

Maintenance and honest max pace, computed against the real formula. Honest max = `(maintenance − floor) / 500`,
floored to the slider's 0.1 step.

| Person | Burns/day | Honest max @ 1,500/1,200 | Honest max @ 800 |
|---|---|---|---|
| M 6'2" 230lb 25 gym-rat | 3,986 | 4.9 → capped 3.0 | 3.0 |
| M 5'10" 200lb 40 moderate | 2,826 | 2.6 | 3.0 |
| M 5'10" 200lb 40 sedentary | 2,188 | 1.3 | 2.7 |
| M 5'8" 170lb 55 sedentary | 1,897 | 0.7 | 2.1 |
| F 5'6" 170lb 30 light | 2,073 | 1.7 | 2.5 |
| F 5'4" 150lb 30 sedentary | 1,662 | 0.9 | 1.7 |
| F 5'0" 115lb 45 sedentary | 1,306 | 0.2 | 1.0 |

At the old floor, six of seven could not reach the slider's max and two could not reach the **default** — this
was never an edge case. At 800, **everyone in the table keeps the 1.0 default**, and the worst realistic slider
(F 4'10" 90 lb 70 sedentary, maintenance 982) still gets a real 0.1–0.3 range.

Quoted vs. real weeks on a 20 lb goal at the old floor (kept as evidence of severity):

| Person | Requested | Quoted | Real |
|---|---|---|---|
| M 5'8" 170lb 55 sedentary | 1 lb/wk (**the default**) | 20 wk | 25 wk |
| F 5'4" 150lb 30 sedentary | 1 lb/wk (**the default**) | 20 wk | 22 wk |
| M 5'10" 200lb 40 sedentary | 2 lb/wk | 10 wk | 15 wk |
| F 5'4" 150lb 30 sedentary | 2 lb/wk | 10 wk | 22 wk |
| F 5'0" 115lb 45 sedentary | 2 lb/wk | 10 wk | **95 wk** |

## The plan (rev 3, final)

### 1. Shared functions — the source of truth

All in `context/SettingsContext/functions/macroCalculation.tsx`, exposed through SettingsContext **at module
scope**, added to both the provider memo object and its dep array (`providerMemo.test.tsx:206` pins reference
stability; an inline closure would re-key it).

- `calculateCalorieTarget(settings, isImperial) → { maintenance, target }` — maintenance captured **before**
  the adjustment and returned raw (never floored); `calculateMacros` consumes it and keeps only the percentage
  split. No default for `isImperial`. **`Math.round` lives inside the function** — `withRegeneratedTargets`
  writes the result into `calorie_goal INTEGER`, and an unrounded value diverges local SQLite from Postgres.
  Small positive fence on the result: validator-legal degenerate inputs (24 in / 50 lb / age 89+) drive
  BMR ≤ 0, and `GraphStats.tsx:28-31` divides by the goal.
- `maxPace(settings) → lb/week` — lose only: `min(3, (maintenance − 800) / 500)` rounded **down** to the 0.1
  step, lower-bounded at the slider's 0.1 min. Computed in lb; the kg slider converts the result (which also
  removes the 3.3-vs-3.0 metric asymmetry). Gain sliders keep their full fixed range — no floor interaction.
- `derivedPace(maintenance, calorieGoal, goalType) → lb/week` — lose: `(maintenance − calorieGoal) / 500`;
  gain: `(calorieGoal − maintenance) / 500`; clamped at 0 minimum. Metric displays convert the **result** with
  `lbsToKg`. For slider users this equals the slider to < 0.001 (target is rounded to a whole kcal), so nothing
  visibly changes for them — do not "fix" the rounding.

Every consumer calls these instead of doing local math. Screens that render pre-commit state feed the functions
a synthetic settings object: `pace.tsx` overrides `goalPace` with the live thumb; the wizard screens merge
params over `settings` exactly like `adjustNutrition3.tsx:42-51`.

### 2. The floor: 800, lose branch only

- lose: `target = max(800, maintenance − pace × 500)`. 800 is the VLCD threshold below which mainstream
  guidance requires medical supervision — the app never *computes* a plan below it. With the cap (§3) the
  clamp becomes unreachable from the slider; it survives as the safety net under degenerate inputs and drift.
- maintain: `target = max(1, round(maintenance))` (rev 10, reverting rev 6). No adequacy minimum — the honest
  burn is what gets stated, and a body whose burn sits under the daily minimum is handled by §4's warning
  instead. Rev 6 clamped to 1,200 and accepted the rev-3 objection ("told to eat above maintenance while
  maintaining") as a small overshoot the weight trend would arbitrate. Two things make that the wrong trade.
  It is not small: 92 lb / 4'11" / 68 F sedentary burns ≈ 1,024, so the clamp prescribed **+176 kcal a day,
  ≈ 0.35 lb a week, ≈ 18 lb a year** — a fifth of her bodyweight — to someone whose stated goal was to hold
  weight. And the clamp landed her on exactly 1,200, the one value §4's strict `calories < threshold`
  comparison stays silent at, so it also suppressed the adequacy warning it was justified by. The warning is
  the right instrument for a sub-minimum burn; the clamp bought a silent surplus instead. gain: maintenance +
  surplus, unfloored past its 1 kcal fence — which maintain now shares, since Mifflin-St Jeor is unbounded
  below and GraphStats divides by the goal.
- Manual entry below 800 stays possible and warned — the app won't *recommend* below the line; the user may
  still *choose* past it.

### 3. The slider cap (lose goals only)

- Both sliders (`pace.tsx`, `adjustNutrition2.tsx`) take max from `maxPace`. This deletes only arithmetically
  undeliverable positions — every removed position collapses to the same 800 kcal anyway.
- Initial thumb clamped into the new range (pattern already at `adjustNutrition2.tsx:36-39`); a stored pace
  above the current max shows *at* the max without writing settings.
- 3 lb/week stays the absolute ceiling for everyone.
- `paceLabel` keeps its fraction-of-max buckets — honest under a real ceiling.
- Hoist `RANGES`/`paceLabel` to `context/SettingsContext/functions/` alongside the new functions so the two
  sliders can't drift (CONVENTIONS-AUDIT.md:204's assigned home).

### 4. Readout and warnings — visible, neutral, never blocking

- **Live calorie readout under both sliders**: "≈ 1,412 kcal a day" from the shared function, so it can never
  disagree with the plan screen. With the cap, the readout always matches the thumb.
- **Low warning** below 1,500 (male) / 1,200 (female) — the health story the old floor encoded, now spoken.
  Neutral copy ("below commonly recommended daily minimums"), because small-maintenance maintain users
  legitimately trigger it. Surfaces: under both sliders; on `plan.tsx` and `adjustNutrition3` reacting to the
  current (possibly edited) macro state; inside `EditMacroGoalModal` while typing — one implementation covers
  plan, wizard step 3, and profile edits (the modal needs a threshold prop at its three call sites).
- **High warning** — goal is lose and calories at/above maintenance (or gain and at/below): "at these calories
  you won't reach your goal." Same surfaces as the low warning; it is the explanation for the "—" projection.
- **No weigh-in prompts in this change** (cut — see settled sub-decisions).
- **No deep-deficit warning** (cut, 2026-08-05). Rev 4 trialled a third amber line when a cut exceeded ~25%
  of maintenance — consolation for a rejected proportional pace cap (which re-triggers the rev 1 objection:
  F 30y 64in 150lb sedentary would cap at 0.8, under the 1.0 default). Both are out; the warning set is
  exactly: the 800/VLCD line (hand-edits only), the 1,200/1,500 minimums, and wrong-direction.

### 5. Projections — always derive pace from calories

- All three `weeksToGoal` callers stop passing the stored/param pace and pass
  `derivedPace(maintenance, calorieGoal, goalType)` instead — converted for metric display as today.
- `projection.tsx` and `paywall.tsx` compute from committed `settings` (they render post-commit).
  `adjustNutrition4.tsx` builds `{ ...settings, ...params }` (the `adjustNutrition3.tsx:42-51` pattern) for
  maintenance and derives against `params.calorieGoal` — so a step-3 hand-edit changes the step-4 date
  **before** Save. Roughly 4 lines, copied from the adjacent screen.
- **The 0 guard at every caller**: derived pace 0 → skip `weeksToGoal` entirely, render "—" with the
  no-progress line. Feeding 0 through would trip `goalMath.ts:11`'s 1 lb/week fallback and fabricate a date.
- `macrosCustomized` is **not read** by any projection. Its only remaining role is the weigh-in regeneration
  skip in `bodyWeightFunctions.tsx`, unchanged.
- `settings.goalPace` is never system-written. Behavior over time falls out:
  - Slider user, weigh-in (flag off): targets regenerate from stored pace; if the pace outruns the shrinking
    maintenance, the 800 clamp engages and the derived pace — hence every quoted date — tracks reality.
  - Hand-editor, weigh-in (flag on): calories hold still, maintenance falls, derived pace shrinks on its own;
    at zero deficit the projection shows "—", not a fake date.
- Docblock fixes ride along: `projection.tsx:12-15` ("the estimate is accurate" — soon true, for the right
  reason), `adjustNutrition4.tsx:36`, `goalMath.ts:6-8`, and the Harvard citation at
  `macroCalculation.tsx:52-54` → the 800/VLCD rationale (keep the clamp-before-split placement note).

## Rev 4 — added scope (2026-08-04; narrowed by rev 5)

Rev 4 added §6 (activity multiplier) and §7 (macro allocation), both editing `macroCalculation.tsx`. Rev 5
cut §6 to its copy reword — the factor retune is out, so nothing here moves `maintenance` anymore and no
fixture re-pins ride along. §7 still edits the split and is prototyped in the dev wizard (Dev Hub harness,
below).

### 6. The activity question — copy reword only; factors stay as shipped

**The factor retune is dropped (owner, 2026-08-05).** Rev 4 paired the reword with lower multipliers (light
1.375 → 1.35, moderate 1.55 → 1.45, active 1.725 → 1.60, gymrat 1.9 → 1.75). That is out: the shipped
1.2–1.9 ladder stays, `maintenance` does not move, the "Who actually hits it" table and every pinned fixture
stand unchanged, and no existing user's targets shift. The dev wizard already computes on the shipped
values — its factor map is identical, so its rescale is a pass-through.

**What survives is the reword.** `activity.tsx:37` asks **"How often do you train?"**, but the number the
answer selects is a whole-day PAL multiplier — occupation, commute, incidental movement, and training. The
rows are rewritten to describe the whole day, exactly as the dev `adjustTraining` copy already renders them:
"or" in the middle tiers lets job movement and training substitute for each other, "and" gates the top tier
behind the combination, and "Gym Rat" becomes "Extremely Active" — a description, not an identity. Stored
keys are unchanged, so no schema, sync, or `AppSchema` work:

| key | label | sublabel |
|---|---|---|
| `sedentary` | Sedentary | Sitting most of the day, and little to no exercise |
| `light` | Light | A bit of walking most days, or you exercise 1-3 days a week |
| `moderate` | Moderate | Up and about a fair amount, or you exercise 3-5 days a week |
| `active` | Active | Moving most of the day, or you exercise 6-7 days a week |
| `gymrat` | Extremely Active | Moving all day and you exercise most days |

- Title becomes "How active is your day?"; the subtitle names daily movement rather than the gym.
  `adjustTraining.tsx` renders the same options and takes the same copy.
- **Test cases (before code):** the five sublabels render; title and subtitle name the whole day rather than
  training. No factor cases and no re-pins — nothing numeric moves.

### 7. Macros: protein from bodyweight, not from a percentage

Promoted from "Still open, deliberately unchanged" below. The fix turns out to be a reordering, not a floor
bolted onto the existing percentages.

**The problem.** `MACRO_PRESETS` (`macroCalculation.tsx:11`) makes protein a **fraction of calories**, so
protein tracks calories. Protein need is driven by the lean mass being defended and is roughly fixed for a
given body. The two are inversely coupled, and the failure lands precisely on the cut, where protein is the
primary defence against lean-mass loss:

| 68 kg woman, maintenance 1,800 | target | protein | g/kg |
|---|---|---|---|
| maintain (30%) | 1,800 | 135 g | 1.99 |
| lose 1 lb/wk (35%) | 1,300 | 114 g | 1.67 |
| lose, at the old floor (35%) | 1,200 | 105 g | 1.54 |

ISSN's position stand puts energy-restricted intake at 1.2–2.4 g/kg, and 2.3–3.1 g/kg for resistance-trained
subjects in a deficit. It fails the other way too: a 55 kg woman gaining at 2,400 kcal draws 25% = 150 g =
**2.7 g/kg**, displacing carbs that would fuel training.

**The new order of operations.** Allocate by priority instead of splitting a total three ways:

1. **Protein, from bodyweight and activity** (rev 9) — a grid stated in grams per pound of basis weight, then
   `proteinG = round(weightKg × gPerLb × 2.20462)`:

   | tier | maintain / gain | lose |
   |---|---|---|
   | sedentary | 0.7 | 0.8 |
   | light | 0.8 | 0.9 |
   | moderate | 0.9 | 1.0 |
   | active | 1.0 | 1.1 |
   | gymrat | 1.1 | 1.2 |

   The per-pound figure is the stored constant and the conversion is carried unrounded, so the gram count
   equals the pound arithmetic a user checking the rule by hand would do. Both columns are written out rather
   than derived from one another, so no cell arrives via a float addition. The cut's extra tenth is uniform
   across tiers; the bulk column is the maintain column because a surplus already spares protein. The rounding
   detail that survives from rev 8: a prescription landing on an exact half gram must round **up**, which needs
   the tenth settled first — the pound weight reaches the split as kilograms, and untreated the round trip
   sends 195 lb × 0.7 = 136.5 down to 136 while 145 lb × 0.9 = 130.5 goes up to 131.
2. **Fat, floored** — `fatKcal = max(35 × 9, weightKg × 0.6 × 9, remaining × 0.30)` where
   `remaining = calories − proteinG × 4` (rev 6 constants). The per-kg floor protects hormonal function, at
   0.6 rather than the bare 0.5 g/kg minimum so the heaviest bodies hold margin above the line instead of
   sitting exactly on it; the 35 g absolute floor carries the smallest bodies, where per-kg arithmetic
   prescribes too few grams for essential fats and the fat-soluble vitamins. The 30% share covers every
   normal case. All three are candidates in one max — the largest wins; no body is routed down a different
   rule.
3. **Carbs, the remainder** — `carbKcal = remaining − fatKcal`. Carbs are the training fuel and the flexible
   bucket; this is the standard ordering.

**Which weight** (rev 11). `lose` and `gain` read `bodyWeight`; `maintain` reads `goalWeight` with the same
`goalWeight <= 0 → bodyWeight` legacy fallback `maintenanceCalories` already carries (`macroCalculation.tsx:31`)
— the maintain line is now that function's `weightForTargets` verbatim, so on a maintain goal the protein
basis and the calorie basis are the same weight and a weigh-in cannot move one without the other. The lean
mass a cut has to defend is the mass on the scale today, not the mass the goal hopes to arrive at, and reading
`bodyWeight` is what makes the prescription fall with the weigh-ins instead of holding at the target's number
the whole way down. The cost is explicit: `goalWeight` on `lose` was the guard that kept a 150 kg user cutting
to 100 kg off a 330 g prescription, and that guard is gone. Heavy cutters now scale off total mass with no
cap — see the scale-down note below, which they are the population most likely to hit.

**Reconciliation is preserved, and it is why this shape beat three independent floors.** With carbs as the
remainder, `proteinG×4 + fatG×9 + carbG×4` returns the calorie target exactly, modulo integer rounding — so
`macroCalculation.test.ts:75-80`'s ±15 kcal assertion survives unchanged.

**Worked checks** (rev 6 fat constants; rev 9 protein):

- lose @ 1,300, 68 kg (149.9 lb), moderate → 1.0 g/lb → protein 150 g (600) · remaining 700 · 30% = 210 kcal
  = 23 g, **below** the 41 g per-kg floor (367), so fat = 41 g (369) · carbs 333 kcal = 83 g. Sum 1,301, Δ +1.
- maintain @ 2,100, 68 kg, moderate → 0.9 g/lb → protein 135 g (540) · remaining 1,560 · 30% = 468 kcal =
  52 g, clearing the 367 floor · carbs 1,092 kcal = 273 g. Sum 2,100, Δ 0.
- maintain @ 1,024, 41.7 kg, sedentary (the §2 case, on its own honest burn) → 0.7 g/lb → protein 64 g (256) ·
  remaining 768 · 30% = 230 and the per-kg floor only 225, both **under** the 315 absolute floor, so
  fat = 35 g (315) · carbs 453 kcal = 113 g. Sum 1,023, Δ −1.

**Plumbing.**

- `splitMacros(goalType, calories)` → `splitMacros(goalType, activityLevel, calories, weightKg)`. It stays
  pure; the caller converts. Callers: `macroCalculation.tsx:121` and the dev wizard's `adjustNutrition3.tsx:65`,
  which reads `activityLevel` from settings because the wizard's params never carry it.
- `maintenanceCalories` already derives kg from `isImperial` (`macroCalculation.tsx:36-39`) — extract that into
  a shared helper so the two paths cannot drift, per decision 5.
- Carbs clamp at `Math.max(0, …)`. Where protein plus floored fat exceeds a hand-edited target, scale both down
  proportionally and let §4's low-calorie warning fire — that state is a signal the target is too aggressive,
  not a macro problem to solve silently.
- The existing `Math.max(1, …)` gram guards stay.
- **Supersedes** the rev 1/2 survivor "macros inherit the floor — at 800: 70g P / 22g F / 80g C" below: those
  grams were percentage-derived and no longer hold.

**Test cases (before code).**

- Protein equals the grid's g per lb of basis weight at each of the five tiers, unrounded through the kg
  conversion so a round pound weight lands on the round gram figure (200 lb moderate → 180 g maintaining,
  200 g cutting). A cut is a tenth per pound above maintain at the same tier, `gain` equals `maintain` at
  every tier, and one body walked up the ladder steps a rung at a time (77 kg maintaining → 119 · 136 · 153 ·
  170 · 187 g). `lose`/`gain` read `bodyWeight` so a cut prescribes against the body on the scale rather than
  the target, `maintain` reads `goalWeight`, and the `goalWeight <= 0` fallback holds.
- A prescription landing on an exact half gram rounds up rather than following the float: the pound weight
  reaches the split as kilograms, and untreated the round trip sends 195 lb × 0.7 = 136.5 down to 136 while
  145 lb × 0.9 = 130.5 goes up to 131.
- The per-kg fat floor binds on a deep cut (68 kg @ 1,300 → 41 g), the absolute floor binds on a tiny body
  (41.7 kg @ 1,024 → 35 g), and neither binds at a normal maintenance (68 kg @ 2,100 → 52 g).
- A maintain target under the daily minimum is stated as it is, not lifted, and lands strictly below the
  threshold §4's warning fires at; lose still clamps at 800, and maintain and gain both keep a 1 kcal fence
  that a zeroed body proves.
- Carbs are the remainder and never negative; the protein-plus-fat-over-target case scales proportionally.
- Grams reconcile to the target within integer-rounding slack, both at the floor and away from it.
- Metric and imperial produce identical grams for the same body.
- **`splitMacros.test.ts` is replaced in full** — all four current expectations (`:8`, `:12`, `:16`, `:21`) are
  percentage-derived and none survive.
- `macroCalculation.test.ts:75-80` is re-verified, not rewritten.

### Reviewed and deliberately not in scope (2026-08-04)

Adaptive thermogenesis modelling — it is the fourth-largest error term, behind the floor bug (§2), the
maintenance-falls-as-you-shrink effect (already absorbed by `withRegeneratedTargets`), and logging drift, so
modelling it while §1–§5 ship unlanded would be backwards. Also out: observed TDEE derived from logged intake
versus weight change; body-fat input / Katch-McArdle; a gain-specific pace ceiling (`RANGES` gain max stays as
rev 3 left it); pregnancy and lactation. **Under-19** is flagged separately: Mifflin-St Jeor was derived on 498
adults aged 19–78 while `aboutYou.tsx:53` gates at 13+, which is a liability question rather than an accuracy
one and worth revisiting sooner than the rest.

## Test plan (cases before code)

- `calculateCalorieTarget` (formula): maintenance identical across all three goal types for one body; maintain
  **below 1,200** stated raw rather than clamped — the headline new behavior; lose clamps at exactly 800 and
  one kcal either side; gain never clamps; the metric path; maintain's goalWeight anchor surviving the
  extraction; the positive fence on degenerate inputs.
- `derivedPace` (formula): slider-round-trip (compute target from pace p, derive back, |Δ| < 0.001 — the
  invisibility contract); clamped case (requested 2 lb/wk, floored target → derived strictly less); hand-edit
  case (arbitrary calorieGoal); gain sign contract; zero and negative deficit clamp to 0; metric display
  conversion at the caller.
- `maxPace` (business rule): the seven-persona table's @ 800 column verbatim; rounding **down** to 0.1;
  the 3.0 ceiling; the 0.1 lower bound; gain unaffected.
- Slider cap (presentation): thumb clamped on entry; stored pace above max displays at max without a write.
- Warnings: shown below threshold / hidden above / boundaries at exactly 1,200 and 1,500 / gender selects the
  threshold / high-side warning at zero deficit / never blocks save.
- Projection guard: derived 0 → "—" rendered, `weeksToGoal` not called (spy) — pins the fallback bypass.
- Re-pins: `macroCalculation.test.ts:58-81` — the lose fixture computes 598 raw → clamps to **800**; new
  unclamped maintain expectations rot ~8 kcal/yr (`calculateAge` runs on the wall clock; no frozen timers in
  jest.setup) — write them relative or inject `today`. `adjustNutrition4.test.tsx`'s `useSettings` mock lacks
  gender/birthDate and the new context members — both its tests crash, not fail, until extended.
- Docs: create `tests/settingscontext.md` **and** `tests/utils.md` (README lists 14 areas; only 4 files exist).

## Dev Hub harness — a dev duplicate of the wizard, persona-seeded

Decided (owner, 2026-08-04, superseding the same-day "real screens" call): the harness walks a **devTest
duplicate** of the four adjust-nutrition screens (`components/devTest/paceWizard/`, routed at
`app/devTest/paceWizard/`), so nothing dev-only lives in production files — the brief `devPrefillTarget`
param in `adjustNutrition1.tsx` is reverted; the copy reads it natively — and so §3/§4's cap, readout and
warnings can be prototyped directly on the wizard before the fix lands in the real screens. The copies are
hand-synced: byte-identical to the originals except the route targets, step 1's launcher prefill, and their
docblocks — re-sync by diffing against the originals. Dev-only, Metro-stripped, exempt from the testing bars.

- **What the duplicate trades away**: walking it no longer proves the production wiring. That proof now comes
  from jest (both caller sets are in the test plan above) plus one manual pass through the real wizard — and
  one fresh onboarding — after the fix lands in the production screens.
- **Why a launcher is still needed**: the wizard (copy or real) reads gender/birthDate/activityLevel from
  `settings` — the params never carry them — so the audit personas can't be impersonated without changing the
  dev account's profile. The hub entry closes that gap.
- **Routes**: launcher at `app/devTest/paceFlow.tsx`; steps at `app/devTest/paceWizard/adjustTraining.tsx`
  then `adjustNutrition1–4.tsx` — standard `__DEV__` require wrappers, registered in the `__DEV__` Protected
  group (`devTestRoutesGuarded.test.tsx` pins the registration).
- **The flow opens on activity** (added 2026-08-04): a copy of `settingsScreens/adjustTraining.tsx`, because
  the activity factor (1.2 → 1.9) is the largest lever on maintenance after body size, so the cap, the
  readout, the warnings and the projected date can all be moved from one screen. It writes `activityLevel`
  and pushes step 1, forwarding `devPrefillTarget`; the original's `withRegeneratedTargets` call and its
  `macrosCustomized` alert are dropped, since step 4 recomputes and commits every target moments later. The
  screen states no calorie number of its own — no target or pace exists yet when it renders, so step 2 is
  the first place a burn figure has context (as built).
- **Component** `components/devTest/PaceFlowLauncher.tsx`: thirteen persona rows ordered youngest first (the
  seven audited bodies, the 4'10" worst case, and an 18–25 cohort added 2026-08-04/05 — age leads each label,
  and each row states its hand-computed maintenance and honest @800 cap as the manual PASS criteria) ×
  a Cut / Bulk / Maintain scenario chip + "use my current profile"; Apply writes
  persona + goal (gender, birthDate, activityLevel, height, bodyWeight, unitSystem, goalType, goalWeight,
  goalPace) into settings via `setSettings`, then routes into the copy's step 1. Pre-filling rides on the
  same seeding the production wizard runs — step 1 reads its tiles and current weight from settings, the
  step-2 slider seeds from `settings.goalPace` (Cut seeds 2.0, the floor-tripping pace; Bulk 1.0; Maintain
  routes 1 → 3 with no slider) — plus `devPrefillTarget` for the step-1 target field (production starts it
  empty by design; the copy, being dev code, reads the param without any `__DEV__` guard). The on-screen run
  sheet says what each step should arrive showing; button copy notes it overwrites the dev account's profile
  (it syncs like any settings write).
- **Save is real**: the step-4 copy commits settings and stamps weigh-ins exactly like the original, so the
  post-save checks — profile row, projections, drift after a later weigh-in — still run against production
  surfaces. Seeding sets `bodyWeight` to the persona's weight **before** launch, so a straight walk-through
  doesn't stamp a spurious weigh-in (the stamp fires only on change). Deliberately editing the weight at
  step 1 — or logging a real weigh-in afterwards — **is** the drift test, end to end.
- **Status (2026-08-04) — the sandbox implementation is in.** §1's functions live in `macroCalculation.tsx`
  as additive exports — `calculateCalorieTarget` (carrying §2's 800 lose-only floor and raw maintenance),
  `maxPace`, `derivedPace`, `splitMacros`, plus `LOW_CALORIE_THRESHOLDS` / `VLCD_FLOOR` / `PACE_CEILING` —
  written tests-first (28 cases across four new files, every expectation hand-computed; the persona table's
  @800 column is pinned verbatim). `calculateMacros` was refactored onto the same internal helpers but is
  behaviourally untouched — its 1500/1200 clamp stays and the pre-existing pins pass unchanged — so nothing
  production computes has moved. The copies consume the functions directly: step 2 caps the Cut slider at
  `maxPace` (initial thumb clamped in, a stored pace above max shows at max without a write, the kg slider
  converts the lb cap; Bulk keeps the fixed range), renders the live kcal readout and the warnings;
  step 3 computes targets from `calculateCalorieTarget` + `splitMacros` (maintain arrives showing raw
  maintenance) with the warnings reacting to hand-edits; step 4 derives its date from `params.calorieGoal`
  via `derivedPace` with the 0 → "—" guard and the wrong-direction line. The warnings are one dev component
  (`CalorieFeedback`: low threshold by gender + wrong-direction, amber `colors.warning`, never blocking).
  Docs: `tests/settingscontext.md` and the functions `__tests__/README.md` created.
- **Deferred to the production landing**: switching the four real wizard screens and the onboarding four
  onto the shared functions; dropping `calculateMacros`'s own clamp to 800 (with the
  `macroCalculation.test.ts` re-pins); provider exposure through SettingsContext (memo + dep array — the
  copies import the module directly, so nothing needed it yet); the `RANGES`/`paceLabel` hoist; the
  `EditMacroGoalModal` threshold prop (the copies warn under the cards instead — the modal is shared
  production UI, so in-modal live typing warnings wait); the §5 caller switches in `projection.tsx` /
  `paywall.tsx`; the housekeeping copy/doc fixes; `tests/utils.md`.
- **Not covered**: the onboarding four (pace, plan, projection, paywall — different files). Accepted because
  both sides call the same shared functions (§1) and jest covers both caller sets; verify the onboarding
  wiring once with a fresh-onboarding pass.
- **The scripted PASS/FAIL paths live in jest only** (they are the tests-first cases in the plan above); the
  in-app runner from the earlier `paceSim` sketch is dropped as redundant.

## Same-pass housekeeping

- Update **both** byte-identical `web-calculators.md` copies (`App/.claude/agents/web/` and root
  `.claude/agents/web/`), lines 17/20/26/37 — line 37 pins website parity against the very fixture being
  re-pinned.
- devTest comment fixes: `pace/V5.tsx:19-23`, `goalProjection/V5.tsx:19-24`, `goalProjection/V6.tsx:20-24`,
  `registry.tsx:91-92`. devTest keeps its intentional forks — the V1/V3/V4/V5 pace variants differ on purpose.
- Copy fixes — promises of silent auto-update on paths that now warn: `updateBWModal.tsx:44`,
  `adjustNutrition3.tsx:122`, and `EditHeightModal.tsx:115` + `adjustTraining.tsx:44` (those two are **already
  false today** — both flows offer "Keep custom").
- Optional: a floor/warning bullet in `howItWorks.tsx`'s SECTIONS; framing for `paywall.tsx:132`, which renders
  the bare calorie target above the purchase CTA.

## Adjacent bug found during this work (separate fix)

`plan.tsx` commits hand-edited macros **without** `macrosCustomized` — `profile.tsx:52-55` sets the flag for
the identical edit — so the first weigh-in regenerates and silently reverts onboarding edits. The wizard shares
the shape deliberately: `adjustNutrition4.tsx:68` resets the flag by design, but that reset also covers edits
made moments earlier on step 3. **Always-derive cures the projection symptom** (the flag no longer gates any
date), but the regeneration-wipe symptom remains. Fix shape: set the flag in `plan.tsx` only when a committed
value differs from the computed one; decide the wizard case explicitly. This matters more under rev 3:
hand-edits are the primary freedom lever, and the removed floor no longer bounds the reverted-to values.

## Verified NOT affected (coupling sweep, 2026-08-03)

- **Schema/sync/server — no migration needed.** `calorie_goal INTEGER` with no CHECK constraints anywhere in
  the migrations; sync rules are `SELECT *`; no Edge Function reads targets, floors, maintenance, or pace.
- **Notifications** — no builder embeds a calorie number, target, or pace. Streaks are "did you log", not "did
  you hit goal".
- **AI prompts** — user targets never reach the OpenAI or FatSecret calls.
- **Legal** — the existing medical disclaimer already covers computed low targets.
- **No hidden formula copies** — the BMR/TDEE/floor math exists only in `macroCalculation.tsx`; devTest imports
  the real one, and the macro dev screens use flat literals.
- **Mocks** — of the three `useSettings` jest.mock factories, only `adjustNutrition4.test.tsx` breaks.
- **Decisions that survive from rev 1/2:** the 3 lb/week ceiling; no recompute cascade on macro edits
  (`EditMacroGoalModal`'s "Only this goal changes" copy stays true); macros inherit the floor — at 800:
  70g P / 22g F / 80g C reconcile to exactly 800 (**superseded by §7** — those grams are percentage-derived;
  the reconciliation property survives, the numbers do not).
- **Still open, deliberately unchanged:** milestone framing for very long honest timelines (dates are now
  honest by construction; presentation polish only); the weigh-in low-calorie prompt (cut from scope — needs
  the discarded-prompt plumbing fixed first). The protein g/kg item moved **into** scope in rev 4 — see §7.
