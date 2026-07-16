# Goal Banner Dynamic Copy + Keep-Going Re-Arm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope the Keep-Going mute to "while at/past goal" (zero-margin re-arm) and make the banner's copy reflect distance past goal (display-only 2 lb / 1 kg band).

**Architecture:** Both rules live as pure functions in `context/SettingsContext/functions/bodyWeightFunctions.tsx` (the issue-8 rules module). The banner becomes a dumb consumer of a pure copy helper via a structural `state` prop, so the real app (`Settings`) and the dev sim (`SimState`) both satisfy it. The dev sim inherits the re-arm behavior for free (it delegates to `computeBwUpdate`) and only needs narration.

**Tech Stack:** React Native / Expo, TypeScript strict, Jest (jest-expo).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-15-goal-banner-copy-and-rearm-design.md`.
- NO git operations of any kind (no commit/branch/push) — the user owns version control. Plan steps therefore end at "tests pass", never "commit".
- Reached copy string stays exactly: `Goal reached — set your next goal`.
- Past copy string exactly: `` `${delta} ${unit} past your goal — set your next goal` `` with delta rounded to 1 decimal, trailing .0 stripped; unit `lbs`/`kg`.
- Band: `GOAL_COPY_BAND = { imperial: 2, metric: 1 }` — display-only, must not gate any behavior.
- Re-arm is zero-margin: mute clears exactly when `isGoalReached` is false.
- Run tests with `npx jest <path> -t "<name>"` (PowerShell-safe).

---

### Task 1: Zero-margin re-arm in computeBwUpdate

**Files:**
- Modify: `context/SettingsContext/functions/bodyWeightFunctions.tsx:36-50` (and header comment 5-11)
- Test: `context/SettingsContext/functions/__tests__/computeBwUpdate.test.ts`

**Interfaces:**
- Consumes: existing `isGoalReached`, `withRegeneratedTargets`.
- Produces: unchanged signature `computeBwUpdate(updatedWeight, currentSettings)` — but `newSettings.goalOvershootAcknowledged` is now `false` whenever the new weight is not at/past goal.

- [ ] **Step 1: Write the failing tests** (append inside the describe block)

```ts
test('crossing back above goal clears the Keep Going mute (zero-margin re-arm)', () => {
    const acknowledged = makeSettings({ bodyWeight: 169.8, goalOvershootAcknowledged: true })
    const bounced = computeBwUpdate(170.4, acknowledged)!
    expect(bounced.newSettings.goalOvershootAcknowledged).toBe(false)
    expect(bounced.prompt).toBeNull()
})

test('re-reaching goal after a re-arm asks again', () => {
    const acknowledged = makeSettings({ bodyWeight: 169.8, goalOvershootAcknowledged: true })
    const bounced = computeBwUpdate(170.4, acknowledged)!
    const rereached = computeBwUpdate(169.9, bounced.newSettings)!
    expect(rereached.prompt).toBe('goalReached')
})

test('the mute persists while staying at/past goal', () => {
    const acknowledged = makeSettings({ bodyWeight: 169.8, goalOvershootAcknowledged: true })
    const result = computeBwUpdate(166, acknowledged)!
    expect(result.newSettings.goalOvershootAcknowledged).toBe(true)
    expect(result.prompt).toBeNull()
})

