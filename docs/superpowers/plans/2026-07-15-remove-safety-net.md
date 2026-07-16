# Remove Auto-Maintain Safety Net — Level-Triggered Ask (issue 8 revision)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automation never changes goal direction. The single "Goal Reached!" prompt becomes level-triggered — it asks on EVERY weigh-in at/past goal until answered — and the banner persists until a new goal is set.

**Decisions locked in review (2026-07-15):**
- Delete the deadband auto-switch AND its "Goal Passed — Now Maintaining" announcement card.
- Prompt condition = banner condition + not-acknowledged: `!goalOvershootAcknowledged && isGoalReached(newSettings)`.
- Dismiss = "not now" → asks again next weigh-in past goal. Keep Going = "stop asking" (flag keeps its column; smaller meaning). Switch to Maintenance stays as the consented tap (anchored at goalWeight).
- Coverage model: prompt follows the person (global host, any weigh-in surface); banner holds the progress screen.
- No DB change.

**Tasks:**
1. `bodyWeightFunctions.tsx`: `BwPrompt = 'goalReached'`; delete `OVERSHOOT_DEADBAND`/`pastDeadband`/`atOrPastGoal` and the net branch; prompt from the shared predicate. `types.ts`: `pendingGoalPrompt: 'goalReached' | null`.
2. `GoalReachedPrompt.tsx`: drop `variant`/ShieldCheck/two-button branch; three required action props; keep the new animation. `GoalPromptHost.tsx`: drop variant plumbing.
3. Dev Hub: `goalReachedLogic.ts` narration (no net; "asks until answered"); `GoalReachedSimTest.tsx` WeightTrack loses the act zone/deadband edge + captions; `GoalReachedTest.tsx` loses the variant toggle.
4. Tests (`computeBwUpdate.test.ts`, `goalReachedLogic.test.ts`): delete deadband/auto-maintain cases; add level-trigger case (consecutive weigh-ins past goal both ask); keep Keep-Going disarm, customized-preservation, consented-switch, anchor tests.
5. Docs: spec behavior table + status; AUDIT_MAJOR step 4 + Verify lines.
6. Verify (`npx jest components/devTest context/SettingsContext`, `npx tsc --noEmit`) → code-simplifier over changed files.
