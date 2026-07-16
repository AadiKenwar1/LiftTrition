# AUDIT_MINOR Fixes — Implementation Plan (all 18 issues)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every issue in `docs/AUDIT_MINOR.txt` (2026-07-12 audit, minor tier) — documentation of the fixes only; no code has been changed yet.

**Architecture:** Eighteen independent tasks ordered exactly as the audit file orders them (easiest → hardest). Contained logic fixes first (Tier C), cross-cutting label/helper sweeps (Tier D), async/lifecycle timing (Tier E), then structural/schema/build work (Tier F). Shared helpers land in `lib/utils/`; settings defaults get one exported constant; the dead-code test gap is closed by making the tested pure functions the code the provider actually runs.

**Tech Stack:** React Native/Expo SDK 54, TypeScript strict, PowerSync + SQLite, Supabase, Jest (jest-expo).

## Global Constraints

- **NO git commits/branches/pushes** — the user owns all version control. Leave changes in the working tree. (Overrides this skill's default commit steps.)
- Line numbers below are verified against the working tree as of **2026-07-15** (they differ from the stale numbers in `AUDIT_REPORT.md`; each task quotes the current code).
- Run tests with `npx jest <path>`; typecheck with `npx tsc --noEmit` (pre-existing errors exist in DevStatsModal/Deno functions/old tests — only NEW errors count).
- Verify UI changes in dark **and** light mode where they touch rendered output.
- **Task wrap-up (every task):** delete the issue's entry from `docs/AUDIT_MINOR.txt` (the file's own instruction) and append a one-line postscript to `docs/COMPLETED_ISSUES.txt`.
- Current-state deltas discovered during investigation (already fixed, no work needed):
  - Audit #9's archive-screen sub-item (major #5): `app/workoutScreens/archiveModal.tsx:68-79` now routes deletes through `confirmDelete` — done.
  - Audit #10(a) ingredient totals: `sumIngredients` in `context/NutritionContext/functions/ingredients.ts` is already the single owner; both former copies import it — done.
  - The old "bodyweight-flip resets pace to 0.5" (part of audit #3's context) was removed by the issue-8 work; `computeBwUpdate` no longer writes `goalPace`.
- Dependencies between tasks: Task 12 assumes Task 9's confirm wrapper exists in `LogHistoryList.tsx`. Task 16 supersedes Task 2's two inline edits in `handleAddWorkout`/`handleDuplicateWorkout` (the semantics carry into the shared helpers). Everything else is independent.

---

### Task 1: Debounce workout-note saves via a testable useDebouncedSave hook (audit #1, was #2)

Each keystroke currently runs one PowerSync `writeTransaction` + queues one upload op. A long note = hundreds of sync ops that slow the sign-out flush. Extracting the debounce into a hook (rather than an inline effect) gives it real unit coverage with fake timers — the debounce + unmount-flush behavior is exactly what a timer test pins down.

**Files:**
- Create: `lib/hooks/useDebouncedSave.ts`
- Create: `lib/hooks/__tests__/useDebouncedSave.test.tsx`
- Modify: `app/workoutScreens/notesModal.tsx:26-31` (replace the effect with the hook)

**Interfaces:**
- Produces: `useDebouncedSave(value: string, initial: string, save: (value: string) => void, delayMs?: number): void` from `@/lib/hooks/useDebouncedSave`. Saves at most once per `delayMs` (default 600) of quiet, flushes once on unmount if unsaved, and never saves while `value === initial`.
- Consumes (in the modal): `handleUpdateWorkoutNote(id, note)` from `useWorkout()` (unchanged).

Current code (the per-keystroke effect):

```tsx
    // Auto-save when note changes (after initial load)
    useEffect(() => {
        if (workout && note !== workout.note) {
            handleUpdateWorkoutNote(workoutId, note)
        }
    }, [note])
```

- [ ] **Step 1: Write the failing unit test** (`lib/hooks/__tests__/useDebouncedSave.test.tsx`, react-test-renderer Probe + fake timers, matching `useToday.test.tsx`):

```tsx
import React from 'react'
import { act, create } from 'react-test-renderer'
import { useDebouncedSave } from '../useDebouncedSave'

function Probe({ value, save }: { value: string; save: (v: string) => void }) {
    useDebouncedSave(value, '', save)
    return null
}

describe('useDebouncedSave', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('saves once after the quiet period, not per change', () => {
        const save = jest.fn()
        let r!: ReturnType<typeof create>
        act(() => { r = create(<Probe value="a" save={save} />) })
        act(() => { r.update(<Probe value="ab" save={save} />) })
        act(() => { r.update(<Probe value="abc" save={save} />) })
        expect(save).not.toHaveBeenCalled()          // still typing
        act(() => { jest.advanceTimersByTime(600) })
        expect(save).toHaveBeenCalledTimes(1)
        expect(save).toHaveBeenCalledWith('abc')
    })

    it('flushes the latest value on unmount if unsaved', () => {
        const save = jest.fn()
        let r!: ReturnType<typeof create>
        act(() => { r = create(<Probe value="a" save={save} />) })
        act(() => { r.update(<Probe value="draft" save={save} />) })
        act(() => { r.unmount() })                    // dismissed before the debounce fired
        expect(save).toHaveBeenCalledTimes(1)
        expect(save).toHaveBeenCalledWith('draft')
    })

    it('never saves when the value stayed at initial', () => {
        const save = jest.fn()
        let r!: ReturnType<typeof create>
        act(() => { r = create(<Probe value="" save={save} />) })
        act(() => { jest.advanceTimersByTime(600) })
        act(() => { r.unmount() })
        expect(save).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Run to verify failure.** `npx jest lib/hooks/__tests__/useDebouncedSave.test.tsx` → FAIL (module missing).
- [ ] **Step 3: Implement the hook** (`lib/hooks/useDebouncedSave.ts`):

```ts
import { useEffect, useRef } from 'react'

// Debounces save(value) to at most once per delayMs of quiet, and flushes once
// on unmount if the latest value hasn't been saved. Skips saving while value
// equals initial. Built for the notes modal, which has no save button — the
// unmount flush is the "save on close".
export function useDebouncedSave(value: string, initial: string, save: (value: string) => void, delayMs = 600): void {
    const savedRef = useRef(initial)
    const valueRef = useRef(value)
    valueRef.current = value
    const saveRef = useRef(save)
    saveRef.current = save

    useEffect(() => {
        if (value === savedRef.current) return
        const timer = setTimeout(() => {
            savedRef.current = value
            saveRef.current(value)
        }, delayMs)
        return () => clearTimeout(timer)
    }, [value, delayMs])

    useEffect(() => () => {
        if (valueRef.current !== savedRef.current) {
            savedRef.current = valueRef.current
            saveRef.current(valueRef.current)
        }
    }, [])
}
```

- [ ] **Step 4: Run → PASS.** `npx jest lib/hooks/__tests__/useDebouncedSave.test.tsx`
- [ ] **Step 5: Consume it in `notesModal.tsx`** — delete the per-keystroke effect (lines 26-31) and replace with one call (the `useEffect` import may become unused — drop it if so):

```tsx
    useDebouncedSave(note, workout?.note ?? '', (v) => handleUpdateWorkoutNote(workoutId, v))
```

  Add `import { useDebouncedSave } from '@/lib/hooks/useDebouncedSave'`.
- [ ] **Step 6: Verify.** `npx tsc --noEmit` → no new errors. Manual: open a workout's notes, type ~20 characters quickly, swipe-dismiss immediately → Settings → Developer → Dev Stats (upload queue) shows 1–2 queued workout upserts, not 20; re-open → the full text is there.

---

### Task 2: Scope in-memory order bumps to non-archived rows (audit #2, was #3)

Add/duplicate handlers bump **every** row's `order` in React state but only `archived = 0` rows in SQL. The drift becomes permanent when a later rename/note upsert writes the in-memory row back.

**Files:**
- Modify: `context/WorkoutContext/index.tsx:82-85, 127-130, 271-274, 296-299`

**Interfaces:** none change — these are four in-place expression edits.

- [ ] **Step 1: `handleAddWorkout` (lines 82-85).** SQL counterpart `insertWorkoutWithOrderBump` (`powersyncStore.ts:121`) has `WHERE user_id = ? AND archived = 0`.

```tsx
        setWorkoutsState(prev => [
            ...prev.map(w => (w.archived ? w : { ...w, order: w.order + 1, updatedAt: now })),
            newWorkout,
        ])
```

- [ ] **Step 2: `handleDuplicateWorkout` (lines 127-130).** Same edit:

```tsx
        setWorkoutsState(prev => [
            ...prev.map(w => (w.archived ? w : { ...w, order: w.order + 1, updatedAt: now })),
            newWorkout,
        ])
```

- [ ] **Step 3: `handleAddExercise` (lines 271-274).** SQL counterpart (`powersyncStore.ts:203`) has `WHERE workout_id = ? AND archived = 0`.

```tsx
        setExercisesState(prev => [
            ...prev.map(e => e.workoutID === workoutID && !e.archived ? { ...e, order: e.order + 1, updatedAt: now } : e),
            newExercise,
        ])
```

- [ ] **Step 4: `handleAddExercises` (lines 296-299).**

```tsx
        setExercisesState(prev => [
            ...prev.map(e => e.workoutID === workoutID && !e.archived ? { ...e, order: e.order + names.length, updatedAt: now } : e),
            ...newExercises,
        ])
```

- [ ] **Step 5: Verify.** `npx tsc --noEmit` → no new errors. `npx jest context/WorkoutContext` → green. Manual: archive a workout, note its position in the archive list, add two new workouts, rename the archived one (bakes state back to DB), kill + relaunch → archive order unchanged.

Note: Task 16 later replaces the workout-side inline blocks with shared helpers; the exercise-side edits (Steps 3-4) remain as written. Unit coverage for this bump-scope rule lands in Task 16's helper tests.

---

### Task 3: One exported DEFAULT_SETTINGS constant (audit #3, was #11)

`goalPace` defaults to `0` in `powersyncStore.ts:8` (its own `rowToSettings` at `:23` uses `?? 0.5`!), `0.5` in `index.tsx:23`. Which value a user gets depends on which path hydrated them.

**Files:**
- Create: `context/SettingsContext/defaults.ts`
- Modify: `context/SettingsContext/database/powersyncStore.ts:8, 11-31, 46`
- Modify: `context/SettingsContext/index.tsx:12-30`
- Test: `context/SettingsContext/database/__tests__/powersyncStore.test.ts`

**Interfaces:**
- Produces: `DEFAULT_SETTINGS: Settings` exported from `@/context/SettingsContext/defaults` — the single new-user default object (`goalPace: 0.5`).
- Non-goal: the onboarding pace **slider** starting positions (`pace.tsx:17-20` — `def: 1` imperial / `0.5` kg metric) and the adjust-nutrition wizard's `'0'` route params are deliberate UI seeds, not hydration defaults; they stay.

- [ ] **Step 1: Write the failing test.** Append to `powersyncStore.test.ts` (imports: add `DEFAULT_SETTINGS` from `../../defaults`):

```ts
    it('hydrates NULL goal_pace to the shared default', () => {
        const row = settingsToRow(makeSettings(), 'user-1') as Record<string, unknown>
        row.goal_pace = null
        const back = rowToSettings(row as unknown as SettingsRecord)
        expect(back.goalPace).toBe(DEFAULT_SETTINGS.goalPace)
        expect(DEFAULT_SETTINGS.goalPace).toBe(0.5)
    })
```

- [ ] **Step 2: Run it to see it fail.** `npx jest context/SettingsContext/database` → FAIL (module `../../defaults` not found).
- [ ] **Step 3: Create `context/SettingsContext/defaults.ts`.**

```ts
import { Settings } from './types'

// The single new-user default. Both hydration paths (powersyncStore cold-load
// fallback + provider initial state) and the NULL-column fallbacks read from
// here, so every code path agrees on the same values (goalPace was 0 vs 0.5
// depending on which file hydrated the user).
export const DEFAULT_SETTINGS: Settings = {
    onboardingComplete: false,
    onboardingCompletedAt: undefined,
    birthDate: new Date(),
    gender: 'male',
    height: 175,
    bodyWeight: 170,
    activityLevel: 'moderate',
    unitSystem: 'imperial',
    goalType: 'maintain',
    goalWeight: 190,
    goalPace: 0.5,
    calorieGoal: 2000,
    proteinGoal: 130,
    carbsGoal: 200,
    fatsGoal: 54,
    macrosCustomized: false,
    goalOvershootAcknowledged: false,
}
```

- [ ] **Step 4: `powersyncStore.ts` — delete its module-local literal (line 8), import the constant.** `import { DEFAULT_SETTINGS } from '../defaults'`; the cold-load fallback at line 46 becomes `... : DEFAULT_SETTINGS`. In `rowToSettings` (lines 11-31), point every numeric NULL-fallback at the constant so they can't drift again:

```ts
        height: row.height ?? DEFAULT_SETTINGS.height,
        bodyWeight: row.body_weight ?? DEFAULT_SETTINGS.bodyWeight,
        goalWeight: row.goal_weight ?? DEFAULT_SETTINGS.goalWeight,
        goalPace: row.goal_pace ?? DEFAULT_SETTINGS.goalPace,
        calorieGoal: row.calorie_goal ?? DEFAULT_SETTINGS.calorieGoal,
        proteinGoal: row.protein_goal ?? DEFAULT_SETTINGS.proteinGoal,
        carbsGoal: row.carbs_goal ?? DEFAULT_SETTINGS.carbsGoal,
        fatsGoal: row.fats_goal ?? DEFAULT_SETTINGS.fatsGoal,
```

(The string-parsing fallbacks `(row.gender || 'male')` etc. stay — they are cast expressions, not the drift source.)

- [ ] **Step 5: `index.tsx` — delete its `defaultSettings` literal (lines 12-30), import `DEFAULT_SETTINGS` from `./defaults`, and rename the ~3 usages (`useState<Settings>(defaultSettings)` at line 40, the signed-out reset at ~line 153).** Grep `defaultSettings` in the file to catch all.
- [ ] **Step 6: Run tests + typecheck.** `npx jest context/SettingsContext` → PASS (including the Step 1 test). `npx tsc --noEmit` → no new errors.

---

### Task 4: One rule for a cleared meal name (audit #4, was #18)

> **MOVED into Task 17 / AUDIT_MAJOR (2026-07-15):** the add-vs-edit name divergence is a symptom of the two editors drifting, which the entry-editor unification (Task 17d) removes at the root. Removed from `docs/AUDIT_MINOR.txt`; the name-consistency fix is now a scope item under Task 17. Do not implement here.
>
> For the record, the standalone fix was a one-liner — `editManualEntry.tsx:53` `name.trim() || parsedEntry.name` → `name.trim() || 'Unnamed Entry'` — but if the editors merge, the shared save handler makes this true by construction.

---

### Task 5: Bodyweight exercises plot a real 1RM (audit #5, was #5)

> **SKIPPED (product decision, 2026-07-15):** Bodyweight exercises should display 0 lb unless the user adds weight — a weight-0 pull-up plotting at 0 is intended, not a bug. Removed from `docs/AUDIT_MINOR.txt`. Steps below retained as historical record only; do not implement.

`getOneRepMaxData` feeds raw `log.weight` into `estimate1RM`, so weight-0 pull-ups plot 0. The fatigue math already solves this (`effectiveLoad` + `bwOnDate` in `fatigueFunctions.tsx:35-51`) — reuse those exact functions so chart and fatigue always agree.

**Files:**
- Modify: `context/WorkoutContext/functions/fatigueFunctions.tsx:35, 48` (add `export`)
- Modify: `context/WorkoutContext/functions/graphFunctions.tsx:1-3, 37-50`
- Modify: `context/WorkoutContext/index.tsx:482-485` (wrapper)
- Modify: `context/WorkoutContext/types.ts:90` (interface)
- Modify: `app/(tabs)/progress.tsx:77, 80` (call site)
- Test: `context/WorkoutContext/functions/__tests__/graphFunctions.test.ts`

**Interfaces:**
- Consumes: `bwOnDate(bwProgress, date, currentBodyWeight): number` and `effectiveLoad(loggedWeight, equipment, bodyWeightAtTime): number`, newly exported from `./fatigueFunctions`.
- Produces: `getOneRepMaxData(exerciseName: string, exercises: Exercise[], logs: Log[], fullExerciseLib: ExerciseLib, currentBodyWeight: number, bwProgress: Record<string, number>)`; context wrapper `handleGetOneRepMaxData(exerciseName: string, currentBodyWeight: number, bwProgress: Record<string, number>)` — same shape as the existing fatigue wrappers at `index.tsx:470-480`, whose caller supplies the Settings-owned data.

- [ ] **Step 1: Write the failing tests.** In `graphFunctions.test.ts`, first append `, {}, 0, {}` to every **existing** `getOneRepMaxData(` call (an empty lib means `equipment === undefined` → `effectiveLoad` returns the raw weight, so all existing expectations hold). Then add:

```ts
  describe('getOneRepMaxData — bodyweight equipment', () => {
    const lib = { 'Pull Ups': { mainMuscle: 'Lats', equipment: 'Bodyweight', isCompound: true, fatigueFactor: 1 } };

    test('weight-0 pull-ups use body weight on the log date, not 0 and not current weight', () => {
      const logs = [createMockLog({ exerciseID: 'ex1', weight: 0, reps: 5, date: new Date('2024-01-15') })];
      const exercises = [createMockExercise({ id: 'ex1', name: 'Pull Ups' })];
      const bwProgress = { [getDateKey(new Date('2024-01-10'))]: 180 };

      const result = getOneRepMaxData('Pull Ups', exercises, logs, lib, 200, bwProgress);

      // estimate1RM(180 + 0, 5) = 180 * (1 + 0.0333 * 5) = 209.97 → 210
      expect(result).toEqual([{ day: expect.any(String), value: 210 }]);
    });

    test('added weight stacks on top of body weight', () => {
      const logs = [createMockLog({ exerciseID: 'ex1', weight: 25, reps: 5, date: new Date('2024-01-15') })];
      const exercises = [createMockExercise({ id: 'ex1', name: 'Pull Ups' })];
      const bwProgress = { [getDateKey(new Date('2024-01-10'))]: 180 };

      const result = getOneRepMaxData('Pull Ups', exercises, logs, lib, 180, bwProgress);

      // estimate1RM(180 + 25, 5) = 205 * 1.1665 = 239.13 → 239
      expect(result[0].value).toBe(239);
    });

    test('non-bodyweight equipment ignores body weight', () => {
      const barbellLib = { 'Bench Press': { mainMuscle: 'Chest', equipment: 'Barbell', isCompound: true, fatigueFactor: 1 } };
      const logs = [createMockLog({ exerciseID: 'exercise-1', weight: 100, reps: 10 })];
      const exercises = [createMockExercise()];

      const result = getOneRepMaxData('Bench Press', exercises, logs, barbellLib, 180, {});

      // estimate1RM(100, 10) = 133.3 → 133 — unchanged by the 180 body weight
      expect(result[0].value).toBe(133);
    });
  });
```

- [ ] **Step 2: Run to verify failure.** `npx jest context/WorkoutContext/functions/__tests__/graphFunctions.test.ts` → FAIL (arity/type errors, then value 0 ≠ 210).
- [ ] **Step 3: Export the two fatigue helpers.** In `fatigueFunctions.tsx` change line 35 `function bwOnDate(` → `export function bwOnDate(` and line 48 `function effectiveLoad(` → `export function effectiveLoad(`. (No import cycle: `fatigueFunctions` does not import `graphFunctions`.)
- [ ] **Step 4: Rewrite `getOneRepMaxData`** (`graphFunctions.tsx:37-50`; extend the type import on line 2 to include `ExerciseLib`, and add the helper import):

```tsx
import { formatDateMinimal, getDateKey } from "@/lib/utils/dateHelper";
import { Exercise, ExerciseLib, Log } from "../types";
import { bwOnDate, effectiveLoad } from "./fatigueFunctions";
import { estimate1RM } from "./oneRepMaxFunctions";
```

```tsx
// Get highest 1RM per date for an exercise (last 21 dates), formatted for Graph component [day: date, value: 1RM].
// Bodyweight equipment uses the user's body weight on the log date as the base load —
// the same effectiveLoad/bwOnDate pair the fatigue math uses, so the two never disagree.
export function getOneRepMaxData(exerciseName: string, exercises: Exercise[], logs: Log[], fullExerciseLib: ExerciseLib, currentBodyWeight: number, bwProgress: Record<string, number>): Array<{ day: string; value: number }> {
    const groupedLogs = groupAllExerciseLogsByDate(exerciseName, exercises, logs);
    const equipment = fullExerciseLib[exerciseName]?.equipment;

    return groupedLogs.map(([date, logsForDate]) => {
        const maxRM = Math.max(...logsForDate.map(log => {
            const bwAtTime = bwOnDate(bwProgress, log.date, currentBodyWeight);
            return estimate1RM(effectiveLoad(log.weight, equipment, bwAtTime), log.reps);
        }));

        return {
            day: formatDateMinimal(date),  // "1/15"
            value: Math.round(maxRM)
        };
    });
}
```

- [ ] **Step 5: Update the context wrapper** (`index.tsx:482-485`):

```tsx
    const handleGetOneRepMaxData = useCallback(
        (exerciseName: string, currentBodyWeight: number, bwProgress: Record<string, number>) =>
            getOneRepMaxData(exerciseName, exercises, logs, fullExerciseLib, currentBodyWeight, bwProgress),
        [exercises, logs, fullExerciseLib]
    )
```

- [ ] **Step 6: Update the interface** (`types.ts:90`):

```ts
    handleGetOneRepMaxData: (exerciseName: string, currentBodyWeight: number, bwProgress: Record<string, number>) => Array<{ day: string; value: number }>
```

- [ ] **Step 7: Update the call site** (`progress.tsx:77`; `bwProgress` is already in scope from `useSettings()` at line 30 and already in the dep array at line 80 — add `settings.bodyWeight`):

```tsx
        const rawData = mode === true ? handleGetOneRepMaxData(selectedExercise, settings.bodyWeight, bwProgress) : handleGetBodyWeightProgressData(settings.onboardingCompletedAt)
```

```tsx
    }, [mode, selectedExercise, topRange, logs, bwProgress, settings.bodyWeight, lastExercise, handleGetOneRepMaxData, handleGetBodyWeightProgressData, settings.onboardingCompletedAt])
```

- [ ] **Step 8: Verify.** `npx jest context/WorkoutContext` → PASS. `npx tsc --noEmit` → no new errors (grep for other `handleGetOneRepMaxData(` callers; `progress.tsx` is the only one today). Manual: Progress → pick a Bodyweight-equipment exercise with weight-0 logs → line sits near body weight instead of flat 0; verify a barbell lift's chart is unchanged.

---

### Task 6: DST-proof day counting (audit #6, was #6)

`Math.floor((today - start) / msPerDay) + 1` drops a day whenever spring-forward falls inside the window (a 23-hour day makes the quotient land just under the integer). The first day holds the onboarding weigh-in, so the BW chart starts at 0. Same pattern ×4 + twice inside the shared `calculateStartDate`.

**Files:**
- Modify: `lib/utils/dateHelper.ts` (new helper + 2 internal fixes at lines 198, 210)
- Modify: `context/SettingsContext/functions/bodyWeightFunctions.tsx:97`
- Modify: `context/WorkoutContext/functions/volumeFunctions.tsx:39, 90`
- Modify: `context/NutritionContext/functions/graphFunctions.tsx:56`
- Test: `lib/utils/__tests__/dateHelper.test.ts`

**Interfaces:**
- Produces: `daysBetween(a: Date, b: Date): number` from `@/lib/utils/dateHelper` — calendar-day difference `b − a`, sign-preserving, time-of-day and DST immune.

- [ ] **Step 1: Write the failing tests** (append to `lib/utils/__tests__/dateHelper.test.ts`):

```ts
describe('daysBetween', () => {
    test('spring-forward inside the window still counts calendar days', () => {
        // 2024-03-10 is US spring-forward: Mar 9 → Mar 11 spans a 23h day + a 24h day.
        expect(daysBetween(new Date(2024, 2, 9), new Date(2024, 2, 11))).toBe(2)
    })

    test('ignores time of day', () => {
        expect(daysBetween(new Date(2024, 0, 1, 23, 59), new Date(2024, 0, 2, 0, 1))).toBe(1)
        expect(daysBetween(new Date(2024, 5, 1, 1), new Date(2024, 5, 1, 23))).toBe(0)
    })

    test('is negative when b precedes a', () => {
        expect(daysBetween(new Date(2024, 0, 10), new Date(2024, 0, 7))).toBe(-3)
    })
})
```

- [ ] **Step 2: Run to verify failure.** `npx jest lib/utils/__tests__/dateHelper.test.ts` → FAIL (`daysBetween` is not exported).
- [ ] **Step 3: Add the helper to `dateHelper.ts`** (near `addDays`, line ~122):

```ts
// Calendar-day difference (b − a). Both dates are taken at local midnight and
// the divide is rounded, so the ±1h a DST transition injects into a
// milliseconds difference can never drop or add a day.
export function daysBetween(a: Date, b: Date): number {
    const start = new Date(a.getFullYear(), a.getMonth(), a.getDate())
    const end = new Date(b.getFullYear(), b.getMonth(), b.getDate())
    return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}
```

- [ ] **Step 4: Replace all six fragile divides.**
  - `dateHelper.ts:198`: `const daysSinceOnboarding = daysBetween(onboardingDate, today);`
  - `dateHelper.ts:210`: `const daysSinceFirstEntry = daysBetween(earliestDate, today);`
  - `bodyWeightFunctions.tsx:97`, `volumeFunctions.tsx:39`, `volumeFunctions.tsx:90`, `NutritionContext/functions/graphFunctions.tsx:56` — each becomes (add `daysBetween` to that file's `@/lib/utils/dateHelper` import):

```ts
    const daysToShow = daysBetween(startDate, today) + 1;
```

- [ ] **Step 5: Verify.** `npx jest lib/utils context/SettingsContext context/WorkoutContext context/NutritionContext` → PASS — in particular `bodyWeightFunctions.test.ts`'s exact-length assertions (16/31/46) must stay green, proving behavior is unchanged on non-DST windows. `npx tsc --noEmit` → no new errors.
- [ ] **Step 6 (Dev Hub — regression view, not a DST reproduction).** The unit test above is the *actual* DST proof: it controls the clock, which a live app can't, so no Dev Hub page can force a spring-forward into the window on demand. This scenario instead runs the **real** `getBodyWeightProgressData` so you can eyeball its output — onboarding-date anchoring, gap-fill carry-forward, and no leading-zero segment — and, opened in-season (shortly after a March spring-forward), it *would* show the pre-fix "starts at 0" drop. In `components/devTest/LineChartTest.tsx`:
  - Add `import { getBodyWeightProgressData } from '@/context/SettingsContext/functions/bodyWeightFunctions'` (`getDateKey` is already imported).
  - Extend the `DataKey` union with `'pipeline'`, add the builder, and register it in `DATASETS` + the Data `Segmented`:

```ts
// Runs the REAL getBodyWeightProgressData: onboarding ~40 days ago, a weigh-in
// every 5 days, gaps carried forward. Exercises the function the DST fix lives
// in. In March (spring-forward in-window) the pre-fix code drops day 0 and the
// line leads with zeros; the fixed code always starts at the first weigh-in.
function genPipeline(): { day: string; value: number }[] {
    const today = new Date()
    const onboarding = new Date(today)
    onboarding.setDate(onboarding.getDate() - 40)
    const bwProgress: Record<string, number> = {}
    for (let age = 0; age <= 40; age += 5) {
        const d = new Date(onboarding)
        d.setDate(d.getDate() + age)
        bwProgress[getDateKey(d)] = Math.round((190 - age * 0.1) * 10) / 10
    }
    return getBodyWeightProgressData(bwProgress, onboarding)
}
```

  Add `pipeline: genPipeline(),` to `DATASETS` and `{ label: 'BW pipeline (real fn)', value: 'pipeline' }` to the Data control's options.
- [ ] **Step 7: Verify (Dev Hub).** Dev Hub → Line Chart → Data "BW pipeline (real fn)", Range 3M → the line begins at the first weigh-in (≈190), not 0, and steps between weigh-ins. (Off-season this always reads correct; run in March to see the pre-fix leading-zero drop.)

---

### Task 7: One calorie label rule — "kcal" is the unit, "Calories" is the noun (audit #7, was #17)

Three suffixes exist for the same number. Rule adopted: any **value + unit** renders `kcal` (already the majority — 8 sites); a field/section **title** stays the word `Calories` (or `Cal` where a grid column is space-constrained, i.e. `editPhotoEntry`'s header row). devTest files are exempt (audit scope excludes them).

**Files:**
- Modify: `components/NutritionComponents/FoodRow.tsx:31`
- Modify: `app/nutritionScreens/savedNutritionModal.tsx:172`
- Modify: `app/nutritionScreens/foodDBModal.tsx:300`
- Modify: `app/settingsScreens/profile.tsx:301`
- Modify: `RESTYLE_PLAN.md` (standing rule: label conventions are a shared UI pattern)

- [ ] **Step 1: Convert the four `cal` unit-suffix sites to `kcal`.**
  - `FoodRow.tsx:31`: `{Math.round(macros.calories)} cal` → `{Math.round(macros.calories)} kcal`
  - `savedNutritionModal.tsx:172`: `{Math.round(s.calories * q)} cal` → `{Math.round(s.calories * q)} kcal`
  - `foodDBModal.tsx:300`: `{Math.round(item.calories * q)} cal` → `{Math.round(item.calories * q)} kcal`
  - `profile.tsx:301`: `` value: `${settings.calorieGoal} cal` `` → `` value: `${settings.calorieGoal} kcal` ``
- [ ] **Step 2: Sweep for stragglers.** Run: `npx tsc --noEmit`, then grep `app components -e "} cal" -e " cal<" -e "' cal'"` (exclude `components/devTest`) → zero production hits remain.
- [ ] **Step 3: Record the rule in `RESTYLE_PLAN.md`** (one line under the copy/labels section): `Unit labels: calorie values always suffix "kcal"; "Calories" is reserved for field/section titles. Weight labels come from weightUnitLabel() (lib/utils/unitConversions).`
- [ ] **Step 4: Manual verify** (dark + light): food search rows, saved-meals pills, profile macro list, entry cards all read `kcal`.

---

### Task 8: One weight-unit label helper (audit #8, was #16)

13 sites render `lbs`, 8 render `lb`, each via a hand-rolled ternary. Standardize on **`lbs`** (majority; also the type `GoalReachedPrompt.tsx:22` already declares `unitLabel: 'lbs' | 'kg'`).

**Files:**
- Modify: `lib/utils/unitConversions.ts` (new helper)
- Modify (swap ternary → helper): `app/onboardingScreens/aboutYou.tsx:120`, `app/workoutScreens/logsModal.tsx:27`, `app/nutritionScreens/updateBWModal.tsx:42`, `app/settingsScreens/adjustMeasurements.tsx:82`, `app/settingsScreens/adjustNutrition/adjustNutrition1.tsx:62`, `app/settingsScreens/profile.tsx:236, 274, 286`, `components/NutritionComponents/bwCard.tsx:38, 41`, `components/NutritionComponents/GoalPromptHost.tsx:34`, `context/SettingsContext/functions/validator.tsx:20, 34`
- Modify (was `'lb'`, becomes helper/`'lbs'`): `app/(tabs)/progress.tsx:117`, `app/onboardingScreens/goal.tsx:33`, `app/onboardingScreens/projection.tsx:22`, `app/onboardingScreens/paywall.tsx:44`, `app/onboardingScreens/pace.tsx:19`, `app/settingsScreens/adjustNutrition/adjustNutrition2.tsx:18`, `app/settingsScreens/adjustNutrition/adjustNutrition4.tsx:28`, `components/GraphComponents/GraphStats.tsx:38`
- Test: create `lib/utils/__tests__/unitConversions.test.ts`

**Interfaces:**
- Produces: `weightUnitLabel(unitSystem: 'imperial' | 'metric'): 'lbs' | 'kg'` from `@/lib/utils/unitConversions`.

- [ ] **Step 1: Write the failing test** (`lib/utils/__tests__/unitConversions.test.ts` — new file; the directory's convention is plain jest, no mocks):

```ts
import { weightUnitLabel } from '../unitConversions'

describe('weightUnitLabel', () => {
    test('imperial → lbs (plural, the app-wide standard)', () => {
        expect(weightUnitLabel('imperial')).toBe('lbs')
    })
    test('metric → kg', () => {
        expect(weightUnitLabel('metric')).toBe('kg')
    })
})
```

- [ ] **Step 2: Run to verify failure**, then add to `unitConversions.ts`:

```ts
// User-facing weight-unit label. Single source so adjacent screens can never
// disagree on lb vs lbs again.
export function weightUnitLabel(unitSystem: 'imperial' | 'metric'): 'lbs' | 'kg' {
    return unitSystem === 'imperial' ? 'lbs' : 'kg'
}
```

- [ ] **Step 3: Replace every ternary site.** Pattern (add `weightUnitLabel` to each file's existing `@/lib/utils/unitConversions` import, or add the import):
  - `settings.unitSystem === 'imperial' ? 'lbs' : 'kg'` → `weightUnitLabel(settings.unitSystem)`
  - `unitSystem === 'metric' ? 'kg' : 'lbs'` (adjustNutrition1) → `weightUnitLabel(settings.unitSystem)`
  - `metric ? 'kg' : 'lb'` (goal/projection/paywall/adjustNutrition4) → `weightUnitLabel(settings.unitSystem)` — these files derive `const metric = settings.unitSystem === 'metric'`, so `settings` is in scope.
  - `progress.tsx:117` and `GraphStats.tsx:38`: `=== 'imperial' ? 'lb' : 'kg'` → `weightUnitLabel(...)` (GraphStats receives `unitSystem` as a prop — pass it through).
  - The two slider `RANGES` literals (`pace.tsx:19`, `adjustNutrition2.tsx:18`): change `unit: 'lb'` → `unit: 'lbs'` (the metric rows already say `'kg'`); these are per-system config constants, not ternaries, so a string edit suffices.
  - `validator.tsx:20, 34`: same swap inside the Alert template strings.
- [ ] **Step 4: Verify.** `npx jest lib/utils` → PASS. `npx tsc --noEmit` → no new errors. Grep `app components context -e "'lb'"` (excluding devTest) → zero production hits. Manual: aboutYou → goal → pace flow shows `lbs` throughout; log tab and progress tab agree.

---

### Task 9: Confirm the one-tap set delete (audit #9, was #24)

Rule adopted (product decision, 2026-07-15): **confirm iff the delete is both irreversible AND a single unguarded tap.** Under that rule the app is almost entirely correct already — workout/exercise/archive/account deletes confirm, and the meal *unsave* confirms (kept deliberately: a meal saved long ago is hard to re-find and re-save, so recovery is expensive). The **nutrition-entry** delete also stays as-is: it already sits behind an options menu (tap entry → menu → destructive-red "Delete"), which is enough deliberate friction — no extra dialog. The **only** gap is the logged-set delete: a single direct tap on the row's trash icon with no guard, easy to fat-finger. That is the one thing this task fixes.

**Files:**
- Modify: `components/WorkoutComponents/LogHistoryList.tsx:47-49` (+ import)

**Interfaces:**
- Consumes: `confirmDelete({ title, message, confirmText?, onConfirm })` from `@/lib/utils/confirmDelete` (existing shared primitive).

- [ ] **Step 1: Set delete.** In `LogHistoryList.tsx` add `import { confirmDelete } from '@/lib/utils/confirmDelete'` and wrap `handleDelete`:

```tsx
    const handleDelete = (id: string) => {
        confirmDelete({
            title: 'Delete set?',
            message: 'This set will be permanently removed. This cannot be undone.',
            onConfirm: () => setDeletingLogId(id),
        })
    }
```

(The prop name `onDeleteConfirmed` finally matches reality. Task 12 restructures what happens after confirmation.)

- [ ] **Step 2: Verify.** `npx tsc --noEmit` → no new errors. Manual: trash a set → confirm dialog appears, Cancel keeps the set, Delete removes it. Nutrition-entry delete is intentionally unchanged (its options menu is the guard). (The `LogHistoryListTest` Dev Hub page built in Task 12 exercises this confirm too — build it there if you want an isolated repro before Task 12.)

---

### Task 10: Deduplicate weeks-to-goal and age math (audit #10, was #25)

10(a) ingredient totals is already consolidated (`sumIngredients` — see Global Constraints). Remaining copies: weeks-to-goal ×3 and age ×3 (non-picker sites). The wheel `DatePicker`'s missing future clamp — the third part of audit #10 — is **dropped**: the date pickers are being replaced wholesale, so clamping the current one is throwaway, and the downstream `isDateAfterToday` alerts (`logsModal.tsx:91-103`, `dateModal.tsx:27`) already block bad dates.

**Files:**
- Create: `lib/utils/goalMath.ts` + `lib/utils/__tests__/goalMath.test.ts`
- Modify: `lib/utils/dateHelper.ts` (add `calculateAge`) + `lib/utils/__tests__/dateHelper.test.ts`
- Modify: `app/onboardingScreens/projection.tsx:27`, `app/onboardingScreens/paywall.tsx:46`, `app/settingsScreens/adjustNutrition/adjustNutrition4.tsx:35`
- Modify (age): `context/SettingsContext/functions/macroCalculation.tsx:10-18`, `app/settingsScreens/profile.tsx:67-77`, `app/onboardingScreens/aboutYou.tsx:61-64`

**Interfaces:**
- Produces: `weeksToGoal(goalType: 'lose' | 'gain' | 'maintain', currentWeight: number, goalWeight: number, pace: number): number` from `@/lib/utils/goalMath` (pace already in display units — callers keep their `lbsToKg` conversion).
- Produces: `calculateAge(birthDate: Date, today?: Date): number` from `@/lib/utils/dateHelper`.

- [ ] **Step 1: Failing tests.** `lib/utils/__tests__/goalMath.test.ts` (new):

```ts
import { weeksToGoal } from '../goalMath'

describe('weeksToGoal', () => {
    test('maintain is a fixed 12-week horizon', () => {
        expect(weeksToGoal('maintain', 174, 174, 0)).toBe(12)
    })
    test('lose/gain divide distance by pace, rounded, min 1 week', () => {
        expect(weeksToGoal('lose', 180, 170, 1)).toBe(10)
        expect(weeksToGoal('gain', 170, 180.4, 1)).toBe(10)
        expect(weeksToGoal('lose', 170.2, 170, 1)).toBe(1)
    })
    test('pace 0 falls back to 1 lb/kg per week instead of dividing by zero', () => {
        expect(weeksToGoal('lose', 180, 170, 0)).toBe(10)
    })
})
```

Append to `dateHelper.test.ts`:

```ts
describe('calculateAge', () => {
    const today = new Date(2026, 6, 15) // 2026-07-15
    test('birthday already passed this year', () => {
        expect(calculateAge(new Date(1998, 0, 1), today)).toBe(28)
    })
    test('birthday not yet reached this year', () => {
        expect(calculateAge(new Date(1998, 11, 31), today)).toBe(27)
    })
    test('birthday is today', () => {
        expect(calculateAge(new Date(1998, 6, 15), today)).toBe(28)
    })
})
```

- [ ] **Step 2: Run both → FAIL (missing exports). Then implement.** `lib/utils/goalMath.ts` (new file):

```ts
// Weeks-to-goal estimate shared by projection, paywall, and the
// adjust-nutrition wizard. pace is in the user's display units; maintain shows
// a fixed 12-week horizon; pace ≤ 0 falls back to 1 unit/week.
export function weeksToGoal(goalType: 'lose' | 'gain' | 'maintain', currentWeight: number, goalWeight: number, pace: number): number {
    if (goalType === 'maintain') return 12
    return Math.max(1, Math.round(Math.abs(currentWeight - goalWeight) / (pace > 0 ? pace : 1)))
}
```

In `dateHelper.ts`:

```ts
// Whole-year age on `today` (defaults to now); the month/day check handles
// not-yet-reached birthdays.
export function calculateAge(birthDate: Date, today: Date = new Date()): number {
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}
```

- [ ] **Step 3: Swap the weeks-to-goal sites** (all three keep their existing `paceDisplay` line):
  - `projection.tsx:27` → `const weeks = weeksToGoal(variant, currentWeight, goalWeight, paceDisplay)`
  - `paywall.tsx:46` → `const weeks = weeksToGoal(settings.goalType, settings.bodyWeight, settings.goalWeight, paceDisplay)`
  - `adjustNutrition4.tsx:35` → `const weeks = weeksToGoal(variant, current, goalWeight, paceDisplay)`
  (`variant` in both files is typed as the goal-type union; if it's a plain `string`, type it `as 'lose' | 'gain' | 'maintain'` at its derivation, not at the call.)
- [ ] **Step 4: Swap the age sites.**
  - `macroCalculation.tsx`: delete the private `calculateAge` (lines 10-18), `import { calculateAge } from '@/lib/utils/dateHelper'`.
  - `profile.tsx`: delete the local `calculateAge` const (lines 67-77), import likewise.
  - `aboutYou.tsx:61-64`: replace the four inline lines with `const age = calculateAge(birthDate)` (keep the ≥13 gate that consumes it). (The `CompactDatePicker.tsx` age copy is intentionally left alone — the pickers are being replaced.)
- [ ] **Step 5: Verify.** `npx jest lib/utils context/SettingsContext` → PASS. `npx tsc --noEmit` → no new errors. Manual: projection/paywall/adjustNutrition4 week counts unchanged for a sample profile; ages in profile/onboarding unchanged.

---

### Task 11: Extract useFoodSearch with a stale-response guard (promoted to AUDIT_MAJOR, 2026-07-15)

> **PROMOTED:** moved out of `docs/AUDIT_MINOR.txt` into `docs/AUDIT_MAJOR.txt` — the fix grew from an inline effect patch into a reusable, tested hook (unit test + Dev Hub page). This section is the full plan; the major-audit entry references it.

The 700 ms debounce cleanup only cancels the **pending timer**; once `await getFoodSearchResults(q)` is in flight nothing cancels it, so an older response can overwrite newer results or kill the spinner early. Offline, every typing pause fires another `Alert`. The fetch isn't abortable (`lib/foodDB` wraps a Supabase edge-function call), so the guard is a monotonic request id: only the newest request may commit results/spinner/error. Extracting the effect into a hook with an **injectable** `search` function is what makes the race unit-testable and Dev-Hub-inspectable — otherwise a test would exercise a copy of the logic, not the shipped code (the issue-16 trap).

**Files:**
- Create: `lib/hooks/useFoodSearch.ts`
- Create: `lib/hooks/__tests__/useFoodSearch.test.tsx`
- Create: `components/devTest/FoodSearchRaceTest.tsx`
- Create: `app/devTest/foodSearchRace.tsx` (DEV route stub)
- Modify: `app/nutritionScreens/foodDBModal.tsx` (consume the hook; render inline error; drop the search state/effect it owned)
- Modify: `components/devTest/DevHub.tsx` (register in `GROUPS`)
- Modify: `app/_layout.tsx` (register the `Stack.Screen`)

**Interfaces:**
- Produces: `useFoodSearch(query: string, opts?: { enabled?: boolean; search?: (q: string) => Promise<FoodSearchResult[]> }): { results: FoodSearchResult[]; isSearching: boolean; error: string | null; hasSearched: boolean }` from `@/lib/hooks/useFoodSearch`. `search` defaults to `getFoodSearchResults`; `enabled` defaults `true` (the screen passes `!locked`).

- [ ] **Step 1: Write the failing unit test** (`lib/hooks/__tests__/useFoodSearch.test.tsx`) — mirrors the `react-test-renderer` Probe + fake-timers pattern in `useToday.test.tsx`. A controllable mock search lets an OLDER request resolve LAST:

```tsx
import React from 'react'
import { act, create } from 'react-test-renderer'
import type { FoodSearchResult } from '@/lib/foodDB/types'
import { useFoodSearch } from '../useFoodSearch'

const item = (name: string) => ({ fdcId: name, name, calories: 100 } as unknown as FoodSearchResult)

function Probe({ query, search, onRender }: { query: string; search: (q: string) => Promise<FoodSearchResult[]>; onRender: (s: ReturnType<typeof useFoodSearch>) => void }) {
    onRender(useFoodSearch(query, { search }))
    return null
}

describe('useFoodSearch', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('a stale (out-of-order) response never overwrites the newest results', async () => {
        const deferreds: Record<string, (r: FoodSearchResult[]) => void> = {}
        const search = (q: string) => new Promise<FoodSearchResult[]>((resolve) => { deferreds[q] = resolve })
        let latest!: ReturnType<typeof useFoodSearch>
        const onRender = (s: ReturnType<typeof useFoodSearch>) => { latest = s }

        let r!: ReturnType<typeof create>
        act(() => { r = create(<Probe query="a" search={search} onRender={onRender} />) })
        act(() => { jest.advanceTimersByTime(700) })          // request A (query "a") in flight
        act(() => { r.update(<Probe query="ab" search={search} onRender={onRender} />) })
        act(() => { jest.advanceTimersByTime(700) })          // request B (query "ab") in flight

        await act(async () => { deferreds['ab']([item('newest')]) })  // newer resolves first…
        await act(async () => { deferreds['a']([item('stale')]) })    // …older resolves last

        expect(latest.results.map((x) => x.name)).toEqual(['newest'])
        expect(latest.isSearching).toBe(false)
    })

    it('reports an error without throwing when the search rejects (offline)', async () => {
        const search = () => Promise.reject(new Error('offline'))
        let latest!: ReturnType<typeof useFoodSearch>
        act(() => { create(<Probe query="a" search={search} onRender={(s) => { latest = s }} />) })
        await act(async () => { jest.advanceTimersByTime(700) })
        expect(latest.error).toBeTruthy()
        expect(latest.isSearching).toBe(false)
    })
})
```

- [ ] **Step 2: Run to verify failure.** `npx jest lib/hooks/__tests__/useFoodSearch.test.tsx` → FAIL (module `../useFoodSearch` not found).
- [ ] **Step 3: Implement the hook** (`lib/hooks/useFoodSearch.ts`):

```ts
import { getFoodSearchResults } from '@/lib/foodDB/foodDB'
import type { FoodSearchResult } from '@/lib/foodDB/types'
import { useEffect, useRef, useState } from 'react'

type SearchFn = (query: string) => Promise<FoodSearchResult[]>

export type FoodSearchState = {
    results: FoodSearchResult[]
    isSearching: boolean
    error: string | null
    hasSearched: boolean
}

// Debounced food search with a stale-response guard. Each debounced request
// gets an incrementing id; only the newest may commit results/spinner/error,
// so an out-of-order slow response can't overwrite newer results or fire a
// late error. `search` is injectable so tests and the Dev Hub drive the race
// deterministically without the network.
export function useFoodSearch(query: string, opts?: { enabled?: boolean; search?: SearchFn }): FoodSearchState {
    const enabled = opts?.enabled ?? true
    const search = opts?.search ?? getFoodSearchResults
    const [results, setResults] = useState<FoodSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasSearched, setHasSearched] = useState(false)
    const seqRef = useRef(0)

    useEffect(() => {
        // A new query invalidates whatever is shown or in flight (replaces the
        // old handleQueryChange clearing); the id guard drops the late response.
        const requestId = ++seqRef.current
        setError(null)
        setResults([])
        setHasSearched(false)
        setIsSearching(false)

        const q = query.trim()
        if (!enabled || !q) return

        const timeoutId = setTimeout(async () => {
            setIsSearching(true)
            let next: FoodSearchResult[] = []
            let nextError: string | null = null
            try {
                next = await search(q)
            } catch {
                nextError = 'Unable to search the food database. Check your connection and try again.'
            }
            if (requestId !== seqRef.current) return
            setResults(next)
            setError(nextError)
            setIsSearching(false)
            setHasSearched(true)
        }, 700)
        return () => clearTimeout(timeoutId)
    }, [query, enabled, search])

    return { results, isSearching, error, hasSearched }
}
```

- [ ] **Step 4: Consume it in `foodDBModal.tsx`.** Delete the `searchResults`/`isSearching`/`hasSearched` state (lines 37-39), the debounced `useEffect` (lines 67-86), and `handleQueryChange`'s clearing branch; replace with:

```tsx
    const { results: searchResults, isSearching, error: searchError, hasSearched } = useFoodSearch(searchQuery, { enabled: !locked })
```

  `handleQueryChange` collapses to `setSearchQuery(text)` (the hook now owns the reset). Render the error in the final empty-state branch (was lines 358-361):

```tsx
                            :   <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>{searchError ? 'Search failed' : 'No results found'}</Text>
                                    <Text style={styles.emptySubtext}>{searchError ?? 'Try a different search term'}</Text>
                                </View>
```

  Keep the react-native `Alert` import — `handleAddResult` (lines 97-113) still uses it for the one-shot "Failed to Load" on an explicit tap, which is out of scope.
- [ ] **Step 5: Dev Hub race page.** `components/devTest/FoodSearchRaceTest.tsx` renders a text input + results list + spinner + inline error driven by `useFoodSearch(query, { search: mockSearch })`, with `DevControls` (mirror an existing test page for the `Field`/`Segmented` + Light/Dark boilerplate). The substance is the deterministic mock:

```tsx
// Resolves after `delayMs`. Out-of-order mode gives every other call a 3× delay
// so an earlier query resolves LAST — the exact condition the guard must survive.
// Offline mode rejects, exercising the inline-error path.
function makeMockSearch(delayMs: number, outOfOrder: boolean, offline: boolean) {
    let call = 0
    return (q: string) =>
        new Promise<FoodSearchResult[]>((resolve, reject) => {
            const thisDelay = outOfOrder && call++ % 2 === 0 ? delayMs * 3 : delayMs
            setTimeout(() => (offline ? reject(new Error('offline')) : resolve([{ fdcId: `${q}-1`, name: `${q} result`, calories: 100 } as unknown as FoodSearchResult])), thisDelay)
        })
}
```

  Register it: add a stub `app/devTest/foodSearchRace.tsx` (the `__DEV__`-guarded `require()` pattern the other stubs use), a `Stack.Screen` in `app/_layout.tsx`, and an entry in `DevHub.tsx`'s `GROUPS`.
- [ ] **Step 6: Verify.** `npx jest lib/hooks/__tests__/useFoodSearch.test.tsx` → PASS. `npx tsc --noEmit` → no new errors. Dev Hub → Food Search Race: with **Out-of-order** on, type fast and confirm results never flash back to an older query; with **Offline** on, one inline "Search failed" row appears and the spinner never sticks — zero alert dialogs.

---

### Task 12: Commit set deletes immediately — no shared animation (audit #12, was #14)

One shared `deletingLogId` + `Animated.Value` pair serves all rows. Starting a second delete re-runs the effect, the first animation's `.start` callback fires with `finished: false`, the `if (!finished) return` guard skips `onDeleteConfirmed`, and the first row pops back. Fix per audit: commit the delete immediately after confirmation and let `LayoutAnimation` animate the list collapse — deleting the entire per-row animation apparatus.

**Files:**
- Modify: `components/WorkoutComponents/LogHistoryList.tsx` (assumes Task 9's `confirmDelete` wrapper is in place)

- [ ] **Step 1: Delete the animation machinery.** Remove:
  - line 20 `deletingLogId` state, lines 21-22 the two `Animated.Value` refs,
  - the whole slide-out effect (lines 30-45),
  - in `renderLog`: line 52 `const isDeleting = ...`, the `disabled={isDeleting}` prop (line 77), and the `if (isDeleting) return <Animated.View ...>` block (lines 85-87).
  Keep the Android `setLayoutAnimationEnabledExperimental` effect (lines 24-28) — it powers the remaining animation.
- [ ] **Step 2: Commit on confirm** — `handleDelete` (with Task 9's wrapper) becomes:

```tsx
    const handleDelete = (id: string) => {
        confirmDelete({
            title: 'Delete set?',
            message: 'This set will be permanently removed. This cannot be undone.',
            onConfirm: () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                onDeleteConfirmed(id)
            },
        })
    }
```

- [ ] **Step 3: Prune imports/state.** Drop `Animated` from the react-native import and `useState` from the react import if now unused (`useRef` stays only if still used — after this change the only ref is the `flatListRef` **prop**, so drop `useRef` too; `useEffect` stays for the Android enable).
- [ ] **Step 4: Verify (typecheck + real screen).** `npx tsc --noEmit` → no new errors. Manual: in a real workout's logs, delete two sets back-to-back as fast as the confirm dialogs allow → both stay deleted after the list settles and after screen re-entry; single delete still animates the collapse.
- [ ] **Step 5: Dev Hub page (serves Issue 9 confirm + Issue 12 double-delete).** `LogHistoryList` only depends on `ThemeContext` + props (its deleter is the `onDeleteConfirmed` prop), so it renders standalone. Create `components/devTest/LogHistoryListTest.tsx`:

```tsx
import LogHistoryList from '@/components/WorkoutComponents/LogHistoryList'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import type { Log } from '@/context/WorkoutContext/types'
import { useMemo, useRef, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

function makeLogs(n: number): Log[] {
    const today = new Date()
    return Array.from({ length: n }, (_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() - Math.floor(i / 3))
        return { id: `log-${i}`, userID: 'dev', workoutID: 'w1', exerciseID: 'e1', date: d, time: i, weight: 100 + i * 5, reps: 8, rpe: 7, createdAt: d, updatedAt: d }
    })
}

export default function LogHistoryListTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [count, setCount] = useState<number>(6)
    const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
    const [logs, setLogs] = useState<Log[]>(() => makeLogs(6))
    const flatListRef = useRef<FlatList<Log> | null>(null)

    const reset = (n: number) => { setCount(n); setLogs(makeLogs(n)) }

    return (
        <View style={styles.screen}>
            <View style={styles.controls}>
                <Field label="Reset with N logs">
                    <Segmented value={count} onChange={reset} options={[{ label: '3', value: 3 }, { label: '6', value: 6 }, { label: '12', value: 12 }]} />
                </Field>
                <Field label="Unit">
                    <Segmented value={weightUnit} onChange={setWeightUnit} options={[{ label: 'lbs', value: 'lbs' }, { label: 'kg', value: 'kg' }]} />
                </Field>
                <Text style={styles.hint}>Tap a trash → confirm dialog (Issue 9). Delete two rows back-to-back → both stay gone (Issue 12). {logs.length} left.</Text>
            </View>
            <View style={styles.listCard}>
                <LogHistoryList logs={logs} weightUnit={weightUnit} lastAddedLogId={null} onDeleteConfirmed={(id) => setLogs((prev) => prev.filter((l) => l.id !== id))} flatListRef={flatListRef} />
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        controls: { padding: 16 },
        hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.labelMuted, marginTop: 4 },
        listCard: { flex: 1, paddingHorizontal: 16 },
    })
}
```

- [ ] **Step 6: Register the page** (same three touch-points every Dev Hub test uses):
  - Create the stub `app/devTest/logHistory.tsx`:

```tsx
// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function LogHistoryListTestRoute() {
    if (__DEV__) {
        const LogHistoryListTest = require('@/components/devTest/LogHistoryListTest').default
        return <LogHistoryListTest />
    }
    return null
}
```

  - `components/devTest/DevHub.tsx` → add to the **Components** group's `items`: `{ label: 'Log History — delete (Issues 9+12)', route: '/devTest/logHistory' }`.
  - `app/_layout.tsx` → add next to the other devTest screens: `<Stack.Screen name="devTest/logHistory" options={{ headerShown: true, title: 'Log History', headerBackTitle: 'Back' }} />`.
- [ ] **Step 7: Verify (Dev Hub).** Dev Hub → Components → "Log History — delete": tapping a trash icon raises the confirm (Issue 9); confirming two deletes in quick succession leaves both rows gone after the list settles (Issue 12); "Reset with N logs" restores the sample set.

---

### Task 13: Clear the food-search cache on sign-out (audit #13, was #28)

`lib/foodDB/foodDB.ts`'s `searchCache`/`detailsCache` (module-level, unbounded, 1-week TTL) survive account switches — memory growth for stale sessions. Clearing them costs only one extra API call on the next search, so just clear them.

> **Descoped (2026-07-15):** audit #13 also flags the `orchestrator.ts` `lastKickAtMs` throttle carrying over; that half is out of scope for this task. Its only symptom is that the next account signing in on the same device within 10 min can have its first background sync-kick throttled — a ≤10-minute first-sync delay, rare and self-correcting. Left as a known minor item.

**Files:**
- Modify: `lib/foodDB/foodDB.ts` (new export)
- Modify: `context/AuthContext/functions/accountFunctions.tsx` (call it from every sign-out exit)
- Test: `lib/foodDB/__tests__/foodDB.test.ts`

**Interfaces:**
- Produces: `clearFoodDBCaches(): void` from `@/lib/foodDB/foodDB`.

- [ ] **Step 0: Baseline.** Run `npx jest lib/foodDB` first. **Known caveat:** parts of this 1213-line suite were written against the legacy direct-FatSecret implementation (it asserts `getFoodSearchResults` returns `[]` on error, but the current code re-throws). If it is already red, note which tests — do not "fix" them as part of this task; only the new test below must pass.
- [ ] **Step 1: Write the failing test** (append, using the suite's own `jest.resetModules()` + `require('../foodDB')` + `global.fetch` mock conventions from its `beforeEach`):

```ts
    test('clearFoodDBCaches forces a refetch on the next identical search', async () => {
        // Arm a successful search response the same way the suite's existing
        // cache-TTL test (lines ~482-522) does — copy its fetch-mock setup
        // verbatim, including any supabase-session mock it relies on.
        await getFoodSearchResults('apple')
        const callsAfterFirst = (global.fetch as jest.Mock).mock.calls.length

        await getFoodSearchResults('apple') // cache hit — no new network call
        expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsAfterFirst)

        const { clearFoodDBCaches } = require('../foodDB')
        clearFoodDBCaches()

        await getFoodSearchResults('apple') // cache cleared — network again
        expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsAfterFirst)
    })
