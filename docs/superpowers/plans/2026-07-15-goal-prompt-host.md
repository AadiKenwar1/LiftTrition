# Goal Prompt Global Host (issue 8 refinement) Implementation Plan

> **NOTE (historical record):** the `'autoMaintain'` prompt variant referenced below was
> removed with the safety net (plans/2026-07-15-remove-safety-net.md); `pendingGoalPrompt`
> is now `'goalReached' | null` only.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The weigh-in sheet always closes immediately; the goal prompt then appears over whichever screen is behind it, hosted once at the app level.

**Architecture:** Prompt visibility becomes transient context state (`pendingGoalPrompt`) set by `handleUpdateBw` itself. A new `GoalPromptHost`, mounted once in `StackLayout`, renders `GoalReachedPrompt` deferred via `InteractionManager.runAfterInteractions` (opens only after the nav dismiss animation completes). Decisions locked in review: prompt persists across backgrounding (no AppState dismiss); no DB change (state is ephemeral by design — the banner is the durable channel); host reads goalWeight/unitSystem live from settings; onboarding guard.

**Tech Stack:** React Native/Expo, existing GoalReachedPrompt component, Jest.

## Global Constraints

- NO git commits/branches — user owns version control.
- No schema/migration changes.
- `switchToMaintenance` / `acknowledgeGoalOvershoot` context actions already exist — reuse.

---

### Task 1: SettingsContext owns the pending prompt

**Files:** Modify `context/SettingsContext/index.tsx`, `context/SettingsContext/types.ts`.

- [ ] Add `pendingGoalPrompt` state + `dismissGoalPrompt` callback; `handleUpdateBw` sets the state instead of returning the prompt (return type back to `Promise<void>`); reset the state in the user-load effect; expose both in the provider value.
- [ ] types.ts: `handleUpdateBw: (updatedWeight: number) => Promise<void>`, add `pendingGoalPrompt: 'goalReached' | 'autoMaintain' | null` and `dismissGoalPrompt: () => void`.

### Task 2: GoalPromptHost

**Files:** Create `components/NutritionComponents/GoalPromptHost.tsx`.

- [ ] Reads useSettings; local `visible` flipped by `InteractionManager.runAfterInteractions` when `pendingGoalPrompt` is set (cancel on cleanup); renders null unless a prompt is pending, onboarding is complete, and visible. Buttons: SwitchToMaintenance → `switchToMaintenance()` + dismiss; SetNewGoal → dismiss + `router.push` wizard; KeepGoing → `acknowledgeGoalOvershoot()` + dismiss; Dismiss → dismiss.

### Task 3: Mount + simplify callers

**Files:** Modify `app/_layout.tsx` (render `<GoalPromptHost />` after `</Stack>` inside AppColumn in StackLayout), `app/nutritionScreens/updateBWModal.tsx` (remove local prompt state/JSX/imports; Update button fires `handleUpdateBw` and `router.back()` unconditionally).

- [ ] adjustMeasurements needs no change — it now gets the prompt for free via the context.

### Task 4: Verify + docs + simplifier

- [ ] `npx jest components/devTest context/SettingsContext` → all pass; `npx tsc --noEmit` → no new errors.
- [ ] Spec doc: one-line addendum (prompt hosted globally; sheet closes first).
- [ ] code-simplifier agent over the changed files.
