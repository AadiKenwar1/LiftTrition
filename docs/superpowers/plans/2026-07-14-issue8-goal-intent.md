# Issue 8 — Goal Intent Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Weigh-ins update numbers but never flip the user's goal; crossing the goal asks; only sustained, unanswered overshoot auto-lands in maintenance (announced); hand-tuned macros survive every implicit recalc.

**Architecture:** Two new persisted flags on the one-row settings table (`macros_customized`, `goal_overshoot_acknowledged`). The decision logic lives in pure functions in `context/SettingsContext/functions/` (ported from the already-tested Dev Hub sim in `components/devTest/goalReachedLogic.ts`). `handleUpdateBw` returns a prompt kind; `updateBWModal` hosts the already-built `GoalReachedPrompt`; `progress.tsx` mounts the already-built `GoalReachedBanner`. Maintenance targets anchor to `goalWeight` inside `calculateMacros` so every call site inherits the rule.

**Tech Stack:** React Native/Expo, PowerSync + SQLite, Supabase Postgres, Jest.

## Global Constraints

- **NO git commits/branches/pushes** — the user owns all version control. Leave changes in the working tree. (Overrides this skill's default commit steps.)
- Spec: `docs/superpowers/specs/2026-07-14-goal-reached-devhub-design.md` — behavior table is authoritative.
- Deadband: 2 lb imperial / 1 kg metric (`OVERSHOOT_DEADBAND`).
- Sync rules use `SELECT *` (lib/powersync/sync-rules.yaml) — NO sync-rules change; migration + client build only.
- Existing UI components to reuse (already built + previewed): `components/NutritionComponents/GoalReachedBanner.tsx`, `GoalReachedPrompt.tsx`.
- Copy (exact): banner "Goal reached — set your next goal"; prompt buttons "Switch to Maintenance" / "Set a New Goal" / "Keep Going"; auto-maintain title "Goal Passed — Now Maintaining".
- Onboarding/wizard already set `goalWeight = bodyWeight` for maintain (goal.tsx:39, adjustNutrition1.tsx:32) — no change needed there.
- Run tests with `npx jest <path>`; typecheck with `npx tsc --noEmit` (pre-existing errors exist in DevStatsModal/Deno functions/old tests — only NEW errors count).

---

### Task 1: Schema layer — migration, AppSchema, Settings type, mappers

**Files:**
- Create: `lib/supabase/migrations/settings_goal_intent_flags.sql`
- Modify: `lib/powersync/AppSchema.ts` (settings table)
- Modify: `context/SettingsContext/types.ts` (Settings interface)
- Modify: `context/SettingsContext/database/powersyncStore.ts` (defaults, rowToSettings, settingsToRow, upsertSettings SQL)
- Modify: `context/SettingsContext/index.tsx` (defaultSettings copy)
- Test: `context/SettingsContext/database/__tests__/powersyncStore.test.ts`

**Interfaces:**
- Produces: `Settings.macrosCustomized: boolean`, `Settings.goalOvershootAcknowledged: boolean`; DB columns `macros_customized`, `goal_overshoot_acknowledged` (integer 0/1 client-side, boolean in Postgres).

- [ ] Migration SQL (backfill UPDATE forces PowerSync replication of existing rows):

```sql
-- Migration date: 2026-07-14 (issue 8)
-- Two intent flags for the weigh-in rules: hand-tuned-macros protection and
-- the "Keep Going" auto-switch disarm.
-- Deploy note: run in Supabase BEFORE or WITH the app release. Sync rules use
-- SELECT * so no sync-rules change is needed; the UPDATE below touches every
-- row so PowerSync replicates the new columns to existing clients.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS macros_customized boolean NOT NULL DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS goal_overshoot_acknowledged boolean NOT NULL DEFAULT false;

UPDATE settings SET updated_at = now();
```

- [ ] AppSchema settings table: add `macros_customized: column.integer,` and `goal_overshoot_acknowledged: column.integer,` after `onboarding_completed_at`.
- [ ] `Settings` type: add `macrosCustomized: boolean;` and `goalOvershootAcknowledged: boolean;`.
- [ ] Both `defaultSettings` literals (powersyncStore.ts + index.tsx): add `macrosCustomized: false, goalOvershootAcknowledged: false`.
- [ ] `rowToSettings`: add `macrosCustomized: !!row.macros_customized,` and `goalOvershootAcknowledged: !!row.goal_overshoot_acknowledged,` (null → false covers not-yet-backfilled rows).
- [ ] `settingsToRow`: add `macros_customized: s.macrosCustomized ? 1 : 0, goal_overshoot_acknowledged: s.goalOvershootAcknowledged ? 1 : 0`.
- [ ] `upsertSettings`: add both columns to the UPDATE set list, INSERT column list, and both param arrays (order must match).
- [ ] Check `lib/powersync/Connector.ts`: if the settings upload branch enumerates columns, add the two; if it passes the op's data generically, no change.
- [ ] Tests in powersyncStore.test.ts (extend `makeSettings` with the two fields, then):

```ts
it('round-trips the intent flags', () => {
    const row = settingsToRow(makeSettings({ macrosCustomized: true, goalOvershootAcknowledged: true }), 'user-1')
    expect(row.macros_customized).toBe(1)
    expect(row.goal_overshoot_acknowledged).toBe(1)
    const back = rowToSettings(row as unknown as SettingsRecord)
    expect(back.macrosCustomized).toBe(true)
    expect(back.goalOvershootAcknowledged).toBe(true)
})

it('defaults missing intent flags to false (legacy rows)', () => {
    const row = settingsToRow(makeSettings(), 'user-1') as Record<string, unknown>
    delete row.macros_customized
    delete row.goal_overshoot_acknowledged
    const back = rowToSettings(row as unknown as SettingsRecord)
    expect(back.macrosCustomized).toBe(false)
    expect(back.goalOvershootAcknowledged).toBe(false)
})
```

- [ ] Run: `npx jest context/SettingsContext/database` → PASS. `npx tsc --noEmit` → new errors expected ONLY where Settings literals are built (tests fixed here; sim's toSettings fixed in Task 8).

### Task 2: Maintenance anchor in calculateMacros

**Files:**
- Modify: `context/SettingsContext/functions/macroCalculation.tsx:29`
- Test: `context/SettingsContext/functions/__tests__/macroCalculation.test.ts` (create if absent)

**Interfaces:**
- Produces: `calculateMacros(settings, isImperial)` unchanged signature; for `goalType==='maintain'` with `goalWeight > 0` it computes from `goalWeight` instead of `bodyWeight`.

- [ ] In `calculateMacros`, replace `let weightKg = settings.bodyWeight` with:

```ts
    const weightForTargets = settings.goalType === 'maintain' && settings.goalWeight > 0 ? settings.goalWeight : settings.bodyWeight
    let weightKg = weightForTargets
```

and in the imperial branch use `weightKg = weightForTargets / 2.20462` (height line unchanged).

- [ ] Tests: maintain uses goalWeight (same result regardless of bodyWeight); lose/gain still track bodyWeight; maintain with goalWeight 0 falls back to bodyWeight:

```ts
import { calculateMacros } from '../macroCalculation'
import type { Settings } from '../../types'

const base: Settings = { onboardingComplete: true, onboardingCompletedAt: undefined, birthDate: new Date(1998, 0, 1), gender: 'male', height: 70, bodyWeight: 174, activityLevel: 'moderate', unitSystem: 'imperial', goalType: 'maintain', goalWeight: 170, goalPace: 0.5, calorieGoal: 0, proteinGoal: 0, carbsGoal: 0, fatsGoal: 0, macrosCustomized: false, goalOvershootAcknowledged: false }

test('maintain anchors to goalWeight — bodyWeight drift changes nothing', () => {
    expect(calculateMacros({ ...base, bodyWeight: 174 }, true)).toEqual(calculateMacros({ ...base, bodyWeight: 168 }, true))
})
test('lose tracks bodyWeight', () => {
    const a = calculateMacros({ ...base, goalType: 'lose', bodyWeight: 174 }, true)
    const b = calculateMacros({ ...base, goalType: 'lose', bodyWeight: 168 }, true)
    expect(a.calResult).toBeGreaterThan(b.calResult)
})
test('maintain with no goalWeight falls back to bodyWeight (legacy safety)', () => {
    expect(calculateMacros({ ...base, goalWeight: 0 }, true)).toEqual(calculateMacros({ ...base, goalWeight: 0, goalType: 'maintain' }, true))
    expect(calculateMacros({ ...base, goalWeight: 0 }, true).calResult).toBeGreaterThan(1500)
})
```

- [ ] Run: `npx jest context/SettingsContext/functions/__tests__/macroCalculation.test.ts` → PASS.

### Task 3: computeBwUpdate rewrite (the core fix)

**Files:**
- Modify: `context/SettingsContext/functions/bodyWeightFunctions.tsx:10-49`
- Test: `context/SettingsContext/functions/__tests__/bodyWeightFunctions.test.ts` (REWRITE — existing tests assert the old flip behavior and must be replaced)

**Interfaces:**
- Produces:
  - `export type BwPrompt = 'goalReached' | 'autoMaintain'`
  - `export const OVERSHOOT_DEADBAND = { imperial: 2, metric: 1 } as const`
  - `export function isGoalReached(s: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight'>): boolean`
  - `computeBwUpdate(updatedWeight, currentSettings)` → `{ dateKey, newSettings, prompt: BwPrompt | null } | null` (prompt added; never touches goalType/goalPace except the safety net)
  - `export function applySwitchToMaintenance(s: Settings): Settings`
- Consumes: `calculateMacros` (Task 2 anchor behavior).

- [ ] Replace the goal-flip body of `computeBwUpdate` with the sim-proven rules (port from `components/devTest/goalReachedLogic.ts` `applyWeighIn`):

```ts
export type BwPrompt = 'goalReached' | 'autoMaintain'
export const OVERSHOOT_DEADBAND = { imperial: 2, metric: 1 } as const

export function isGoalReached(s: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight'>): boolean {
    if (s.goalType === 'lose') return s.bodyWeight <= s.goalWeight
    if (s.goalType === 'gain') return s.bodyWeight >= s.goalWeight
    return false
}

function atOrPastGoal(s: Settings, weight: number): boolean {
    return s.goalType === 'lose' ? weight <= s.goalWeight : weight >= s.goalWeight
}

function pastDeadband(s: Settings, weight: number): boolean {
    const deadband = OVERSHOOT_DEADBAND[s.unitSystem]
    return s.goalType === 'lose' ? weight <= s.goalWeight - deadband : weight >= s.goalWeight + deadband
}

function withRegeneratedTargets(s: Settings): Settings {
    if (s.macrosCustomized) return s
    const macros = calculateMacros(s, s.unitSystem === 'imperial')
    return { ...s, calorieGoal: macros.calResult, proteinGoal: macros.proteinGrams, carbsGoal: macros.carbGrams, fatsGoal: macros.fatGrams }
}

export function applySwitchToMaintenance(s: Settings): Settings {
    return withRegeneratedTargets({ ...s, goalType: 'maintain', goalOvershootAcknowledged: false })
}

export function computeBwUpdate(
    updatedWeight: number,
    currentSettings: Settings,
): { dateKey: string; newSettings: Settings; prompt: BwPrompt | null } | null {
    if (updatedWeight <= 0) return null
    const dateKey = getDateKey(new Date())

    let newSettings = withRegeneratedTargets({ ...currentSettings, bodyWeight: updatedWeight })

    let prompt: BwPrompt | null = null
    if (newSettings.goalType !== 'maintain' && !newSettings.goalOvershootAcknowledged) {
        const wasPast = atOrPastGoal(currentSettings, currentSettings.bodyWeight)
        if (wasPast && pastDeadband(newSettings, updatedWeight)) {
            newSettings = applySwitchToMaintenance(newSettings)
            prompt = 'autoMaintain'
        } else if (!wasPast && atOrPastGoal(currentSettings, updatedWeight)) {
            prompt = 'goalReached'
        }
    }

    return { dateKey, newSettings, prompt }
}
```

(Keep `getBodyWeightProgressData` untouched. `calculateMacros` import already exists.)

- [ ] Rewrite `bodyWeightFunctions.test.ts`: port all 14 cases from `components/devTest/__tests__/goalReachedLogic.test.ts`, adapted to `computeBwUpdate(weight, settings)` — build settings via a local `makeSettings(overrides)` helper (full Settings literal with the two new flags). Cover: maintain noise never flips; targets recalc pre-crossing; crossing lose/gain → `prompt: 'goalReached'`, goalType untouched; single big jump asks not acts; deadband boundary (169→168.5 nothing, →168 `autoMaintain` + goalType maintain); metric 1 kg; acknowledged disarms both; customized preserves targets through weigh-ins AND auto-maintain; `applySwitchToMaintenance` re-arms acknowledged=false; auto-maintain targets equal a fresh maintain calc at goalWeight; pace never changes; `isGoalReached` per goal type.
- [ ] Run: `npx jest context/SettingsContext/functions/__tests__/bodyWeightFunctions.test.ts` → PASS (all new).

### Task 4: SettingsContext — return the prompt, expose the two actions

**Files:**
- Modify: `context/SettingsContext/index.tsx:97-115` (handleUpdateBw) + provider value
- Modify: `context/SettingsContext/types.ts` (SettingsContextInterface)

**Interfaces:**
- Produces (context): `handleUpdateBw(updatedWeight: number): Promise<BwPrompt | null>`, `switchToMaintenance(): void`, `acknowledgeGoalOvershoot(): void`.

- [ ] `handleUpdateBw`: keep the functional updater (same-tick height edits from adjustMeasurements/onboarding4 must merge), compute the prompt from closure settings (prompt inputs — goalType/goalWeight/bodyWeight/unitSystem/acknowledged — are not touched by those same-tick callers). Add `settings` to the dep array.

```ts
const handleUpdateBw = useCallback(async (updatedWeight: number): Promise<BwPrompt | null> => {
    if (updatedWeight <= 0) return null

    const dateKey = getDateKey(new Date())

    setBwProgressState(prev => ({ ...prev, [dateKey]: updatedWeight }))
    setSettingsState(prev => {
        const result = computeBwUpdate(updatedWeight, prev)
        return result ? result.newSettings : prev
    })
    markSettingsPersistDirty()

    // Prompt decision recomputed from closure settings: cheap, pure, and its
    // inputs are never part of the same-tick setSettings that precedes this call.
    const prompt = computeBwUpdate(updatedWeight, settings)?.prompt ?? null

    if (!userID) return prompt
    try {
        await upsertWeightForDate(userID, dateKey, updatedWeight)
    } catch (e) {
        reportPersistFailure('settings', e, { reload: reloadFromDisk, severity: 'high', onboarding: onboardingCompleteRef.current === false })
    }
    return prompt
}, [userID, settings, markSettingsPersistDirty, reloadFromDisk])
```

- [ ] Add the two actions and put them in the provider value:

```ts
const switchToMaintenance = useCallback(() => {
    setSettings(prev => applySwitchToMaintenance(prev))
}, [setSettings])

const acknowledgeGoalOvershoot = useCallback(() => {
    setSettings(prev => ({ ...prev, goalOvershootAcknowledged: true }))
}, [setSettings])
```

(Import `applySwitchToMaintenance`, `BwPrompt` from bodyWeightFunctions. `setSettings` already accepts a functional updater.)

- [ ] `SettingsContextInterface`: change `handleUpdateBw: (updatedWeight: number) => Promise<'goalReached' | 'autoMaintain' | null>;` and add `switchToMaintenance: () => void; acknowledgeGoalOvershoot: () => void;`.
- [ ] Run: `npx tsc --noEmit` — callers of handleUpdateBw (updateBWModal, adjustMeasurements, onboarding) still typecheck (they ignore the return today; awaiting is optional).

### Task 5: updateBWModal — host the prompt, honest copy

**Files:**
- Modify: `app/nutritionScreens/updateBWModal.tsx`

**Interfaces:**
- Consumes: `handleUpdateBw` (Task 4), `GoalReachedPrompt`, `switchToMaintenance`, `acknowledgeGoalOvershoot`.

- [ ] Subtitle line becomes state-honest:

```tsx
Current: {currentWeight} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'} {'\n'}
{settings.macrosCustomized ? 'Your custom targets are kept' : 'Nutrition goals will be updated automatically'}
```

- [ ] Update button handler: `const prompt = await handleUpdateBw(parsedWeight)`; if null → `router.back()` (today's flow); else stash in `const [prompt, setPrompt] = useState<BwPrompt | null>(null)` and render:

```tsx
<GoalReachedPrompt
    visible={prompt !== null}
    variant={prompt ?? 'goalReached'}
    goalWeight={settings.goalWeight}
    unitLabel={settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}
    onSwitchToMaintenance={() => { switchToMaintenance(); router.back() }}
    onSetNewGoal={() => router.replace('/settingsScreens/adjustNutrition/adjustNutrition1')}
    onKeepGoing={() => { acknowledgeGoalOvershoot(); router.back() }}
    onDismiss={() => router.back()}
/>
```

(For the `autoMaintain` variant the switch already happened inside computeBwUpdate — "Got It" (onDismiss) just closes; "Set a New Goal" routes to the wizard.)

- [ ] Manual check note: goalWeight shown in the prompt is pre-update settings (unchanged by weigh-in) — correct.

### Task 6: progress.tsx — mount the banner

**Files:**
- Modify: `app/(tabs)/progress.tsx:144` (below `<ActivityBanner …/>`)

- [ ] Under the ActivityBanner line, nutrition mode only:

```tsx
{!mode && isGoalReached(settings) && (
    <GoalReachedBanner onPress={() => router.push('/settingsScreens/adjustNutrition/adjustNutrition1')} />
)}
```

Imports: `GoalReachedBanner`, `isGoalReached`; confirm `settings` + `router` are already in scope in progress.tsx (both are used there).

### Task 7: Flag lifecycle at every macro/goal touchpoint

**Files:**
- Modify: `app/settingsScreens/profile.tsx:42-60`
- Modify: `app/settingsScreens/adjustTraining.tsx:19-35`
- Modify: `app/settingsScreens/adjustMeasurements.tsx:25-46`
- Modify: `app/settingsScreens/adjustNutrition/adjustNutrition4.tsx:42-57`

- [ ] profile `handleSaveMacro`: every branch also sets `macrosCustomized: true` (e.g. `setSettings({ ...settings, calorieGoal: value, macrosCustomized: true })`).
- [ ] profile `handleSaveHeight`: customized users get asked instead of silently recalced:

```ts
function handleSaveHeight(totalHeight: number) {
    const updatedSettings = { ...settings, height: totalHeight }
    if (settings.macrosCustomized) {
        Alert.alert('Recalculate targets?', 'You have hand-tuned macro targets. Recalculate them for your new height, or keep them as they are?', [
            { text: 'Keep custom', onPress: () => setSettings(updatedSettings) },
            { text: 'Recalculate', onPress: () => setSettings(withMacros({ ...updatedSettings, macrosCustomized: false })) },
        ])
        return
    }
    setSettings(withMacros(updatedSettings))
}
```

where `withMacros(s)` is a small local helper applying `calculateMacros(s, s.unitSystem === 'imperial')` to the four goals (extract from the current body; add `Alert` import).
- [ ] adjustTraining (activity level save): same gate — read the file first; wrap its existing recalc+setSettings exactly like handleSaveHeight (Keep custom = save activityLevel only; Recalculate = recalc + clear flag).
- [ ] adjustMeasurements `handleSave`: delete the local `calculateMacros` recalc block (lines 35-43); it becomes:

```ts
setSettings({ ...settings, height: totalHeight })
handleUpdateBw(Number(weight))
router.back()
```

(handleUpdateBw's functional updater sees the queued height and regenerates targets itself, respecting macrosCustomized. Crossing via this screen intentionally shows no prompt — the banner on the progress screen covers it.)
- [ ] adjustNutrition4 `handleSave`: explicit regeneration + new goal re-arms everything — add to the setSettings object: `macrosCustomized: false, goalOvershootAcknowledged: false`.
- [ ] Run: `npx tsc --noEmit` → no new errors.

### Task 8: Dev Hub sim delegates to the real logic + full verification

**Files:**
- Modify: `components/devTest/goalReachedLogic.ts`
- Keep: `components/devTest/__tests__/goalReachedLogic.test.ts` (must still pass unchanged — proves behavior parity)

- [ ] Replace the sim's private rule implementation with delegation: `toSettings(simState)` (now needs the two new flags mapped from SimState) → call the real `computeBwUpdate` / `applySwitchToMaintenance` / `isGoalReached` from `@/context/SettingsContext/functions/bodyWeightFunctions` → map `newSettings` back to SimState + keep generating the same event strings from the outcome (weigh-in line, targets line via macrosCustomized check, crossing/safety-net lines via `prompt`). Delete the sim's own copies of `atOrPastGoal`/`pastDeadband`/deadband math; re-export `OVERSHOOT_DEADBAND` and `isGoalReached` from the real module so `GoalReachedSimTest.tsx` imports keep working.
- [ ] Run all: `npx jest components/devTest context/SettingsContext` → PASS (sim tests prove parity; context tests prove the real thing).
- [ ] `npx tsc --noEmit` → no new errors vs baseline.
- [ ] Update `docs/AUDIT_MAJOR.txt` issue 8: append a status line "IMPLEMENTED 2026-07-14 (pending: run settings_goal_intent_flags.sql in Supabase at release)". Update the spec doc status line similarly. Do NOT move the issue to COMPLETED_ISSUES.txt (user curates that).

### Task 9: Code-simplifier pass + final gate

- [ ] Dispatch the `code-simplifier:code-simplifier` agent scoped to the files changed in Tasks 1-8 (functionality-preserving cleanups only).
- [ ] Re-run the full suite: `npx jest` → the only failing suites are the 6 pre-existing ones (foodDB/openAI/connector env + stale copy expectations in workout validator/logFunctions/nutrition graphFunctions). `npx tsc --noEmit` → only pre-existing errors.
- [ ] Report: what changed, release checklist (SQL migration → EAS build), and that Dev Hub sim now runs the production logic.