```

- [ ] **Step 2: Run → FAIL (`clearFoodDBCaches` is not a function). Implement in `foodDB.ts`** (after the cache declarations at lines 7-8):

```ts
// Sign-out hook: both caches are keyed per query, not per user, but letting
// them survive an account switch is unbounded memory for stale sessions.
export function clearFoodDBCaches(): void {
    for (const key of Object.keys(searchCache)) delete searchCache[key]
    for (const key of Object.keys(detailsCache)) delete detailsCache[key]
}
```

- [ ] **Step 3: Call from every sign-out exit** (`accountFunctions.tsx`). Add `import { clearFoodDBCaches } from '@/lib/foodDB/foodDB'`, then:
  - `signOut()` (lines 28-40): add `clearFoodDBCaches()` after `if (userID) await clearUserStorage(userID)`.
  - `clearLocalSession()` (lines 81-89): add `clearFoodDBCaches()` as its last line — this covers both `forceSignOut()` and `deleteAccount()`, which route through it. (`signOut` does **not** call `clearLocalSession`, hence the separate call.)
- [ ] **Step 4: Verify.** `npx jest lib/foodDB -t clearFoodDBCaches` → PASS. `npx tsc --noEmit` → no new errors.

---

### Task 14: Guard the lastExercise persist effect until the load resolves (audit #14, was #26)

> **SKIPPED (product decision, 2026-07-15):** lastExercise being erased after sign-in is acceptable — it's a minor convenience default, not worth a guard. Removed from `docs/AUDIT_MINOR.txt`. Steps below retained as historical record only; do not implement.

On sign-in, `userID` changes → the persist effect (`index.tsx:559-574`) runs with the initial `''` and its `else` branch `removeItem`s the key, racing the async `getItem` in the load effect (`:518-534`). Currently masked because sign-out wipes AsyncStorage wholesale (major #19); it goes live the moment that wipe is scoped.

**Files:**
- Modify: `context/WorkoutContext/index.tsx:518-534, 559-574`
- Modify: `AUDIT_MAP.md:27` (doc drift: the real key is `lastExercise:{id}` — colon, per `lib/utils/userStorage.ts:11-13` — not `lastExercise_{id}`)

- [ ] **Step 1: Add a hydration ref and set it around the load** (replace lines 518-534). The ref flips false synchronously on every `userID` change; effects run in declaration order, so the persist effect (declared later) always sees the fresh value:

```tsx
    // Load lastExercise from AsyncStorage when user changes. The hydrated ref
    // holds the persist effect off until this load resolves — otherwise the
    // pre-load '' state would removeItem the stored key right after sign-in.
    const lastExerciseHydratedRef = useRef(false)
    useEffect(() => {
        lastExerciseHydratedRef.current = false
        const loadLastExercise = async () => {
            if (!userID) {
                setLastExercise('')
                lastExerciseHydratedRef.current = true
                return
            }
            try {
                const stored = await AsyncStorage.getItem(lastExerciseKey(userID))
                setLastExercise(stored ?? '')
            } catch (e) {
                console.warn('[WorkoutContext] Failed to load lastExercise from AsyncStorage', e)
                setLastExercise('')
            } finally {
                lastExerciseHydratedRef.current = true
            }
        }
        loadLastExercise()
    }, [userID])