test('gain mirror: dropping back below goal re-arms, re-reaching asks', () => {
    const acknowledged = makeSettings({ goalType: 'gain', bodyWeight: 170.5, goalOvershootAcknowledged: true })
    const bounced = computeBwUpdate(169.5, acknowledged)!
    expect(bounced.newSettings.goalOvershootAcknowledged).toBe(false)
    const rereached = computeBwUpdate(170, bounced.newSettings)!
    expect(rereached.prompt).toBe('goalReached')
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest context/SettingsContext/functions/__tests__/computeBwUpdate.test.ts`
Expected: the two re-arm tests and the gain mirror FAIL (`goalOvershootAcknowledged` stays `true`); "mute persists" PASSES (already-true behavior).

- [ ] **Step 3: Implement** — replace the body of `computeBwUpdate` after the dateKey line:

```ts
const base = withRegeneratedTargets({ ...currentSettings, bodyWeight: updatedWeight })
const reached = isGoalReached(base)

// Keep Going mutes the ask only while the user stays at/past goal: crossing
// back re-arms it (zero margin — the mute's edge is the banner's edge), so
// re-reaching the goal asks again.
const newSettings = !reached && base.goalOvershootAcknowledged ? { ...base, goalOvershootAcknowledged: false } : base

// Prompt condition = banner condition + "hasn't said stop asking".
const prompt: BwPrompt | null = reached && !newSettings.goalOvershootAcknowledged ? 'goalReached' : null

return { dateKey, newSettings, prompt }
```

Update the module header comment (lines 8-10) to say the Keep Going mute lasts while the user remains at/past goal and clears when weight crosses back.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest context/SettingsContext/functions/__tests__/computeBwUpdate.test.ts`
Expected: PASS (all, including pre-existing).

### Task 2: goalReachedBannerCopy helper

**Files:**
- Modify: `context/SettingsContext/functions/bodyWeightFunctions.tsx` (below `isGoalReached`)
- Test: `context/SettingsContext/functions/__tests__/computeBwUpdate.test.ts`

**Interfaces:**
- Produces: `GOAL_COPY_BAND: { imperial: 2, metric: 1 }`; `goalReachedBannerCopy(s: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight' | 'unitSystem'>): string`. Task 3 imports both names from `@/context/SettingsContext/functions/bodyWeightFunctions`.

- [ ] **Step 1: Write the failing tests** (append; import `goalReachedBannerCopy` in the test's import line)

```ts
test('goalReachedBannerCopy: within the display band keeps the reached copy', () => {
    expect(goalReachedBannerCopy(makeSettings({ bodyWeight: 170 }))).toBe('Goal reached — set your next goal')
    expect(goalReachedBannerCopy(makeSettings({ bodyWeight: 168.1 }))).toBe('Goal reached — set your next goal')
})

test('goalReachedBannerCopy: at/past the band switches to delta copy', () => {
    expect(goalReachedBannerCopy(makeSettings({ bodyWeight: 168 }))).toBe('2 lbs past your goal — set your next goal')
    expect(goalReachedBannerCopy(makeSettings({ bodyWeight: 165.5 }))).toBe('4.5 lbs past your goal — set your next goal')
})

test('goalReachedBannerCopy: gain direction and the metric band', () => {
    expect(goalReachedBannerCopy({ goalType: 'gain', bodyWeight: 173, goalWeight: 170, unitSystem: 'imperial' })).toBe('3 lbs past your goal — set your next goal')
    expect(goalReachedBannerCopy({ goalType: 'gain', bodyWeight: 78, goalWeight: 77, unitSystem: 'metric' })).toBe('1 kg past your goal — set your next goal')
    expect(goalReachedBannerCopy({ goalType: 'lose', bodyWeight: 76.5, goalWeight: 77, unitSystem: 'metric' })).toBe('Goal reached — set your next goal')
})
```

- [ ] **Step 2: Run to verify they fail** (helper not defined)

- [ ] **Step 3: Implement** in bodyWeightFunctions.tsx:

```ts
// Display band only — picks which banner sentence renders; it gates no behavior.
export const GOAL_COPY_BAND = { imperial: 2, metric: 1 } as const

export function goalReachedBannerCopy(s: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight' | 'unitSystem'>): string {
    const past = Math.round((s.goalType === 'lose' ? s.goalWeight - s.bodyWeight : s.bodyWeight - s.goalWeight) * 10) / 10
    if (past < GOAL_COPY_BAND[s.unitSystem]) return 'Goal reached — set your next goal'
    const delta = Number.isInteger(past) ? String(past) : past.toFixed(1)
    return `${delta} ${s.unitSystem === 'imperial' ? 'lbs' : 'kg'} past your goal — set your next goal`
}
```

- [ ] **Step 4: Run tests to verify they pass**

### Task 3: Banner prop + all three callers

**Files:**
- Modify: `components/NutritionComponents/GoalReachedBanner.tsx`
- Modify: `app/(tabs)/progress.tsx:148`
- Modify: `components/devTest/GoalReachedSimTest.tsx:116`
- Modify: `components/devTest/GoalReachedTest.tsx:37-40`

**Interfaces:**
- Consumes: `goalReachedBannerCopy` (Task 2).
- Produces: `GoalReachedBanner({ state, onPress })` where `state: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight' | 'unitSystem'>` — structural, so `Settings` and `SimState` both satisfy it.

- [ ] **Step 1: Banner component** — import the helper, add the prop, replace the literal label:

```tsx
import { goalReachedBannerCopy } from '@/context/SettingsContext/functions/bodyWeightFunctions'
import type { Settings } from '@/context/SettingsContext/types'

export default function GoalReachedBanner({ state, onPress }: { state: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight' | 'unitSystem'>; onPress: () => void }) {
```

Label element becomes `{goalReachedBannerCopy(state)}`. Extend the header comment: copy shows the distance past goal once beyond the display band.

- [ ] **Step 2: progress.tsx** — `<GoalReachedBanner state={settings} onPress={…} />` (line 148).

- [ ] **Step 3: GoalReachedSimTest.tsx** — `<GoalReachedBanner state={sim} onPress={…} />` (line 116).

- [ ] **Step 4: GoalReachedTest.tsx** — preview both variants in the banner slot (replace the single banner):

```tsx
<GoalReachedBanner state={{ goalType: 'lose', bodyWeight: goalWeight, goalWeight, unitSystem: unit === 'lbs' ? 'imperial' : 'metric' }} onPress={() => setLastAction('Banner tapped → routes to adjustNutrition wizard')} />
<GoalReachedBanner state={{ goalType: 'lose', bodyWeight: goalWeight - (unit === 'lbs' ? 4.5 : 2.5), goalWeight, unitSystem: unit === 'lbs' ? 'imperial' : 'metric' }} onPress={() => setLastAction('Banner tapped → routes to adjustNutrition wizard')} />
```

(Second banner needs `marginTop` — wrap in the existing slot; the pill already has `marginBottom: 12`, so stacking is fine.)

- [ ] **Step 5: Typecheck** — `npx tsc --noEmit`. Expected: clean.

### Task 4: Dev sim narration + re-arm test

**Files:**
- Modify: `components/devTest/goalReachedLogic.ts` (`applyWeighIn`, `applyKeepGoing`)
- Modify: `components/devTest/GoalReachedSimTest.tsx:137` (chip copy)
- Test: `components/devTest/__tests__/goalReachedLogic.test.ts`

- [ ] **Step 1: Failing test:**

```ts
test('Keep Going mute clears when weight crosses back above goal; re-reaching asks again', () => {
    const acknowledged = applyKeepGoing(loseState({ bodyWeight: 169.8 })).state
    const bounced = applyWeighIn(acknowledged, 170.4)
    expect(bounced.state.goalOvershootAcknowledged).toBe(false)
    expect(bounced.events.some((e) => e.includes('re-arm'))).toBe(true)
    const rereached = applyWeighIn(bounced.state, 169.9)
    expect(rereached.prompt).toBe('goalReached')
})
```

- [ ] **Step 2: Run** — behavior assertions pass already (sim delegates to computeBwUpdate); the narration assertion FAILS.

- [ ] **Step 3: Implement narration** in `applyWeighIn` (after the prompt event block):

```ts
if (prev.goalOvershootAcknowledged && !state.goalOvershootAcknowledged) {
    events.push('Crossed back before goal — "Keep Going" re-armed; reaching goal asks again')
}
```

And `applyKeepGoing` event → `'User chose "Keep Going" — asking muted while at/past goal; banner stays'`. SimTest chip (line 137) → `Keep Going — asking muted`.

- [ ] **Step 4: Run sim tests** — `npx jest components/devTest/__tests__/goalReachedLogic.test.ts`. Expected: PASS.

### Task 5: Docs

**Files:**
- Modify: `docs/superpowers/specs/2026-07-14-goal-reached-devhub-design.md` (goalOvershootAcknowledged + banner paragraphs)
- Modify: `docs/COMPLETED_ISSUES.txt` (postscript)
- Modify: `docs/superpowers/plans/2026-07-14-issue8-goal-intent.md`, `docs/superpowers/plans/2026-07-15-goal-prompt-host.md` (superseded headers)

- [ ] **Step 1:** In the 2026-07-14 spec: note the flag now ALSO clears on any weigh-in landing before goal (zero-margin re-arm, 2026-07-15), and the banner copy is dynamic past the display band.
- [ ] **Step 2:** COMPLETED_ISSUES postscript describing both changes (match file's plain-text style).
- [ ] **Step 3:** One-line "Superseded" notes atop the two stale plans (deadband/autoMaintain references).

### Task 6: Verify

- [ ] **Step 1:** `npx jest` (full suite). Expected: all pass.
- [ ] **Step 2:** `npx tsc --noEmit`. Expected: clean.
