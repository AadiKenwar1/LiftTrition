# progressFixes — working notes on progression logic

_Living doc for the progression redesign discussion. Updated as decisions land. Nothing coded yet._
_Last updated: 2026-07-25 (rev 16 — added Implementation summary (file-by-file change list) and NEW UI workstream: extract the logsModal goal text into a dedicated progress-indicator component, variants prototyped in Dev Hub first. Rev 15: graph question closed permanently (dip shows, sawtooth teaches itself). Full traces: `progressFixes-scenarios.md`)_

## Current system (facts)

- Logic: `context/WorkoutContext/functions/progressionFunctions.ts`, consumed in `app/workoutScreens/logsModal.tsx`
- Anchor = best set of the **single most recent prior session** (`pickBestSet`, ranked raw weight → reps → time)
- Goal = anchor + 1 rep; at 12 reps → +increment (5/2.5 lbs or 2.5/1.25 kg by compound/isolation), reps reset to 8
- Goal-met check (`isGoalMet`) = `weight >= goal.weight AND reps >= goal.reps` — rigid AND gate
- Today's sets never affect today's goal (prior-days filter) — correct by design
- Existing UI states in logsModal: goal shown; goal hit (celebration + next-goal preview); **null goal + logs today → next-goal preview already renders** (line ~128) — the calibration state reuses this
- Goals are **not persisted** — pure function of log history. Keep it that way (no schema / sync-rules work).

## The observed problem (repro)

Previous session 190×7 → today's goal 190×8. User logs **195×7** (heavier, e1RM ≈ identical: 240.5 vs 240.7).
App says goal NOT hit (7 < 8 reps) — no celebration, no next-goal preview. Progress on the weight axis is invisible to the AND gate.
(Anchor self-corrects tomorrow → 195×8. The *recognition*, not the anchoring, is what misfires. Confirmed understood by owner.)

## Agreed