```

- [ ] **Step 2: Guard the persist effect** (line 562, inside `saveLastExercise`):

```tsx
            if (!userID || !lastExerciseHydratedRef.current) return
```

  (Replaces the existing `if (!userID) return`.) When the load's `setLastExercise` lands, this effect re-runs with the ref already true and writes the loaded value back — a same-value `setItem`, harmless.
- [ ] **Step 3: Fix the doc drift.** In `AUDIT_MAP.md:27` change `lastExercise_${userID}` → `lastExercise:${userID}`.
- [ ] **Step 4: Verify.** `npx tsc --noEmit` → no new errors. `npx jest lib/utils/__tests__/userStorage.test.ts` → PASS (key helper untouched). Manual (needs major #19's scoped-wipe fix to be observable; otherwise verify by log): add a log to an exercise (sets lastExercise), relaunch/sign in → Progress tab defaults to that exercise, and a breakpoint/console in the persist effect shows no `removeItem` before the load resolves.

---

### Task 15: Pin the env contract (audit #15, was #27)

Six `EXPO_PUBLIC_*` vars are consumed (two with non-null `!`), `eas.json` declares none, no `.env.example` exists, and docs list only two — a missing var today fails only at first network call. Fix: a single typed env module with a startup assertion, an example file, and EAS environment variables per profile.

**Files:**
- Create: `lib/env.ts`, `.env.example`
- Modify: `lib/supabase/client.ts:5-8`, `lib/powersync/Connector.ts:37`, `lib/openAI/openAI.ts:9`, `lib/foodDB/foodDB.ts:5`, `context/AuthContext/functions/accountFunctions.tsx:12`, `app/_layout.tsx:58-61`, `context/BillingContext/index.tsx:30-38`
- Check: `lib/powersync/__tests__/connector.test.ts:59`, `context/AuthContext/functions/__tests__/accountFunctions.test.ts:40`

**Interfaces:**
- Produces: `ENV` (typed frozen map of the six vars) and `assertRequiredEnv(): void` from `@/lib/env`.

- [ ] **Step 1: Create `lib/env.ts`.** IMPORTANT: `EXPO_PUBLIC_*` vars are **inlined by Babel at build time** — they must appear as static `process.env.EXPO_PUBLIC_X` member expressions; a dynamic `process.env[name]` lookup will silently read `undefined` in a build.

```ts
// Single home for every EXPO_PUBLIC_ env var the app consumes. Babel inlines
// these statically at build time, so each one must be written out as a full
// process.env.EXPO_PUBLIC_* expression — never indexed dynamically.
export const ENV = {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    POWERSYNC_URL: process.env.EXPO_PUBLIC_POWERSYNC_URL,
    REVENUECAT_API_KEY_IOS: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    REVENUECAT_API_KEY_ANDROID: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
} as const

