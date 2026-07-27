# progressFixes — scenario walkthroughs (plain English)

_Every case below is asserted in `context/WorkoutContext/functions/__tests__/progressionFunctions.test.ts`.
If this file and that file disagree, the test file is right._

_Shipped as of the engine rewrite: `progressionFunctions.ts` + `components/WorkoutComponents/ProgressIndicator.tsx`._

## The rules, as a user would experience them

- The app looks at your **last two sessions that count**, and only ones from the **past two weeks**.
- From those it takes your **heaviest set** — heaviest bar wins; same bar, more reps wins; same
  both, the later set wins. It then asks you to **beat it by one rep**.
- Hit **12 reps** and the weight goes up, reps drop back to 8.
- **One off day doesn't count.** If the session before your last one was both heavier *and* more
  work, that one stays your bar.
- Sets under **3 reps** are max tests, not working sets — they never set your bar. If you have
  nothing at 3+ reps, anything at 2+ counts instead, so a lifter who trains in doubles still gets
  coached rather than ignored.
- You **beat your bar** four ways: do the suggested set; do more reps on the same bar or heavier;
  go heavier at no more than one rep fewer; or simply out-work it (weight × reps, with rep credit
  stopping at 12). A tie is not a beat.
- Nothing in the last two weeks, or nothing that counts? No bar — and it tells you what it needs.

**What the app never does:** prescribe a weight you've never lifted, tell you to deload, or ask for
more than one rep beyond what you last showed.

---

## A. Happy paths

**1. Normal week-to-week progress**
Monday you bench 185×8. Thursday the app says: go for 185×9. You get it. Next workout: 185×10. Up to 12.

**2. Hitting 12 reps — the weight goes up**
You finally get 185×12. Next workout: **190×8** — more weight, reps reset.

**3. The bug that started all this (the 195×7 case)**
Last workout: 190×7, so today's suggestion is 190×8. Instead you load 195 and get 7. The old app said
"goal not hit" — insulting, since you just lifted heavier than ever. The new app compares you against
your **bar** (190×7), not against the suggestion, and 195×7 out-works it by 2.6%. **Goal hit ✓**, and
it looks ahead to **195×8**.
*(This is why the suggestion is only one of three ways to pass — grading against a number nobody has
ever lifted was the whole defect.)*

**4. The same thing in reverse (lighter, more reps)**
Suggestion is 190×8, but 185 feels good and you rep out 185×10. Stronger than your 190×7 bar, so:
**goal hit ✓**.

**4b. …and next session the app follows you**
History is 190×7 then 185×10. The off-day rule checks whether the older session was heavier *and*
stronger — 190 is heavier, but 190×7 is **less work** than 185×10, so it does not hold. Your bar is
185×10 → **185×11**. *(Weight alone would have stranded you back at 190×8. This is the case that
actually regressed during design and it exists to stay caught.)*

**5. You log your warmups**
You log 135×10, 155×8, then 190×8. Heaviest bar wins, so tomorrow builds off the 190×8 → **190×9**.

**6. First time doing an exercise**
No history → no bar. *"Log a set to start getting suggestions."* You log 185×8 and it immediately
shows **next session: 185×9**.

## B. Challenging cases

**7. One bad day**
Monday 190×8, Thursday you're sick and manage 135×10. Monday was heavier *and* more work, so it
holds → **190×9**. One bad day is noise.

**8. Two bad days in a row**
Both sessions 135×10. Same weight, so nothing holds → **135×11**. One bad day is noise; two is a
pattern, and the app follows you down.

**9. You fail a weight jump**
185×12 earned you 190×8. You try 190 and get 5. The older session is *lighter* (185 < 190), so it
can't hold — your bar is 190×5 → **190×6**. You climb back rep by rep instead of being re-asked for
three more than you just showed.

**10. You're genuinely getting weaker**
Bar was 190×8; you get 190×7 — a miss (a tie or a drop is not a beat). Same weight, so no hold, and
your bar becomes 190×7 → **190×8**. It walks down *with* you, always exactly one rep ahead.