1. **Fix 1 — recognition on either axis.** Goal met if (weight ≥ goal.weight AND reps ≥ goal.reps) OR best set's e1RM ≥ goal's e1RM (small tolerance ~1%). Epley: `w × (1 + r/30)`. Fixes the 195×7 case. Highest trust-per-effort; shippable alone.
2. **Fix 2 — anchor by e1RM, not raw weight** (within-session ranking in `pickBestSet`). Stops a 200×2 top single from out-ranking a 185×10 working set (e1RM 213 vs 247) → "200×3" suggestion. No-op for single-set loggers.
3. **Two-session anchor window.** One off day can't collapse the goal; two consecutive down sessions = real signal, goal follows. Holding at **2** sessions (not 3): the window's only job is one-day noise filtering; 3 fights genuine declines longer (contradicts follow-the-user philosophy) and the 14-day gate trims it for weekly exercises anyway.
4. **Redirect (bounded optimism — rev 4, generalizes the old "rep clamp").** If the latest session has work at **or above** the suggested weight, the goal moves to *that* weight: best set there (by e1RM) + 1 rep. Same-weight cases behave exactly like the old clamp (185×12 → tried 190, got 190×6 → next 190×7; "old 200×10 + recent 200×5" → 200×6). New behavior: user self-selects heavier — old 185×12, latest 195×5 → goal **195×6**, NOT 190×6 (owner's call: the app must never drag a user back down from a weight they chose, same principle as no prescribed deloads). Guard needed: very-low-rep sets (~reps < 4 = max testing, not working weight) must not trigger the redirect, else a grinded 225×1 would prescribe a 225×2 max double. Redirect output runs through the normal 12-rep cap logic.
5. **Calibration gate (owner's idea).** If an exercise has **no sessions within the last 14 days**, show NO suggested set. Instead prompt: log a set to (re)start coaching. First session back becomes the new baseline; normal suggestions resume next session. Reuses the existing null-goal UI state — the stale case is just different copy on it.

## The unified constant

**One 14-day number powers everything:** coaching runs on sessions from the last 14 days (up to the last 2). Zero sessions in window → calibration state. This simultaneously implements the staleness gate, the window recency cap, and prevents pre-break sessions from ever re-entering the window after a comeback. No separate thresholds.

## Rejected

- **All-time-PR anchoring** — demotivating; one great day poisons future suggestions. Last-session-based stays the core.
- **Prescriptive deload** (auto-lowering weights, "deload week" labels) — false positives (travel, equipment, off week) would have the app telling users to lift less, wrongly. Never prescribe decreases. At most, later: passive "Need a deload?" pill — deprioritized.
- **"Repeat the failed jump"** (raw max-of-two re-prescribing 190×8 after a 190×6 attempt) — injury/anger risk; superseded by rep clamp.
- **"Match, don't beat" stale re-entry** — still guesses a number from stale data; superseded by calibration gate (ask, don't guess).
- **3-session window** — see Agreed #3.
- **Adaptive staleness threshold** ("2× your typical gap for this exercise") — unexplainable, per-exercise edge cases, violates tooltip-simplicity rule. Fixed 14 days.
- **%1RM-based prescriptions** (rev 5 — e.g. "80% of max for 6–12 reps" after a max single). The %→reps mapping is a population average; individual rep-endurance varies wildly, and it's a formula guess replacing demonstrated performance (same category as all-time-PR anchoring). Concrete misfires: a 190×8 lifter grinds 225×1 → 80% = 180 — a prescribed *decrease* (violates never-decrease); a strong-single/rep-poor lifter gets a prescribed +30 lb jump (injury case). Also a second prescription engine = blending complexity with the +1-rep system. **% stays descriptive/advisory only:** warmup-set suggestions, "~80% of your est. max" info on the goal card, "New est. max!" celebrations, the graph itself. After a max single the goal simply doesn't move (reps<4 guard).
- **Strength/hypertrophy/endurance goal triad per session** (rev 5) — see Alternative equivalent goals section; superseded by onboarding rep-range modes (locked rev 6).
- **Graph jump-day annotation markers / jump-colored dots** — rejected rev 6 (bug risk, aesthetics), un-rejected rev 7 (objections rested on downsampling/density that don't exist), **RE-REJECTED FINAL rev 8** (owner: the line is dotless by design and no dots will be added — feasibility was never the issue in the end, taste was). Graph canvas stays untouched.
- **Dual-formula display + metric-matched increments** (rev 14 — external suggestion the owner brought in: Lombardi "strength score" for the trend graph, Wathen for headline max, weight jumps tuned to +4.14% so the step is Lombardi-neutral, 8–10 range, 5-session trailing-max backstop). Math verified correct (Brzycki/Lander would be −11.5% on the same step; Lombardi −1.4%; 8–10 ticks upward). Rejected because: two disagreeing numbers on one screen (chip vs line in different units; orderings flip — Epley says 185×10 > 190×8, Lombardi the reverse → celebrated days where the line drops); "strength score" is a new unit requiring explanation (fails the glanceable bar permanently, vs the dip's 3 sessions); Lombardi trend is the rev-11 impossibility trade (month of 8→12 = +4% vs +10.5% — line stops responding to the coached behavior); matched increments = percentage jumps (197.5 on the bar, microplates, impossible with dumbbells, bigger/harder jump days) and the chart dictating the program; 8–10 narrowing = same inversion; 5-session trailing max = the rejected rolling max renamed. Salvage: if usage data ever shows the dip costing retention, percentage-increment progression could return as an advanced opt-in — a program feature, not a graph fix. — was briefly adopted rev 9) — owner: "jump day mentality isn't real"; any dip explanation that requires reading and understanding text fails the product bar (glanceable or nothing), and no glanceable mechanism survived earlier rejections. The dip is carried by the existing max chip + existing goal-hit celebrations instead. Copy candidates and the stateless detection rule remain in the (rejected) climb-back section for the record.
- **Alternative 1RM formulas — Epley→Lombardi hybrid (rev 9) and Wathan (rev 10)** — Lombardi: raw switch at 10 reps is non-monotonic (185×11 scores below 185×10); stitched version flattens 10→12 to ~0.9%/rep, under the goal-met tolerance → repeating 190×10 auto-meets a ×11 goal, progression stalls. Wathan: tracks Epley within ~1% through 12 reps and flattens too late — 185×20 (304) still out-ranks 225×8 (287), so the burnout anchor-hijack survives. Every formula in the family needs the cap anyway; capped, they're all ≈Epley where it matters. **Capped Epley stays** — see formula section for full math.
- **Adaptive reset ("start 12→10, then adjust to the user")** (rev 7) — new state/rules for behavior the system already has for free: the reset is only the *opening ask*; overshoot (asked ×8, did ×10) → anchor+redirect follow the actual performance next session (→ ×11), undershoot → redirect walks it down. "8 + follow actual" already IS adaptive, and it adapts in the safe direction (start comfortable, ramp on demonstrated success) instead of starting near-max and correcting after failure.

## Design principles

- **Asymmetric conservatism:** errors must be small and bounded upward. Never prescribe a decrease (user's call); never demand more than +1 rep beyond recently demonstrated capacity at that weight.
- **Ask, don't guess:** when data is too stale to trust, prompt for a baseline set instead of suggesting from stale data. The riskiest suggestion (pre-break numbers to a detrained user) is structurally unreachable, not just mitigated.
- **Simplicity:** whole system fits in ~2 sentences. No stored state, no streak counters, one constant (14 days).
- **Business/risk framing:** false-positive deload angers users; a prescribed jump that fails/injures angers users. Both are worse than a slightly-too-easy suggestion.

## Implementation summary (rev 16 — what actually changes, file by file)

All changes live in `context/WorkoutContext/functions/` + one UI surface. No schema, no sync-rules, no stored state.

1. `oneRepMaxFunctions.tsx` — `estimate1RM` gains the rep cap (credit stops at 12). **Shared fix**: coaching, strength graph, and GraphStats chips all flow through it — capping here fixes the live burnout-peak bug everywhere at once.
2. `progressionFunctions.ts` — the core rewrite:
   - `pickBestSet`: rank by capped e1RM (ties → heavier → more reps → later time)
   - `getDailyGoal`: window = sessions within 14 days of selected date, most recent 2; anchor = best set in window; empty window → null (calibration state)
   - new redirect step: latest session has a set ≥ suggested weight with reps ≥ guard (~4, TBD) → goal = that weight, best-such-set reps + 1, through normal 12→8 cap logic
   - `isGoalMet`: (weight AND reps) OR capped e1RM ≥ goal e1RM × ~0.99 (tolerance TBD)
   - sets need reps ≥ 1 (estimate1RM already guards)
3. `__tests__/progressionFunctions.test.ts` — update + new cases from the 25 scenarios in `progressFixes-scenarios.md`
4. `app/workoutScreens/logsModal.tsx` — calibration copy variants on the existing null-goal state (never-trained vs returning ≥14 days)
5. Graph (`graphFunctions.tsx`, `Graph1.tsx`, `GraphStats.tsx`) — **no changes** beyond inheriting the capped formula. Dip shows honestly (rev 15, final).

## UI workstream — progress indicator component (rev 16, owner request; design phase)

Current state: the goal UI in `logsModal.tsx` (~lines 203–222) is plain `<Text>` lines — "PLATES suggested set: 190 lbs × 8", a "Goal hit!" row, a next-goal preview line. Owner wants this to stop looking like a basic text line.

Plan:
- **Extract into a dedicated component** (own file for modularity — natural home: `components/WorkoutLogs/`). It consumes the same computed props (`dailyGoal`, `goalHitToday`, `nextGoal`, calibration flag) — zero coupling to the engine rewrite; the two workstreams can ship independently.
- **Prototype variants in the Dev Hub first** (`app/devTest/` route registered in the Dev Hub index, `__DEV__`-guarded, per repo convention) so looks can be compared side-by-side with mock states before touching logsModal.
- **States the component must render:** (a) suggested set (default); (b) goal hit — celebration + next-goal preview; (c) calibration, never trained; (d) calibration, returning after 14+ days; (e) no-goal-but-logged-today → next-goal preview. That's the complete state space — no climb-back/explanatory states (rev 13/15 final).
- Constraints: theme tokens only (`useColors`/`makeStyles`, no hardcoded colors/fonts/radii); glanceable — numbers and state, not explanatory sentences.
- **Status (rev 17): variants BUILT.** Dev Hub → Components → "Progress Indicator — variants (all states)" (`/devTest/progressIndicator`).
  - `components/devTest/ProgressIndicatorVariants.tsx` — 7 candidates, each rendering all 5 states: **0 Current** (today's plain text, kept as the comparison baseline), **1 Target card** (accent rail + big numerals), **2 Split cells** (GraphStats language), **3 Accent pill** (lowest weight), **4 Rep ladder** (position in the 8→12 cycle — the only one that shows cycle progress), **5 Gradient band** (highest emphasis), **6 Inline row** (compact).
  - `components/devTest/ProgressIndicatorTest.tsx` — bench with theme / scenario / state switchers. Scenarios: mid, at cap, heavy (3-digit), **redirect (190×6 — sub-reset reps)**, bodyweight (renders "BW"/"Bodyweight", never a bare 0), kg.
  - `app/devTest/progressIndicator.tsx` route stub + DevHub entry. Typecheck clean.
  - Note: an older `suggestSet` bench exists (6 variants, before/hit/nextDay only) — superseded by this one, which covers the calibration states. Delete or keep as reference once a direction is picked.
- **Round 2 (rev 18): owner picked the INLINE ROW for its minimalism.** Riff bench at Dev Hub → "Progress Indicator — inline riffs (round 2)" (`/devTest/progressInline`), files `ProgressInlineVariants.tsx` + `ProgressInlineTest.tsx`. Same skeleton throughout (quiet label left, numbers right); each riff varies exactly one thing: **0** inset fill (round-1 pick, baseline), **1** bare (no container), **2** top hairline rule, **3** accent dot, **4** icon only (no label words), **5** micro-caps label, **6** accent numerals, **7** trailing look-ahead ("190 × 8 → 190 × 9"), **8** centered (keeps today's alignment). Adds a **stage-width toggle** (modal padding vs full bleed) since space-between rows are width-sensitive. Typecheck clean.
- **Round 3 (rev 19): owner picked the CENTERED riff; checkmark rejected** (no check icon in any state). Bench at Dev Hub → "Progress Indicator — centered, no check (round 3)" (`/devTest/progressCentered`), files `ProgressCenteredVariants.tsx` + `ProgressCenteredTest.tsx`. Riffs: **0** label color only, **1** accent numerals, **2** underline rule, **3** leading dot, **4** **merged** (hit reads identically to a preview), **5** tinted plate, **6** numbers first, **7** weight-forward. Typecheck clean.
- **State semantics clarified (rev 19)** — `hit` vs `preview` confusion is real and worth a product decision:
  - `suggested` — a goal exists for today, not yet met.
  - `hit` — that goal was met today. Shows the NEXT session's target.
  - `preview` — **no goal existed today** (empty window → nothing to anchor on) but a set was logged, so a next target now exists. Today's condition: `!dailyGoal && hasLogsOnSelectedDate` (logsModal ~line 128). Under the new spec this is exactly what the calibration state resolves into once the baseline set is logged (new exercise, or first session back after 14+ days).
  - Both render the same next-session numbers; they differ only in whether the target was *earned* or *established*. **Open question:** keep them visually distinct (riffs 0–3, 5–7) or merge them (riff 4) — merging removes a state from the design and the copy, at the cost of not marking the win. Note the celebration is not solely carried here: goal-hit already has its own UI moment in the modal.
  - Next: owner picks a riff (or a hybrid) + decides merge-vs-distinct, then it gets extracted to `components/WorkoutLogs/` and wired into logsModal.

## FINAL ruleset (v-next — scenario-tested)

1. Window = sessions within the **last 14 days** (of selected date), most recent **2**.
2. Window empty → **calibration state**: no suggestion; prompt to log a baseline set. (Copy variants: never-trained vs returning.)
3. Anchor = best set in window by **e1RM = w × (1 + min(reps, 12)/30)** — reps capped at 12 in the formula (burnout sets otherwise hijack the anchor via Epley inflation; scenario 16). Ties → heavier weight → more reps → later time (reps needed for zero-weight sets; scenario 18).
4. Suggestion = anchor + 1 rep; at 12 reps → +increment, reps reset to 8.
5. **Redirect:** if the latest session has any set at **≥ the suggested weight** (with reps ≥ ~4 — see guard), the goal moves to that work: pick the best such set (by e1RM, same tie-breaks) and target its weight × (reps + 1), run through the normal 12-cap logic. Same-weight attempts reproduce the old clamp exactly (190×5 → 190×6); heavier self-selected attempts follow the user (195×5 → 195×6, scenario 13 rev). Never blocks a *first* jump attempt — only re-asks after a real attempt. Guard: sets below ~4 reps are max tests, not working weight — they don't redirect (else 225×1 → prescribed 225×2 max double).
6. **Goal met** = (weight AND reps met) OR capped e1RM ≥ goal e1RM (~1% tolerance). Rep cap also blocks goal-gaming via ultra-high-rep light sets (scenario 17).
7. Sets need **reps ≥ 1** to anchor or grade (0-rep logs would suggest W×1; scenario 19).

User-facing mental model: *"Beat your best set from the last two weeks by one rep — or match it at a heavier weight. At 12 reps, weight goes up, reps reset to 8. Away longer than two weeks? Your first set back resets your baseline."*

## UX notes (calibration state)

- Two copy variants on the same null-goal state: never trained ("Log a set to start getting suggested sets") vs returning ("Been a while — your first set back resets your baseline"). Warm, not naggy — exercise rotators will see this on every rotation return, which is correct behavior but must not read as friction.
- Show old history as **information, not prescription**: "Last session · 6 weeks ago: 190×8" — never framed as a target. That framing difference is the liability line.
- The moment the baseline set is logged, the existing next-goal preview fires ("Next session: 175×9") — coaching visibly turns back on as a reward. Nearly free: logsModal already renders nextGoal when `!dailyGoal && hasLogsOnSelectedDate`.
- Whole first session back is the calibration (best set by e1RM wins), so logging a warmup first is harmless/self-correcting.
- Staleness measured against the **selected log date** (logsModal supports back-dated logging), which falls out of the existing date-key logic.

## Codebase discoveries (rev 4 — changes the implementation picture)

- **`estimate1RM` already exists** (`functions/oneRepMaxFunctions.tsx`): Epley `w × (1 + 0.0333r)`, reps=1 → weight itself, guards reps/weight ≤ 0 → 0. Two of our scenario guards (reps ≥ 1, zero-weight) are already the codebase's habit. Coaching should REUSE this function (+ new rep cap), not reimplement.
- **The strength graph plots per-day max e1RM** (`graphFunctions.tsx getOneRepMaxData`) — **uncapped**. So the burnout-set inflation bug (scenario 16) exists in the graph TODAY: 185×20 graphs at 308, a fake peak that makes honest later sessions read as regression. The rep cap must be shared by graph + coaching, or they'll disagree about "best set."
- **`effectiveLoad` (bodyweight-aware) exists** in `fatigueFunctions.tsx` — answers the bodyweight verify item; the graph does NOT use it (fatigue does). Decide whether progression/graph should.

## Strength-graph interaction (owner's concern — confirmed real)

At a weight jump (185×12 → 190×8), the e1RM graph dips ~7% (259 → 241) and stays under the old peak for 3 sessions (reclaims at 190×11 ≈ 260). Beginners will read this as "the app made me weaker."

**Rev 6 — annotation markers REJECTED** (owner: bug-prone, unlikely to look good, visual friction). New direction: **change the data the graph plots, not the decoration on top of it.**

- **Recommended: plot the trailing 14-day max of capped e1RM** instead of per-day e1RM. Framing: the graph is titled *strength* — plot capability (best recently demonstrated), not daily output; output swings 7%+ day to day, capability doesn't. Jump timeline: 259 → stays 259 through the 190×8/×9/×10 sessions (flat, not dipping) → 259.6 at 190×11. **The dip becomes structurally impossible** on a jump. Also fixes a worse, live-today artifact: a sick-day 135×10 currently plots a −30% one-day crater; under trailing max it plots flat. Honest about real decline: sustained lower performance steps the line down after 14 days; long layoffs drop to the new baseline (matches calibration philosophy). Reuses the codebase's existing rolling-max pattern (`oneRMMap` over refDays) and the unified 14-day constant. Pure data-transform inside `getOneRepMaxData` — no new UI elements, no marker/downsample interplay, minimal bug surface.
- **Alternative: all-time running max** — simplest, never dips, but hides genuine decline forever, and legacy uncapped burnout peaks would flat-line it permanently. Weaker.
- **Reset depth 12→10** — still a live *training-side* lever (dip −2%; redirect makes the harder jump day safe; weight cycles ~every 3 sessions vs ~5) but it's a program change, not a graph fix. Decide on training merits; the trailing-max graph makes it unnecessary for the dip problem.
- **Complement (no graph involvement):** jump-day goal-card copy ("Weight up 5 lbs, reps reset") and/or a one-time first-jump explainer. Zero graph code, zero visual friction.
- **Shared capped formula** (see discoveries) still required regardless of choice, so peaks are never fake.
- Trade-off to accept with trailing max: after a peak the line goes *flat* for up to ~3 sessions rather than rising every session — flat reads far better than a dip, and it rises the moment any set beats the 14-day best.

### Rev 7 — graph code review (changes the rev-6 picture)

Facts from `Graph1.tsx` / `graphFunctions.tsx` / `progress.tsx`:

- **No downsampling exists.** `downsample.ts` has zero importers outside its own test — dead code (cleanup candidate, separate from this work).
- Strength graph = victory-native XL Skia `CartesianChart` with a render-prop child — we own the canvas and already draw individual `Circle`s (end dot, press dot). **Per-point colored dots are trivially feasible.**
- Data is one point per *training day* (last 21 max), lift ranges are 7/14/21 **sessions** — so ≤21 dots ever, no density/clutter risk. (Also means a jump dip spans ~3 of 7 visible points at the default range — the dip is visually LARGE here.)
- There are currently **no per-point dots at all** (line + area + end dot only) — "coloring jump dots" really means *adding* dots only on jump days: bare line, occasional accent dot. Arguably cleaner than dotting every point.
- Plumbing needed: `getOneRepMaxData` adds an optional `isJump` flag per point (data shape `{day, value, isJump?}`), Graph1 draws small accent Circles at flagged points, flag included in `chartKey`. Nutrition/body-weight uses of Graph1 just omit the flag.
- **Jump definition needs one guard:** naive "heavier than previous session" false-positives on recovery from a light day (135 sick day → back to 190 would flag). Use "day's top working weight is a **new high vs the trailing 14 days**" instead.
- Press interaction could later surface the why: pressing a jump dot → readout pill says "+5 lbs".

**The rev-6 annotation rejection was based on premises that turned out false** (downsampling interplay, year-scale density). With ≤21 points and a render-prop canvas, jump dots are cheap, low-bug, and keep the graph honest raw data.

### Trailing-14-day-max — pros/cons (owner requested; deciding vs jump dots)

| | Trailing 14-day max line |
|---|---|
| ✅ | Jump dip structurally impossible (flat, then rise) |
| ✅ | Fixes the sick-day crater too (one 135×10 day currently plots ~−30% for a point) |
| ✅ | Deloads/light weeks don't scare the user; matches "strength = capability, not daily output" |
| ✅ | Same 14-day constant as coaching; rolling-max pattern already in codebase (`oneRMMap`) |
| ✅ | Pure data transform, no UI changes |
| ❌ | **Hides weakness for up to 14 days** (owner's concern — genuine decline shows as flat, then a delayed step-down "cliff" when the old peak ages out: confusing, lie-adjacent) |
| ❌ | Press-readout becomes wrong-feeling: pressing a day shows the window max (259), not what you did that day (241) |
| ❌ | Post-jump the line doesn't move for ~3 sessions even as the user progresses ×8→×9→×10 — less per-session feedback |
| ❌ | At the 7-session default range, flat segments dominate |
| ❌ | Harder to explain what the line *is* ("best of last 14 days" vs "your est. 1RM each day") |

~~Rev 7 recommendation: jump-colored dots~~ — rejected final rev 8 (owner: no dots, period).

### Rev 8 — GraphStats discovery + final graph direction

`GraphStats.tsx` ('orm' type) already renders two chips with the strength graph:

- **"Estimated max"** = max over the stats window — during a post-jump dip (or a sick day), this chip **keeps showing the peak (259)** while the line dips. The reassurance trailing-max was meant to provide already exists in shipped UI, without touching the line's honesty.
- **"Change"** = last − first over the visible range, with a trend arrow whose down-state is deliberately neutral-toned (never red) — good existing design. Caveat: mid-dip at short ranges it can read e.g. "−12" right after a level-up (line dips AND chip goes negative). Bounded, self-heals in ~3 sessions; live with it for v1, revisit only if users complain (options then: compare last-vs-best, or capped-e1RM trend).
- Both chips consume the same uncapped e1RM data → the **shared capped formula must feed graph + chips together** (a burnout set currently inflates the "Estimated max" chip too).

**Recommendation (rev 8):** graph canvas untouched, honest per-day capped-e1RM line; peak reassurance = the existing "Estimated max" chip; the *why* = goal-card copy. Zero graph code. Trailing-14-day-max line stays shelved (hides weakness — owner's objection stands).

### ~~Rev 9 — climb-back state~~ REJECTED rev 13 (kept for the record)

**Owner's final call: no "jump day," no climb-back messages, no explanatory copy.** The bar: if the user has to *read and understand* something to know why their strength line looks lower, it fails — glanceable or nothing. Text is by definition not glanceable, so the whole message system below (detection rule, copy candidates, placements) is dead. The detection rule stays documented only in case a genuinely glanceable use for it ever appears.

What actually carries the dip now (all already shipped, all zero-reading):
- **"Estimated max" chip** — a big number that does NOT go down during the dip. Glance: "my max is still 259."
- **Goal-hit celebrations** — during the post-jump sessions the user is *hitting their goal every session* (190×8 ✓, ×9 ✓, ×10 ✓), so the existing celebration/checkmark loop fires 3 sessions in a row. The emotional counter-signal to "I'm regressing" is already built into the coaching loop — nobody feels weaker while being celebrated for more weight.
- **Capped formula** — dips and peaks are real, never fake.
- Residual risk accepted: a user who studies the graph in isolation, ignoring the chip beside it. Small population; no non-textual remedy exists that wasn't already rejected (dots, color, annotation, smoothing, flat formulas).
- **Rev 15 — owner reaffirmed after the external dual-formula proposal: let the dip show, users figure it out.** Strongest supporting argument: the sawtooth teaches itself — the dip-then-new-high pattern repeats every ~5 weeks and always resolves upward, so users learn it from their own lifting by the second cycle. Bounded cost: one first-cycle "huh?" moment, ~7% deep, ~3 sessions, self-resolving. This closes the graph question permanently.

<details of the rejected design follow, unchanged, for the record:>

Instead of jump-day-only copy, show the "why" text **for the whole rebuild arc** — every session where the user has moved to a heavier weight but hasn't yet re-beaten their recent peak. Jump day is just day 1 of the state.

**Stateless detection (pure function of logs, consistent with no-stored-state):**
- P = best capped e1RM in the 14-day window (any weight); PW = the weight of the set that produced P; W = current goal weight.
- **Climbing ⇔ W > PW AND best capped e1RM at ≥W in window < P.**
- Properties (all verified by trace): fires on jump day (190×8 = 241 < P = 259 set at 185) and stays on through ×9/×10; **clears itself** the session the peak is re-beaten (190×11 ≈ 259.6 ≥ P); also fires correctly on self-selected jumps (195×5 after 185×12 → "rebuilding at 195"); does **NOT** fire during a same-weight decline (P was set at W → W > PW false — no fake cheerleading while someone regresses); fades naturally if the old peak ages out of the 14-day window.
- Copy (rev 12 — owner: plain language only, no "jump"/"rebuilding"/exercise-number jargon). Candidates:
  - Jump day: **"You hit 12 — time to add weight."** (rec) / "12 reps! Moving you up in weight." / "More weight, fresh start on reps."
  - Climb sessions: **"Fewer reps at a heavier weight is still progress."** (rec — directly cancels the "I got weaker" read) / "Your reps will climb back — your max will follow." / "New weight takes a few sessions to catch up. Keep going."
  - Single-message variant (one line for the whole arc, simplest): "You moved up in weight — reps build back from here."
  - Owner to pick.
- Placement: primary = goal-card subtext in logsModal (where coaching lives); optional secondary = one muted line near GraphStats on the progress tab (where the dip is actually seen). Compute the state once in WorkoutContext so both surfaces share it.
- One-time first-jump explainer remains optional garnish on top.

**The full answer to "how does the graph seem correct when e1RM drops?" (REWRITTEN rev 13, message system removed):** we don't explain the dip with text at all. The line dips honestly; the two zero-reading signals beside it carry the moment: the **"Estimated max" chip** holds the peak, and the **goal-hit celebration** fires every session of the climb. The rep cap guarantees the dip is real, never a formula artifact.

What the user actually sees, session by session (everything below already exists in the app):

| Session | They do | Line | Max chip | Coaching loop |
|---|---|---|---|---|
| A | 185×12 | 259 (high) | 259 | goal hit ✓ celebration; next: 190×8 |
| B | 190×8 | dips to 241 | **still 259** | goal hit ✓ celebration |
| C, D | 190×9, ×10 | 247, 253 | 259 | goal hit ✓ celebration, both sessions |
| E | 190×11 | **260 — new high** | 260 | goal hit ✓ celebration |

The user is being celebrated four sessions in a row while the line dips and recovers — the counter-signal is emotional and glanceable, not textual.

### Formula choice — Epley/Lombardi hybrid analyzed, REJECTED (rev 9)

Owner's idea: Epley for 1–10 reps, Lombardi (w·r^0.10) above 10 — so high-rep sets stop looking strong. Math:

| Reps | Epley factor | Lombardi factor | Stitched hybrid* | Cap-12 |
|---|---|---|---|---|
| 8 | 1.267 | — | 1.267 | 1.267 |
| 10 | 1.333 | 1.259 | 1.333 | 1.333 |
| 11 | 1.367 | 1.271 | 1.346 | 1.367 |
| 12 | 1.400 | 1.282 | 1.358 | 1.400 |
| 15 | 1.500 | 1.311 | 1.389 | 1.400 |
| 20 | 1.667 | 1.349 | 1.429 | 1.400 |
| 35 | 2.167 | 1.427 | 1.511 | 1.400 |

\* stitched = Epley(10) × (r/10)^0.10, the continuity-corrected version.

- **Raw switch at 10 is non-monotonic:** 185×10 scores 246.7 (Epley) but 185×11 scores 235.2 (Lombardi) — doing MORE reps at the same weight LOWERS the score; you'd need **18 reps** to re-match your own 10-rep number. Graph dips when the user adds a rep. Disqualifying.
- **Stitched version breaks goal grading:** per-rep increments become 10→11 = 0.96%, 11→12 = 0.87% — *below the ~1% goal-met tolerance*. A user who merely repeats 190×10 would auto-"meet" a 190×11 goal via e1RM equivalence → progression stalls at the top of the working range. (Epley keeps 2.3–2.4%/rep through 12, comfortably above tolerance.)
- Concession: Lombardi DOES kill the gross inflation (135×35: Epley 292 → Lombardi ~193, cap-12 189) — the instinct is right. But the cap achieves the same with one clause, stays monotone-flat past 12, and matches the stated need *exactly*: "higher reps don't look like they did more" = zero credit past 12, whereas Lombardi still grants some.
- **General principle extracted:** in the working range (8–12), the per-rep e1RM increment must exceed the goal-met tolerance (ideally ~2×), or equivalence grading eats the progression. Cap-at-12 Epley satisfies this; any flatter curve doesn't.

**Lombardi revisited as a dip-minimizer (rev 11) — conceded, still rejected.** Owner asked: isn't Lombardi better if the goal is small jump fluctuations? Mathematically yes: the 185×12 → 190×8 dip is −1.4% under Lombardi vs −7.1% under capped Epley. But the cure is the disease: each rep is worth only ~1%, so a full 8→12 cycle shows as ~+4.8% (vs +10.5%) — the graph stops rewarding rep progress at all — and grading breaks (0.9–1.2%/rep ≤ tolerance → repeat last session, auto-meet the goal). **Impossibility result:** dip-free needs per-rep slope ≤ ~0.7% (4 reps ≤ the 2.7% weight increment); gradable +1-rep goals need ≥ ~2%. No single curve satisfies both — a dip-free formula is necessarily progress-blind. The dip is therefore a UX problem, not a formula problem, and it's already solved (max chip + climb-back state). Capped Epley stands.

**Wathan also analyzed, also rejected (rev 10).** Wathan = 100w / (48.8 + 53.8·e^(−0.075r)) — sigmoid with asymptote ~2.05×. Factors vs Epley: r=8: 1.277/1.267, r=10: 1.347/1.333, r=12: 1.415/1.400 — **within ~1% of Epley through the whole working range** (discrimination fine: ~2.4–2.5%/rep). But the flattening arrives too late for our failure cases: r=20 → 1.645 (Epley 1.667, barely different), so **185×20 still scores 304 and still out-ranks 225×8 at 287 — the scenario-16 anchor hijack survives intact**. The asymptote only tames 25+ rep absurdity (135×35 → 256 vs Epley 292), and uncapped it still leaves gaming windows (165×30 → 303 beats a 225×9 goal at 295). Conclusion: **every formula in this family needs the rep cap anyway** — they're all fit to ~1–10-rep test data and extrapolate garbage beyond it; the cap is a validity boundary, not a curve preference. And once capped at 12, Wathan and Epley differ by ≤1.1% everywhere they're used — switching buys nothing and costs familiarity + the existing `estimate1RM`. (Same conclusion generalizes: Brzycki over-credits high reps even worse (r=20 → 2.12×); Mayhew flattens earlier but dulls 11→12 to 1.7%/rep and still needs the cap.)

## Alternative equivalent goals (owner's idea — decided: no menu)

e1RM-equivalent targets (190×8 ≈ 195×7 ≈ 185×9) are mathematically feasible in this range (5 lbs ≈ 1 rep). Decision: keep ONE primary suggestion — a mid-workout menu is decision fatigue, invites weight-hopping (dissolves double progression's legibility), and off-weight equivalents sometimes only exist as fractional reps. Equivalence lives in: grading (fix 1), a possible "or match it heavier" subtext, and post-hoc credit copy ("195×7 — counts!"). Alternatives behind a tap at most.

**Rev 5 variant (owner): strength (<6) / hypertrophy (8–12) / endurance (12–20) goal triad per session — rejected.** Same menu problems, plus: progression state triples or cross-contaminates (which lane anchors the next session? a strength day + endurance day fills the 2-session window with incomparable sessions); Epley is untrustworthy past ~12 reps so endurance targets would come from a formula we've explicitly capped; auto-generated <6-rep heavy targets put beginners into max-adjacent work unprompted (the prescribed-jump risk). Direction instead: **one lane per user/exercise** — onboarding asks strength vs hypertrophy (endurance as third option), REP_CAP/REP_RESET become per-mode constants, per-exercise override later. Same engine, one goal per session, personalized range. Endurance-mode caveat: e1RM equivalence stops being meaningful past the formula's rep cap — grade by weight AND reps there.

**Rev 6 DECISION (owner):** onboarding approach locked. The mode-label education idea ("Hypertrophy goal: 190×8", rep-range-to-outcome explainer) is shelved to the **future rep-range settings screen**, not the session goal card.

## Case-10 immediate walk-down — RESOLVED (rev 6: keep rev-4 behavior)

Owner challenged the immediate same-weight walk-down in rev 5 ("hold the goal; the window recalibrates on a second miss anyway"). Once it was clear the rule exists for the **failed weight jump** (scenario 9 — without it, goal 190×8 gets re-asked right after a 190×5, the rejected "try the jump again" case), owner's call: **keep it — after any attempt at/above the goal weight, the next goal adjusts with the user (best attempt there + 1)**. Options B (pure hold) and C (latest+2 cap) considered and shelved.

Documented consequence (accepted): same-weight rep dips track latest+1 immediately every session; weight dips get one session of grace via the two-session window (no attempt at the goal weight to bind on). On a pure off day the cost is one slightly-easy goal the user beats anyway — and the anchor restores the ladder the moment they perform. Redirect's weight-selection role (scenario 13 → 195×6) and the reps<4 max-test guard are unchanged.

## Rev 20 — owner's stress-test of the engine (one real spec gap found)

**1. "195×11 then 200×8 — which anchors?"** Capped Epley: 195×11 = **266.4**, 200×8 = **253.3**. Correction to the premise: 200×8 is *behind*, not ahead (3 reps ≈ 10%, 5 lbs ≈ 2.5%) — it plots lower on the graph and takes 200×10 (266.6) to reclaim the peak. Resolution depends on session structure:
- **Same session:** redirect considers all sets ≥ suggested weight and takes the best → 195×11 wins → goal **195×12**. Not a "drag back down" (195 is where they did their best work that day, not stale data).
- **Two sessions (200×8 latest):** redirect sees only the latest session → goal **200×9**. Follows the user up, same as scenario 13.
- Minor wart (accepted): after hitting 195×12 the cap fires → next goal 200×8, a number already demonstrated 3 sessions ago (2-session window has forgotten it). Harmless — they beat it, and e1RM grading credits it.

**2. "Business case: anchor on the latest weight instead of betting it was an off day?"** Rejected; the bet is already covered better. Real injury produces **absence, not weak sessions** → ≥14 days → the calibration gate fires → no suggestion at all. The riskiest case (pre-injury numbers to a damaged lifter) is structurally unreachable. The 2-session window only covers the narrow middle (training again <14 days at much lower weight), where exposure is exactly **one stale number**, and a suggestion is not a command. Cost of the alternative: one bad night's sleep → goal drops to 135×6 → user blows past it → "Goal hit ✓" fires for a garbage session. **An unreachable goal is ignored for one session; an unmissable goal is worthless forever** — and auto-lowering on one bad day IS the false-positive deload, arriving by another door. Off days are common, injuries rare; don't tax the common path.

**3. GAP FOUND — the low-rep guard must cover the ANCHOR, not just the redirect.** Owner's example: working sets 135×5, plus a 225×1. e1RM 135×5 = **157.5** vs 225×1 = **225** → the single wins the anchor contest outright and `applyProgression` yields **225×2**, a prescribed max double. The rev-4 guard was written on the redirect only, so it never fires here. (Scenario 12's 200×2 + 185×10 works only because 185×10 = 246.6 > 213.3 — the e1RM ranking saves that case by luck of the numbers, not by rule.)
- **Fix:** low-rep sets don't anchor *or* redirect — but a blanket exclusion would starve singles-only lifters (scenario 20) into a permanent calibration state. Rule: **prefer working sets (reps ≥ guard) when any exist in the window; fall back to low-rep sets when that's all there is.** Max tests inform the graph and est. max; they never set prescriptions.
- **Why the guard exists (clarified — it is NOT "low reps aren't real work"):** it marks where the **+1-rep operator** stops being valid. 190×8 → 190×9 is +2.6% at ~75% 1RM (routine); 225×1 → 225×2 is +6.7% and demands a ~240 1RM next session, in the most injury-dense zone. Direct sibling of the rep cap at 12: that bounds where *Epley* is valid, this bounds where *+1 rep* is valid.
- **On "they can obviously do more than 135×5":** true, and accepted. The alternative is a % guess — 80% of 225 = 180, a **+45 lb jump** on their working weight (the rev-14 injury case). The system doesn't need to guess: the moment they work at 145 or hit 135×8, anchor + redirect follow immediately. It follows demonstrated performance; it won't lead into max territory.
- Threshold: lean **4** (4–5 rep sets are common working sets in strength-leaning programs and shouldn't lose coaching).

## Rev 21 — ladder position, % seeding, and a rep-range-relative floor

**1. "200×8 IS ahead" — owner correct, conceded.** e1RM measures strength; double progression is a *sequence* (195×11 → 195×12 → 200×8). A lifter who has done 200×8 cleared a rung the e1RM score can't see. Ladder position is the relevant ordering for goal-setting; e1RM stays the right ordering for the graph and grading.
- **Fix (one line):** the redirect's tie-break changes from **best-e1RM** qualifying set → **heaviest** qualifying set. Rule: *among the latest session's sets at or above the suggested weight with reps ≥ floor, take the heaviest, target weight × (reps+1).*
- Traced against all scenarios: 195×11+200×8 → **200×9** (was 195×12) ✓; 195×5 → 195×6 unchanged; failed jump 190×5 → 190×6 unchanged; 200×2+185×10 → 185×11 (floor excludes the double); sick-day 135×10 → 190×9 **held** (nothing reaches the goal weight, so the redirect can't fire — the two-session noise filter survives intact). Ladder-jumping upward + noise-filtering downward fall out of the same condition.

**2. "What if only a 1RM is logged?" — rev-20's fallback is BROKEN, and % seeding is the fix.** With only 225×1 in the window, the fallback yields `applyProgression(225,1)` = **225×2** — the exact max-double the guard exists to prevent. Every non-% alternative is worse (repeat 225×1 = no progression; 230×1 = a max attempt every session; no suggestion = unhelpful when data exists).
- **Principle (supersedes the blanket rev-14 rejection):** **% seeds when there is nothing to follow; performance leads whenever there is.** Rev 14 correctly rejected % as an *override* of demonstrated working sets (80% of 225 = 180 for a true 135×5 lifter is a +45 lb prescription). A seed in an empty room is not an override. Conservative side of the tables: ~70–75% for the bottom of an 8–12 range, ~85% for 3–6.

**3. "80% beats 135×6 on credibility" (135×5 + 225×1) — owner's argument accepted in part.** Physiology: 135×5 to failure implies a 1RM ≈ **157**, but they singled **225** — a 1.43× gap, so both cannot be maximal. A single is almost always a true effort; a 5-rep set at 60% is very likely submaximal (plausibly a warmup en route to the 225). So "follow the working sets" may be anchoring on a warmup, and 135×6 does read as uninformed.
- Counter-risk: we cannot distinguish "warmup" from "deliberately light" (rehab, technique, post-injury), where 80% is the injury path.
- **Resolution via rep ranges:** for a hypertrophy user *neither* set is inside 8–12 → no in-range set to progress from → that IS the empty-room condition, so seeding is principled here, not an override. Rule: **if nothing in the window sits inside the user's rep range, seed from estimated max; if something does, follow it.**
- **Guard on the guard:** if a user *consistently* trains outside their stated range (hypertrophy setting, always 5s), behavior wins over the setting — follow their 5s and nudge them to change the range. Never fight logged behavior with % every session.

**4. The low-rep floor must be rep-range-relative, not a fixed 4.** A 3-rep set is a max test for a hypertrophy lifter and normal work for a strength lifter — one constant cannot serve both. **Floor ≈ a few reps below the bottom of the user's range, never below 3.** Hypertrophy (8–12) → ~5 (keeps case 13's 195×5 eligible, excludes a 225×3 max test); strength (3–6) → 3 (working triples eligible, singles not); endurance (12–20) → ~9. Joins REP_CAP/REP_RESET as a per-mode constant — which makes the onboarding rep-range question a **dependency of the engine**, not just a UX nicety.

## Rev 22 — SIMPLEST VIABLE IMPLEMENTATION (owner: "we don't want complex logic to maintain")

Two of the three mechanisms collapse into one. This supersedes the FINAL ruleset above where they conflict.

**Collapse 1 — anchor by HEAVIEST qualifying set; the redirect disappears.** The redirect existed only because e1RM ordered by strength while double progression is a ladder (rev 21). Once ladder position wins, anchor and redirect are the same question. One rule:

> **Goal = `applyProgression(` heaviest set in the last 14 days with reps ≥ MIN_REPS `)`. Ties → more reps.**

Scenario trace: 195×11+200×8 → **200×9** ✓ · failed jump 185×12+190×5 → 190×6 ✓ · sick day 190×8+135×10 → 190×9 ✓ (noise filtered on weight) · self-selected jump 185×12+195×5 → 195×6 ✓ · burnout 205×8+185×20 → 205×9 ✓ · bodyweight 0×9+0×11 → 0×12 ✓ (tie on weight → reps).
Note: heaviest-anchoring is **immune to the Epley burnout bug by construction**. The rep cap is still needed, but only for the graph + "Estimated max" chip — not to protect the engine.

**Collapse 2 — `isGoalMet` stops being load-bearing.** With the goal a pure function of the window, there is no "met → advance" branch; the goal is recomputed from logged history every render. Stateless, idempotent, nothing to migrate, cannot drift or wedge. `isGoalMet` survives only to choose the celebration label, reusing the same comparator: `goalHit = betterOrEqual(todaysHeaviest, goal)`. No e1RM, no float, no ~1% tolerance to tune (kills open question #2). A wrong answer mislabels a chip; it cannot corrupt progression.

**Ships (≈40–60 lines, mostly replacing `pickBestSet`/`getDailyGoal`):**
1. `betterSet(a, b)` — heavier wins; tie → more reps. **One comparator, used twice.**
2. 14-day window filter.
3. `reps >= MIN_REPS` filter — ship **5**, a single constant (not a per-mode table yet).
4. `applyProgression(anchor)` — existing function, untouched.
5. Empty window → `null` → calibration copy (already required).
6. `Math.min(reps, 12)` inside `estimate1RM` — independent one-liner, graph-side.

**Deliberately cut, with cost stated:**
- *e1RM anchoring* — cost none. Checked the worry case (one-off 225×5 among 185×10s): e1RM picks it too (262 vs 247), so both designs anchor there. The simplification adds no new risk.
- *"most recent 2 sessions"* — drop; keep 14 days only. A second window axis is a second thing to reason about, and heaviest already filters bad days.
- *% seeding (rev 21 #2/#3)* — **defer**. It is the only branch prescribing a weight the user has never lifted: highest injury risk, lowest frequency. Without it the only-a-1RM user falls through to the calibration prompt ("log a working set") — degrades to honest, not to wrong.
- *Per-mode constants* — one value now. Onboarding rep-range doesn't exist yet; when it ships, MIN_REPS/REP_CAP/REP_RESET become a lookup — mechanical against a stateless engine.

### Rev 22a — the only-a-1RM case, revisited (partial reversal of the seeding cut)

Under rev 22 as written, `225×1` fails `reps ≥ MIN_REPS` → empty qualifying window → `null` → calibration prompt. Correct for a **one-off** max test (self-heals on the next 5+ rep set, never prescribes off a single). But for a user who logs **only** singles it is a *permanent dead state* — the app never coaches them and the prompt doesn't say why. Rev 22 understated this.

**Fix — one line, zero new constants.** Invert the existing `estimate1RM` against the existing `REP_RESET`:

```
seedWeight = estimate1RM(best) / (1 + 0.0333 × REP_RESET)   → rounded to increment
225×1 → e1RM 225 → 225 / 1.266 = 178 → 180 × 8
```

Why this reverses the rev-22 cut: the objection was "a second source of truth prescribing an untested weight." Reusing the inverse of a function already in the engine is the *same curve read backwards* — no percentage table, no per-mode tuning, no new tunables (kills the rev-21 "% per range" open question).

Error direction is safe both ways: submaximal single → seed is easy; genuinely maximal single → seed is an appropriate 8RM effort. Only a *mis-logged* single is dangerous, and that already poisons the heaviest-anchor rule, so it is not new exposure.

Scope guard unchanged: fires **only** when nothing in the window has `reps ≥ MIN_REPS`. `135×5 + 225×1` still anchors `135×5 → 135×6` — performance leads whenever there is any.

### Rev 22b — seed prescribes 6 reps, not 8 (owner's branch, adopted with two changes)

Owner rejected the "log a working set to start" copy as a dead-end message — **dropped**. That copy now appears only when the window has *no sets at all*.

Owner's proposal (`reps < 5` + first session → 80% at 6 reps) and rev-22a **agree exactly on the weight**: 225×1 → 80% = 180; e1RM path = 225/1.2664 = 177.7 → 180. The correction is the **rep count**, and it is right: 180 is ~80% of max = an **8RM** by the tables, so 180×8 is a first coached session at 0 RIR off one rep of information. A first-session miss is the worst possible first impression. 6 reps ≈ 2 RIR.

**FINAL seed:**
```
seedWeight = estimate1RM(best) / (1 + 0.0333 × REP_RESET)    // the 8-rep point
goal       = seedWeight × 6                                   // 2 reps of buffer
```

**Change 1 — derive weight from e1RM, not flat 80% of logged weight.** They coincide at 1 rep but diverge above it, and the branch fires on `reps < 5`, so higher rows get hit: 200×4 → flat 80% = **160×6** (a visible downgrade from what they just lifted) vs e1RM = 190×6 ✓. 220×4 → 176×6 ✗ vs 195×6 ✓.

**Change 2 — gate on "nothing in the window qualifies," NOT "first session ever."** The first-session gate reintroduces the dead state one session later: session 1 logs 225×1 → seed fires; session 2 logs 235×1 → not first session, nothing qualifies → blank. Also one condition instead of two.

**Self-terminating property (deliberate — needs a test):** the seed prescribes **6 reps > MIN_REPS = 5**, i.e. above its own trigger floor. Log the prescribed set and it qualifies for the normal anchor, so the seed never fires again. A 4-rep seed would loop forever.

Open (per-mode only): a strength user (3–6) likely wants the seed *at* the range bottom, not two below it. Not a problem for the shipping 8–12 default.

**Accepted cost:** `MIN_REPS` becomes the **single safety dial**. Too low → a max test becomes next session's prescription; too high → legitimate heavy work ignored. That is now one number, reviewable in a test file, instead of a guard threaded through three mechanisms.

## Open questions

- 14 vs 21 days — start 14; fallback to 21 if 1×/week users find one missed week → recalibration annoying
- e1RM tolerance for goal-met (~1%?) — pick exact value at implementation
- Calibration-state copy (both variants) — TBD
- "Need a deload?" passive pill — parked; trigger is trivially detectable later (goal unchanged N sessions)
- Fixed 8–12 rep range forces high-rep compounds; per-exercise rep ranges are a future knob, out of scope now (singles-only loggers get sane-but-mismatched suggestions; scenario 20)

- Redirect low-rep guard threshold (reps < 4? < 5?) — max-test sets must not trigger the redirect
- ~~Reset depth~~ **RESOLVED (rev 7): keep 12→8** — standard bracket, ~3 RIR safety margin post-jump, satisfying climb cadence; its only real cost was the graph dip, now handled graph-side. Adaptive variant rejected (see Rejected).
- ~~Graph remedy~~ **RESOLVED (rev 13): honest line + capped formula + existing max chip + existing goal-hit celebrations — nothing new ships for the dip.** All text/message/decoration approaches rejected (owner: glanceable or nothing).
- Rep-range personalization: onboarding approach LOCKED (rev 6) — strength-vs-hypertrophy(-vs-endurance) question + per-exercise override; REP_CAP/REP_RESET per-mode constants, formula rep cap stays ~12. Remaining: scope/priority + the settings-screen education content (shelved triad labeling lands there)

## Verify in codebase before implementation

- ~~How are bodyweight exercises logged~~ → partially answered: `effectiveLoad` exists in fatigueFunctions (bodyweight-aware); decide if progression/graph adopt it
- ~~Can the UI produce a 0-rep log?~~ → `estimate1RM` already guards reps ≤ 0; progression should reuse the same function
- Unit-switch behavior (lbs↔kg) on stored log weights — pre-existing question, unchanged by this redesign