// The app is unusable without these three; fail at startup with a nameable
// error instead of a broken client at first network call. RevenueCat keys and
// the Sentry DSN stay optional: billing already guards absence (BillingContext
// early-returns) and Sentry just disables itself.
export function assertRequiredEnv(): void {
    const missing = (['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'POWERSYNC_URL'] as const).filter((key) => !ENV[key])
    if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.map((key) => `EXPO_PUBLIC_${key}`).join(', ')} — check .env / EAS environment variables`)
    }
}
```

- [ ] **Step 2: Call the assertion first thing in `app/_layout.tsx`** — before `Sentry.init` (line ~58): `import { assertRequiredEnv, ENV } from '@/lib/env'` then `assertRequiredEnv()` at module top-level, and `dsn: ENV.SENTRY_DSN,`.
- [ ] **Step 3: Switch the consumers** (each imports `ENV` from `@/lib/env`):
  - `lib/supabase/client.ts:5-6` → `const supabaseUrl = ENV.SUPABASE_URL!` / `const supabaseAnonKey = ENV.SUPABASE_ANON_KEY!` (the `!` stays for typing; runtime is covered by the assertion).
  - `lib/powersync/Connector.ts:37` → `endpoint: ENV.POWERSYNC_URL!,`
  - `lib/openAI/openAI.ts:9` → `` const EDGE_FN_URL = `${ENV.SUPABASE_URL}/functions/v1/fetchOpenAI` ``
  - `lib/foodDB/foodDB.ts:5` → `` const EDGE_FN_URL = `${ENV.SUPABASE_URL}/functions/v1/fetchFoodDB` ``
  - `accountFunctions.tsx:12` → `` fetch(`${ENV.SUPABASE_URL}/functions/v1/deleteAccount`, ... ``
  - `BillingContext/index.tsx:31-32` → `ios: ENV.REVENUECAT_API_KEY_IOS,` / `android: ENV.REVENUECAT_API_KEY_ANDROID,`
- [ ] **Step 4: Create `.env.example`** (names only — values live in `.env`, which is gitignored):

```bash
# Required — the app throws at startup without these (see lib/env.ts)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POWERSYNC_URL=
# Optional — billing init is skipped / Sentry disables itself when absent
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=
EXPO_PUBLIC_SENTRY_DSN=
```

- [ ] **Step 5: EAS side (manual, needs `eas` auth — do not put values in `eas.json`).** Create the six vars in each EAS environment so cloud builds stop depending on a local `.env`:

```bash
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value <value> --visibility plaintext
# …repeat for the other five, then for --environment preview and development
```

  Then set `"environment": "production"` / `"preview"` / `"development"` on the matching profiles in `eas.json` so each build pulls its environment's vars.
- [ ] **Step 6: Fix the two env-writing tests if they break.** `connector.test.ts:59` and `accountFunctions.test.ts:40` set `process.env.EXPO_PUBLIC_*` — `ENV` snapshots those at **module import**, so the assignments must happen before the module under test is imported (hoist to the top of the file or add `jest.resetModules()` + re-`require`). Run `npx jest lib/powersync context/AuthContext` and adjust per failure.
- [ ] **Step 7: Verify.** `npx tsc --noEmit` → no new errors. Full `npx jest` → no new failures. Manual: temporarily blank `EXPO_PUBLIC_POWERSYNC_URL` in `.env`, restart Metro with cache clear → app throws the nameable startup error; restore the var.

---

### Task 16: Make the tested workout functions the code the app runs (audit #16, was #12)

`workoutFunctions.tsx` has 8 exports; the provider imports exactly one (`deleteWorkout`) and re-implements the rest inline with **different** behavior (the helper's unarchive bumps archived rows too; its archive branch never sets order 0 nor bumps archived siblings). Green tests, untested app. Fix: align the helpers to the provider's (correct, post-Task-2) semantics, then make the provider delegate its state updates to them — the tests then certify live code.

**Files:**
- Modify: `context/WorkoutContext/functions/workoutFunctions.tsx:5-33, 49-71, 158-161`
- Modify: `context/WorkoutContext/functions/__tests__/workoutFunctions.test.ts`
- Modify: `context/WorkoutContext/index.tsx:29, 70-91, 93-138, 155-204, 206-252`

**Interfaces:**
- Produces (changed): `archiveWorkout(id: string, archived: boolean, setWorkouts): void` (was `: Workout[]` — the return was test-only).
- Unchanged signatures the provider will now consume: `addWorkout(name, userId, setWorkouts): Workout`, `duplicateWorkout(sourceWorkoutId, userId, workouts, exercises, setWorkouts, setExercises): { newWorkout; newExercises } | null`, `renameWorkout(id, name, setWorkouts): Workout | undefined`, `updateWorkoutNote(id, note, setWorkouts): Workout | undefined`, `updateWorkoutOrder(reorderedWorkouts, setWorkouts): Workout[]`, `incrementWorkoutOrders(workouts): Workout[]`.
- `flowOfLayers.test.ts:5` imports `addWorkout`/`deleteWorkout` — both signatures unchanged.

- [ ] **Step 1: Update the tests to the target semantics first** (TDD — they must fail against the current helpers). In `workoutFunctions.test.ts`:
  - `incrementWorkoutOrders`: add

```ts
        test('does not bump archived workouts', () => {
            const result = incrementWorkoutOrders([
                createMockWorkout({ id: 'a', order: 0, archived: false }),
                createMockWorkout({ id: 'b', order: 3, archived: true }),
            ]);
            expect(result[0].order).toBe(1);
            expect(result[1].order).toBe(3);
        });
```

  - `archiveWorkout`: switching the return type to `: void` breaks no test, because none of the existing cases capture `archiveWorkout`'s return value. The pre-existing cases also stay green: the archive-path ones ('should archive a workout', 'should handle unarchiving non-archived workout') assert only `archived`, never `order`, and every existing unarchive case uses all-active siblings (e.g. line ~321), which the old and new helper bump identically. **Extend** the describe block with the discriminating cases that fail against today's helper:

```ts
        test('unarchiving bumps only active siblings, archived rows keep their order', () => {
            const { setter, getState, setState } = createMockSetter<Workout>();
            setState([
                createMockWorkout({ id: '1', archived: true, order: 10 }),
                createMockWorkout({ id: '2', archived: false, order: 0 }),
                createMockWorkout({ id: '3', archived: true, order: 5 }),
            ]);

            archiveWorkout('1', true, setter);

            const result = getState();
            expect(result.find(w => w.id === '1')).toMatchObject({ archived: false, order: 0 });
            expect(result.find(w => w.id === '2')?.order).toBe(1);
            expect(result.find(w => w.id === '3')?.order).toBe(5);
        });

        test('archiving places the target at order 0 and bumps other archived rows only', () => {
            const { setter, getState, setState } = createMockSetter<Workout>();
            setState([
                createMockWorkout({ id: '1', archived: false, order: 0 }),
                createMockWorkout({ id: '2', archived: true, order: 0 }),
                createMockWorkout({ id: '3', archived: false, order: 1 }),
            ]);

            archiveWorkout('1', false, setter);

            const result = getState();
            expect(result.find(w => w.id === '1')).toMatchObject({ archived: true, order: 0 });
            expect(result.find(w => w.id === '2')?.order).toBe(1);
            expect(result.find(w => w.id === '3')?.order).toBe(1);
        });
```

  - `addWorkout`: add a case where an archived workout's order is untouched by the insert bump.
- [ ] **Step 2: Run → the new cases FAIL against current helpers.** `npx jest context/WorkoutContext/functions/__tests__/workoutFunctions.test.ts`
- [ ] **Step 3: Rewrite the helpers to the provider's semantics.**

```ts
// Bumps the order of all ACTIVE workouts by 1 — archived rows keep their
// order, matching the SQL bumpers' WHERE archived = 0.
export function incrementWorkoutOrders(workouts: Workout[]): Workout[] {
    return workouts.map(w => (w.archived ? w : { ...w, order: w.order + 1, updatedAt: new Date() }));
}
```

  In `addWorkout` (lines 27-30) and `duplicateWorkout` (lines 158-161), replace the inline `prev.map(...)` bump with `incrementWorkoutOrders(prev)`:

```ts
    setWorkouts(prev => [...incrementWorkoutOrders(prev), newWorkout]);
```

  Replace `archiveWorkout` (lines 49-71) wholesale:

```ts
// Archives OR unarchives a workout (state only; the provider persists via SQL).
// Unarchive: target → active at order 0, active siblings bump. Archive: target
// → archived at order 0, archived siblings bump. Mirrors the inline SQL in
// WorkoutContext's handleArchiveWorkout exactly.
export function archiveWorkout(
    id: string,
    archived: boolean,
    setWorkouts: Dispatch<SetStateAction<Workout[]>>
): void {
    const now = new Date();
    setWorkouts(prev => prev.map(w => {
        if (w.id === id) return { ...w, archived: !archived, order: 0, updatedAt: now };
        if (w.archived === !archived) return { ...w, order: w.order + 1, updatedAt: now };
        return w;
    }));
}
```

  (Read it twice: when unarchiving (`archived === true`), the target becomes active (`archived: false`) and the rows sharing that destination state (`w.archived === false`) bump — identical to the provider's two branches collapsed into one map.)
- [ ] **Step 4: Run → helper tests PASS.**
- [ ] **Step 5: Make the provider delegate.** In `index.tsx:29` widen the import:

```tsx
import { addWorkout, archiveWorkout, deleteWorkout, duplicateWorkout, renameWorkout, updateWorkoutNote, updateWorkoutOrder } from './functions/workoutFunctions'
```

  Then replace each handler's state block (SQL/persist code is untouched):

```tsx
    const handleAddWorkout = useCallback(async (name: string, userId: string) => {
        const newWorkout = addWorkout(name, userId, setWorkoutsState)
        try {
            await insertWorkoutWithOrderBump(newWorkout)
        } catch (e) {
            reportPersistFailure('workout', e, { reload: reloadFromDisk })
        }
    }, [])

    const handleDuplicateWorkout = useCallback(async (id: string) => {
        if (!userID) return
        const result = duplicateWorkout(id, userID, workouts, exercises, setWorkoutsState, setExercisesState)
        if (!result) return
        try {
            await insertDuplicateWorkout(result.newWorkout, result.newExercises)
        } catch (e) {
            reportPersistFailure('workout', e, { reload: reloadFromDisk })
        }
    }, [userID, workouts, exercises])
```

  `handleArchiveWorkout` (lines 155-204): the two `setWorkoutsState` blocks collapse to one `archiveWorkout(id, archived, setWorkoutsState)` call before the existing `if (userID)` SQL (keep both SQL branches exactly as they are).

```tsx
    const handleArchiveWorkout = useCallback(async (id: string, archived: boolean) => {
        archiveWorkout(id, archived, setWorkoutsState)
        if (!userID) return
        try {
            await powerSync.writeTransaction(async (tx) => {
                if (archived) {
                    await tx.execute(`UPDATE workouts SET "order" = "order" + 1, updated_at = datetime('now') WHERE user_id = ? AND archived = 0`, [userID])
                    await tx.execute(`UPDATE workouts SET archived = 0, "order" = 0, updated_at = datetime('now') WHERE id = ?`, [id])
                } else {
                    await tx.execute(`UPDATE workouts SET "order" = "order" + 1, updated_at = datetime('now') WHERE user_id = ? AND archived = 1 AND id != ?`, [userID, id])
                    await tx.execute(`UPDATE workouts SET archived = 1, "order" = 0, updated_at = datetime('now') WHERE id = ?`, [id])
                }
            })
        } catch (e) {
            reportPersistFailure('workout', e, { reload: reloadFromDisk })
        }
    }, [userID])
```

  `handleRenameWorkout` / `handleUpdateWorkoutNote` (lines 206-238) — same shape each:

```tsx
    const handleRenameWorkout = useCallback(async (id: string, name: string) => {
        const updated = renameWorkout(id, name, setWorkoutsState)
        if (updated) {
            try {
                await upsertWorkout(updated)
            } catch (e) {
                reportPersistFailure('workout', e, { reload: reloadFromDisk })
            }
        }
    }, [])

    const handleUpdateWorkoutNote = useCallback(async (id: string, note: string) => {
        const updated = updateWorkoutNote(id, note, setWorkoutsState)
        if (updated) {
            try {
                await upsertWorkout(updated)
            } catch (e) {
                reportPersistFailure('workout', e, { reload: reloadFromDisk })
            }
        }
    }, [])
```

  `handleUpdateWorkoutOrder` (lines 240-252):

```tsx
    const handleUpdateWorkoutOrder = useCallback(async (reorderedWorkouts: Workout[]) => {
        const withOrder = updateWorkoutOrder(reorderedWorkouts, setWorkoutsState)
        try {
            await updateWorkoutOrders(withOrder)
        } catch (e) {
            reportPersistFailure('workout', e, { reload: reloadFromDisk })
        }
    }, [])
```

  Scope note: the exercise-side handlers keep their (Task 2-fixed) inline state code — `workoutFunctions.tsx` never owned exercise helpers, and inventing them now doubles this task for no audit finding. The audit's claim was about the **workout** CRUD tests.
- [ ] **Step 6: Verify.** `npx jest context/WorkoutContext` → all PASS (including `flowOfLayers.test.ts`). `npx tsc --noEmit` → no new errors. Manual smoke: add, duplicate, rename, note-edit, reorder, archive, unarchive, delete a workout — behavior identical; archive ordering matches Task 2's expectations across relaunch.

---

### Task 17: Persist ingredient brand + unify the entry editors (promoted to AUDIT_MAJOR, 2026-07-15)

> **PROMOTED:** moved out of `docs/AUDIT_MINOR.txt` into `docs/AUDIT_MAJOR.txt` because the scope grew past a data-only fix into an editor-consolidation feature. This section is the full plan; the major-audit entry references it.

The AI vision contract returns `brand` per ingredient (`fetchOpenAI/index.ts:37,47,61,76`), `Ingredient.brand?: string | null` carries it in memory (`types.ts:8`), the UI consumes it (`aiFunctions.tsx:29-32, 54-57, 121`) — but neither ingredient table has a column, so it's `undefined` after every restart. **Persisting brand is the base (Steps 1-6 below); on top of it sit the product asks:**

- **17b — show brand on entries.** Once brand persists, display it wherever ingredients are listed (saved meals + added/photo entries). Small UI follow-on to Steps 1-6.
- **17c — combine-meals routes to the photo editor.** Today "combine meals" (in saved foods and in added foods) opens the default manual editor (`editManualEntry`), which has no per-ingredient UI, so a multi-ingredient combined entry can't have its ingredients edited. Route combined entries to the photo-edit screen (`editPhotoEntry`) instead — it already renders and edits an ingredient list.
- **17d — cleared-meal-name consistency (absorbed from former Task 4 / minor #4).** Add writes `"Unnamed Entry"` for a blank name; Edit (`editManualEntry.tsx:53`) silently restores the old name. If the editors merge (17e) the shared save handler makes this consistent by construction; if they don't, apply the one-liner `name.trim() || parsedEntry.name` → `name.trim() || 'Unnamed Entry'`.
- **17e — (undecided) unify on the photo editor for everything.** Since `editPhotoEntry` already handles the general "entry with ingredients + totals" case, it may be simpler to make it the single editor for *all* entries and retire `editManualEntry` entirely (this subsumes 17c and 17d). Flagged as a direction to evaluate, not a committed step.

**Files:**
- Create: `lib/supabase/migrations/ingredient_brand.sql`
- Modify: `lib/powersync/AppSchema.ts:71-83, 101-113` (both ingredient tables)
- Modify: `context/NutritionContext/database/powersyncStore.ts:25-32, 73-80, 181-189, 222-229`
- Test: `context/NutritionContext/database/__tests__/powersyncStore.test.ts`

**Interfaces:**
- Produces: `brand` (`column.text`, nullable) on `nutrition_entry_ingredients` and `saved_nutrition_entry_ingredients`, round-tripped through the converters. Connector needs **no change** — nutrition tables use the generic `{ ...op.opData }` upsert path (`Connector.ts:79-121`).

- [ ] **Step 1: Write the failing test.** The row→entry direction is the one that loses data today; test the ingredient mapping (adapt to the suite's `makeEntry` factory and mocked `@/lib/powersync/system`):

```ts
    const entryRow = {
        id: 'e1', user_id: 'user-1', name: 'Lunch', date: '2026-07-15', time: 0,
        protein: 20, carbs: 40, fats: 10, calories: 330, is_photo: 1, photo_uri: null,
        created_at: '2026-07-15', updated_at: '2026-07-15',
    }

    it('round-trips ingredient brand through the row mapping', () => {
        const ingredientRow = { id: 'ing-1', nutrition_entry_id: 'e1', name: 'Greek Yogurt', brand: 'Fage', quantity: 1, protein: 18, carbs: 6, fats: 0, calories: 100, created_at: '2026-07-15' }
        const entry = rowToNutritionEntry(entryRow as never, [ingredientRow] as never)
        expect(entry.ingredients[0].brand).toBe('Fage')
    })

    it('maps a missing brand column to null (legacy rows)', () => {
        const ingredientRow = { id: 'ing-1', nutrition_entry_id: 'e1', name: 'Rice', quantity: 1, protein: 3, carbs: 40, fats: 0, calories: 180, created_at: '2026-07-15' }
        const entry = rowToNutritionEntry(entryRow as never, [ingredientRow] as never)
        expect(entry.ingredients[0].brand).toBeNull()
    })
```

  (Match the field names to the file's real `NutritionEntryRecord` when writing the test — the literal above follows `AppSchema.ts:53-69`; export `rowToNutritionEntry` from the store if it isn't already.)
- [ ] **Step 2: Run → FAIL (brand is `undefined`).**
- [ ] **Step 3: Migration** — `lib/supabase/migrations/ingredient_brand.sql` (repo convention: flat snake_case file, dated header, deploy note):

```sql
-- Migration date: 2026-07-15 (audit minor #17)
-- The AI vision contract returns a brand per ingredient and the app type
-- carries it, but there was no column — brand vanished on every restart.
--
-- Deploy note: run in Supabase BEFORE or WITH the app release. Sync rules use
-- SELECT * so no sync-rules change is needed. No backfill/touch UPDATE: brand
-- was never persisted, so every existing row's correct value is NULL already.

ALTER TABLE nutrition_entry_ingredients ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE saved_nutrition_entry_ingredients ADD COLUMN IF NOT EXISTS brand text;
```

- [ ] **Step 4: AppSchema** — in both `nutrition_entry_ingredients` (lines 71-83) and `saved_nutrition_entry_ingredients` (lines 101-113) add, after `name: column.text,`:

```ts
  brand: column.text,
```

- [ ] **Step 5: Converters** (`context/NutritionContext/database/powersyncStore.ts`).
  - Both ingredient read-mappings (`rowToNutritionEntry` lines 25-32, `rowToSavedNutritionEntry` lines 73-80) add:

```ts
            brand: ing.brand ?? null,
```

  - Both ingredient INSERTs (`upsertNutritionEntry` lines 183-188, `upsertSavedNutritionEntry` lines 222-229): add `brand` to the column list and `ing.brand ?? null` to the bind array, keeping positions aligned:

```ts
            await tx.execute(
                `INSERT INTO nutrition_entry_ingredients (
                   id, nutrition_entry_id, name, brand, quantity, protein, carbs, fats, calories, created_at
                 ) VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [entry.id, ing.name, ing.brand ?? null, sanitizeMacro(ing.quantity), sanitizeMacro(ing.protein), sanitizeMacro(ing.carbs), sanitizeMacro(ing.fats), sanitizeMacro(ing.calories)],
            )
```

  (Mirror exactly for the saved table's INSERT.)
- [ ] **Step 6: Verify.** `npx jest context/NutritionContext` → PASS. `npx tsc --noEmit` → no new errors. Release checklist: add `ingredient_brand.sql` to the pending-at-release migrations alongside `nutrition_calories_real.sql` (see `docs/superpowers/plans` postscript convention / memory note). Manual (post-migration in a dev Supabase): AI-scan a branded item → restart the app → the ingredient's brand still shows in editPhotoEntry.

---

### Task 18: Persist onboarding progress (audit #18, was #1)

Nothing persists until the paywall's `completeOnboarding()` — except `aboutYou`'s immediate `weight_progress` write, which orphans if onboarding is abandoned. The blocker is the `hasLoadedUserData` term in the settings persist gate (`index.tsx:178`), which stays `false` for a brand-new user for the whole flow. The original reason for that gate — "a failed load must not persist defaults as truth" (major M1) — is now handled upstream by the load-failure retry screen (plans/2026-07-14-load-failure-retry.md), and a fresh user's `persistDirty` only flips on their **first real answer** (`setSettings` in aboutYou), so relaxing the gate persists real progress, never untouched defaults.

**Files:**
- Modify: `context/SettingsContext/index.tsx:42, 147-163, 169-173, 178, 220, 226-243` (every `hasLoadedUserData` reference)

**Interfaces:**
- Removed: the `hasLoadedUserData` state and its flip effect (internal only — verify before deleting, Step 1).
- Behavior produced: each onboarding `setSettings` upserts the settings row with `onboarding_complete = 0`; the route guard (`session + !onboardingComplete → onboarding`) is unaffected; after a force-quit the user re-enters onboarding with their saved values in `settings`, and the aboutYou weigh-in row is no longer an orphan (a settings row now accompanies it).

- [ ] **Step 1: Confirm the flag is internal.** Run a grep for `hasLoadedUserData` across the repo. Expected sites, all in `context/SettingsContext/index.tsx`: the `useState` (line 42), the flip effect (lines 169-173), the gate condition (line 178), the effect dep array (line ~220), `completeOnboarding`'s `setHasLoadedUserData(true)` (line 235), and the load path (`setHasLoadedUserData(false)` at line 148 and `setHasLoadedUserData(hasData)` at line 162). If it appears in the context interface or any consumer, STOP and keep the state (only remove it from the gate) — the rest of this task is unchanged.
- [ ] **Step 2: Relax the gate.** Line 178:

```ts
        if (!loaded || !userID || !hasLoadedUserData || !persistDirty) return
```

becomes

```ts
        if (!loaded || !userID || !persistDirty) return
```

Remove `hasLoadedUserData` from that effect's dependency array.
- [ ] **Step 3: Delete the now-dead flag** (assuming Step 1 confirmed internal-only): the `useState` (line 42), the flip effect (lines 169-173), `setHasLoadedUserData(true)` in `completeOnboarding` (line 235), and both load-path writes — `setHasLoadedUserData(false)` (line 148) and `setHasLoadedUserData(hasData)` (line 162). Removing line 162 leaves `hasData` unused, so drop it from that destructuring too: `const { settings, bwProgress } = await loadSettingsAndBw(userID)` (line 158). Keep `completeOnboarding` otherwise intact — it remains the single place that stamps `onboardingComplete: true` + `onboardingCompletedAt` synchronously and reports failure to the paywall.
- [ ] **Step 4: Verify the persist-retry copy still reads right.** The catch branch computes `const onboarding = !settings.onboardingComplete` and stays silent/retrying during onboarding — unchanged and now actually reachable mid-flow; no edit needed, just confirm it compiles.
- [ ] **Step 5: Tests + typecheck.** `npx jest context/SettingsContext` → PASS (no existing test exercises the gate — the provider is untested; this task deliberately doesn't add a first provider render-test, see note). `npx tsc --noEmit` → no new errors.
- [ ] **Step 6: Manual verification (the real acceptance test).**
  1. Fresh account → onboard through `plan` (past aboutYou) → force-quit → relaunch: route guard returns to onboarding, and Dev Stats / local DB shows a settings row with `onboarding_complete = 0` holding the entered height/weight/goal — plus the day-1 `weight_progress` row that now has a parent.
  2. Complete onboarding → `(tabs)` loads; settings row flips to `onboarding_complete = 1` with `onboarding_completed_at` stamped.
  3. Regression: sign out, sign back in as an **existing** user → no spurious settings write on load (persistDirty stays false through hydration — cold load uses `setSettingsState`, not `setSettings`).
  4. Regression (M1 interplay): with the Dev Hub force-load-failure armed, first load shows the retry screen and no settings write occurs.

Note on scope: goals/obstacles answers live in throwaway local state (`goals.tsx`/`obstacles.tsx` never call `setSettings`) — they are motivational selections that feed no computation, so persisting them is out of scope for this fix. Resume lands the user at the onboarding entry screen with all numeric/goal answers preserved in `settings`; a step-resume UX would be a feature, not an audit fix.

---

## Verification sweep (after all tasks)

- [ ] `npx jest` — full suite green (modulo the pre-existing legacy-foodDB failures baselined in Task 13 Step 0, if any).
- [ ] `npx tsc --noEmit` — no new errors vs the pre-plan baseline.
- [ ] `docs/AUDIT_MINOR.txt` — all 18 entries deleted; `docs/COMPLETED_ISSUES.txt` has one postscript line per task.
- [ ] Release checklist: run `lib/supabase/migrations/ingredient_brand.sql` in Supabase at release (alongside the already-pending `nutrition_calories_real.sql`); create the EAS environment variables (Task 15 Step 5).