**11. You deload on purpose**
You've been hitting 225×10 and take a light week: 185×8. The 225×10 is heavier and far more work, so
it holds → **225×11**. Take a second light session and it accepts the new reality → 185×9. It never
tells you to deload and never punishes you for one. Known trade-off: pushy for exactly one session.

**12. You max out AND do working sets**
Same session: a heavy 200×2 plus real work at 185×10. The 200×2 is under the 3-rep floor, so it isn't
a working set and never enters the comparison → **185×11**. *(Not an e1RM judgement — the double is
filtered out before anything is compared.)*

**13. You went heavier than planned, for fewer reps**
Two workouts ago 185×12; last workout you moved up on your own to 195×5. The older session is lighter,
so it can't hold, and your bar is the 195×5 → **195×6**. Beat what you just did, where you chose to
do it. *(No special "redirect" rule — this falls out of anchoring on the heaviest set.)*

## C. Edge cases

**14. You took two-plus weeks off**
13 days → normal suggestion. 15 days → no bar: *"Been a while — log a set to reset your bar."* Exactly
14 days still counts.

**15. You only train this exercise every ~10 days**
Never triggers the "been a while" state. Only true 2-week gaps ask for a reset.

**16. The burnout set problem**
Session: 225×8 of heavy work, then a 185×20 finisher. The bar is the **heaviest set**, so 225 beats
185 and tomorrow is **225×9**. *(The rep cap is not what saves this — weight-first ordering is. The
cap matters for grading and for the graph, not for picking your bar.)*

**17. Gaming the goal with a high-rep light set**
Bar 225×8. You log 135×35. Not the suggested set, not the same bar or heavier, and with rep credit
stopping at 12 it scores like 135×12 — nowhere close. **No credit.**

**18. A 13th rep still counts**
Bar 170×12, suggestion 175×8. You stay at 170 and grind out 13. The formula stops crediting reps at
12, so on paper 170×13 ties 170×12 — but more reps on the same bar is more work, full stop. **Goal
hit ✓**, no formula involved.

**19. Bodyweight exercises**
Weight 0, so bars tie and the reps tie-break decides: 0×9 then 0×11 → **0×12**. Grading adds your
profile body weight, so a 5 lb belt for 12 correctly outranks bodyweight for 15, while bodyweight for
15 outranks a belted triple. At 12 reps it suggests adding 5 lbs; keep repping out instead and the
more-reps rule still gives you the hit.

**20. Someone who only does heavy singles or doubles**
Doubles: nothing clears the 3-rep floor, so the 2-rep floor takes over → 230×2 becomes your bar →
**230×3**. Singles only: nothing clears either floor → no bar, *"Log a set of 2+ reps to get a
suggestion."*

**21. You edit or back-fill old workouts**
Everything recalculates, because the bar is always computed fresh from your logs. Nothing is stored,
so nothing can go stale or contradict. Viewing an earlier date is safe too — later sessions are
invisible to it.

**22. You train twice in one day**
Both count as one session (grouped by calendar date). The heaviest set of the whole day wins.

**23. Two identical sets**
Deterministic tie-breaks — bar, then reps, then time. The later set wins and the app never flip-flops
about which one it considers best.

**24. You grind out a max single**
Bar was 190×7; instead you test yourself with a grindy 225×1. Singles aren't working sets, so that
**whole day is invisible** — your bar stays 190×7 and the suggestion is unchanged at 190×8. The single
also doesn't count as a hit: with an estimated max of ~234, a 225 single is submaximal. It still shows
on the strength graph; it just moves nothing here.

**25. A day of only doubles, when you do have working sets elsewhere**
Window holds a 200×5 six days ago and only 225×1 / 225×2 three days ago. Because working sets exist
*somewhere* in the window, the 2-rep fallback never engages — the doubles day is skipped entirely and
your bar stays 200×5 → **200×6**. The fallback is all-or-nothing across the window, not per-day.

**26. The off-day rule can't reach back past two weeks**
225×10 sixteen days ago, 185×8 three days ago. The older session would have held — but it's outside
the window, so it isn't there to hold. Your bar is 185×8 → **185×9**.

**27. Any set can carry the session**
You open with 135×5 (a miss) and finish with 195×7. The hit is per-set, so the session counts. It
doesn't have to be your top set or your last one.

**29. You go heavier for one fewer rep**
Bar is 195×8; you load 200 and get 7. On estimated max that's 246.62 against 246.95 — **0.13% short**,
a difference nobody can feel, and refusing to credit added weight is the exact defect #3 exists to
fix. Heavier bar at no more than one rep fewer counts: **goal hit ✓**. Get 200×6 and it doesn't —
two reps is a real step back.
*(Measured against your bar's reps, never a fixed number. A rule like "5+ reps and heavier" would
call 200×5 a hit against a 195×12 bar — a 14% regression dressed up as progress. It also has to be a
working set, so a heavier max single can't sneak in this way.)*

**30. …and either way, next session moves to 200**
Hit or miss, 200 is now the heaviest bar you've shown, and the older 195 session can't hold because
it isn't heavier. 200×7 → **200×8**; 200×5 → **200×6**. Grading decides whether you get told well
done; it never decides where the bar goes.

**28. The strength graph dips after a weight jump**
You hit 185×12 and move to 190×8. The graph plots estimated 1RM, and 190×8 scores ~7% *lower* than
185×12 — the line visibly dips and stays under your old peak for about three sessions. Nothing is
drawn to explain it. Two things carry the moment without any reading: the "Estimated max" number
beside the graph doesn't drop, and you hit your goal every session of the climb (190×8 ✓, ×9 ✓, ×10 ✓),
so the app is celebrating you the whole time the line is below your peak.

## D. When there's no bar

Three different reasons, three different asks:

| What happened | What it says |
|---|---|
| Never trained this exercise | *Log a set to start getting suggestions.* |
| Nothing in the last 14 days | *Been a while — log a set to reset your bar.* |
| Logged, but nothing at 2+ reps | *Log a set of 2+ reps to get a suggestion.* |

Log a set on any of these and it immediately shows **next session's** suggestion — the day is settled,
so there's nothing left to aim for on it. That's the same reason a beaten goal looks ahead; the only
difference is that a beaten goal also says **GOAL HIT!**.

---

## Settled since the first draft

- **How bodyweight is stored** → `equipment === 'Bodyweight'` on the exercise library entry.
  Progression reuses `effectiveLoad`'s approach and takes profile weight from `settings.bodyWeight`.
- **Can the UI log 0 reps?** → No. The rep floor would exclude it regardless.
- **The low-rep threshold** → `MIN_REPS = 3` for working sets, `HARD_FLOOR = 2` as the fallback.
- **Rep-credit cap** → applied at the engine's call site only. `estimate1RM` stays uncapped, so the
  strength graph and the "Estimated max" chip are unchanged. Deliberate: capping the shared formula
  would visibly move every existing user's chart. The cost is that the graph and the progression logic
  can disagree about which set was strongest on a high-rep day.
- **The redirect rule** → deleted. Anchoring on the heaviest set produces the same outcomes (#9, #13)
  without a separate rule.
- **Tolerance band** → deleted. When the target was a synthesized number a 1% band still sat above your
  last performance; now that the reference *is* your last set, any slack would forgive real regression
  and compound session over session.

## Still open

- **Rep ranges per training goal** (#20). A strength lifter climbing 3→12 reps before a weight jump is
  being coached in the wrong range. The planned strength / hypertrophy / endurance onboarding question
  turns `MIN_REPS` / `REP_CAP` / `REP_RESET` into a per-mode lookup. Purely additive — existing users
  default to hypertrophy and get byte-identical output, and a mismatched range now costs a suboptimal
  hint rather than a withheld celebration.
- **Mixed bodyweight and belted work** reads reps against estimated max when profile weight is unset.
  Correct in every traced case, but the honest fix is `effectiveLoad` throughout.
- **`getAnchor` keys by exercise ID; `oneRMMap` keys by name.** Two exercise rows sharing a name share
  a graph bucket but get separate coaching. Pre-existing.
