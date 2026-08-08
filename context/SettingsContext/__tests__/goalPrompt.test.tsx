// react-test-renderer ships no bundled types (@types/react-test-renderer not installed); suppress the
// missing-declaration error (test-only runtime dep), matching index.persist.test.tsx.
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { SettingsProvider, useSettings } from '../index'
import type { Settings, SettingsContextInterface } from '../types'
import { DEFAULT_SETTINGS } from '../defaults'
import { loadSettingsAndBw, upsertSettings, upsertWeightForDate } from '../database/powersyncStore'
import { getDateKey } from '@/lib/utils/dateHelper'

// The goal-reached prompt is raised by handleUpdateBw and rendered by GoalPromptHost. Its decision must be
// made against the settings the weigh-in actually SAVED — a screen may commit goal fields and the weigh-in in
// the same tick (the onboarding goal screen does exactly that), and the two must never disagree. These tests
// walk the weigh-in transition matrix: reached / not reached, goal committed this tick vs. a prior one,
// maintain, acknowledged overshoot, and the events that must NOT raise it (cold load).

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ userID: 'user-1' }),
}))

jest.mock('@/lib/powersync/system', () => ({
    powerSync: { waitForFirstSync: jest.fn().mockResolvedValue(undefined) },
}))

// Sentry is only reached on persist-failure paths none of these tests cross — mocked defensively so importing
// persistErrors never touches the real native SDK, matching index.persist.test.tsx.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }))

jest.mock('../database/powersyncStore', () => ({
    loadSettingsAndBw: jest.fn(),
    upsertSettings: jest.fn(),
    upsertWeightForDate: jest.fn(),
}))

const mockLoadSettingsAndBw = loadSettingsAndBw as jest.Mock
const mockUpsertSettings = upsertSettings as jest.Mock
const mockUpsertWeightForDate = upsertWeightForDate as jest.Mock

let latest: SettingsContextInterface

// Renders nothing; stashes the live context value in `latest` for assertions.
function Probe() {
    latest = useSettings()
    return null
}

// Points the mocked cold load at a settings row, so each test starts from a known goal state.
function seed(overrides: Partial<Settings>) {
    mockLoadSettingsAndBw.mockResolvedValue({ settings: { ...DEFAULT_SETTINGS, ...overrides }, bwProgress: {}, hasData: true })
}

// Mounts SettingsProvider + Probe and flushes the initial load effect to completion.
async function mountProbe() {
    await act(async () => {
        create(
            <SettingsProvider>
                <Probe />
            </SettingsProvider>,
        )
    })
}

// A weigh-in on its own — the update modal / measurements path.
async function weighIn(weight: number) {
    await act(async () => {
        await latest.handleUpdateBw(weight)
    })
}

// A screen that commits goal fields and the weigh-in in ONE tick: setSettings runs first so the queued
// updaters apply in order, then handleUpdateBw — whose closure is still the pre-commit render. This is the
// onboarding goal screen's handleNext, reproduced.
async function commitGoalAndWeighIn(goalFields: Partial<Settings>, weight: number) {
    await act(async () => {
        latest.setSettings({ ...latest.settings, ...goalFields })
        await latest.handleUpdateBw(weight)
    })
}

// The REVERSE order: handleUpdateBw fires first and is never awaited before the literal commit queues
// right behind it — the adjustNutrition wizard's handleSave, reproduced (weight is edited on step 1, so a
// changed one must reach the weigh-in log before the wizard's own goal/macro commit lands). bodyWeight is
// restated in goalFields exactly like the real commit restates `bodyWeight: Number(params.weight)`, so
// computeBwUpdate's queued update — built from the pre-commit closure — is fully superseded either way.
async function commitWeighInThenGoal(weight: number, goalFields: Partial<Settings>) {
    await act(async () => {
        latest.handleUpdateBw(weight)
        latest.setSettings({ ...latest.settings, bodyWeight: weight, ...goalFields })
    })
}

describe('SettingsContext goal-reached prompt', () => {
    beforeEach(() => {
        seed({})
        mockUpsertSettings.mockReset().mockResolvedValue(undefined)
        mockUpsertWeightForDate.mockReset().mockResolvedValue(undefined)
    })

    test('a weigh-in that reaches a goal committed in the SAME tick raises the prompt', async () => {
        // Fresh user: DEFAULT_SETTINGS is goalType 'maintain', which can never be "reached". The cut goal
        // arrives in the same commit as the weigh-in, so only the saved state says the goal was met.
        await mountProbe()
        await commitGoalAndWeighIn({ goalType: 'lose', goalWeight: 150 }, 145)

        expect(latest.settings.goalType).toBe('lose')
        expect(latest.settings.goalWeight).toBe(150)
        expect(latest.settings.bodyWeight).toBe(145)
        expect(latest.pendingGoalPrompt).toBe('goalReached')
    })

    test('a weigh-in that moves the goal out of reach in the SAME tick does not raise the prompt', async () => {
        // The onboarding back-and-change: the user had goal 150, returns to the goal screen and lowers it to
        // 130 while entering 140. 140 is past the OLD goal but short of the new one — the saved goal is the
        // only one that counts.
        seed({ goalType: 'lose', goalWeight: 150, bodyWeight: 200 })
        await mountProbe()
        await commitGoalAndWeighIn({ goalWeight: 130 }, 140)

        expect(latest.settings.goalWeight).toBe(130)
        expect(latest.settings.bodyWeight).toBe(140)
        expect(latest.pendingGoalPrompt).toBeNull()
    })

    test('a weigh-in that reaches a goal committed in a PRIOR tick raises the prompt', async () => {
        seed({ goalType: 'lose', goalWeight: 150, bodyWeight: 200 })
        await mountProbe()
        await weighIn(148)

        expect(latest.pendingGoalPrompt).toBe('goalReached')
    })

    test('a weigh-in short of the goal does not raise the prompt', async () => {
        seed({ goalType: 'lose', goalWeight: 150, bodyWeight: 200 })
        await mountProbe()
        await weighIn(180)

        expect(latest.pendingGoalPrompt).toBeNull()
    })

    test('loading an already-at-goal user does not raise the prompt', async () => {
        // Level-triggered on state alone, this would fire on every cold start for anyone sitting at their
        // goal. Only a weigh-in may raise it.
        seed({ goalType: 'lose', goalWeight: 150, bodyWeight: 145 })
        await mountProbe()

        expect(latest.settings.bodyWeight).toBe(145)
        expect(latest.pendingGoalPrompt).toBeNull()
    })

    test('a maintain user is never prompted, at any weight', async () => {
        seed({ goalType: 'maintain', goalWeight: 170, bodyWeight: 170 })
        await mountProbe()
        await weighIn(170)
        expect(latest.pendingGoalPrompt).toBeNull()

        await weighIn(150)
        expect(latest.pendingGoalPrompt).toBeNull()
    })

    test('an already-acknowledged overshoot is not re-raised', async () => {
        seed({ goalType: 'lose', goalWeight: 150, bodyWeight: 145, goalOvershootAcknowledged: true })
        await mountProbe()
        await weighIn(143)

        expect(latest.pendingGoalPrompt).toBeNull()
    })

    test('drifting back above the goal clears the acknowledgement, so re-reaching it prompts again', async () => {
        seed({ goalType: 'lose', goalWeight: 150, bodyWeight: 145, goalOvershootAcknowledged: true })
        await mountProbe()

        await weighIn(160)
        expect(latest.settings.goalOvershootAcknowledged).toBe(false)
        expect(latest.pendingGoalPrompt).toBeNull()

        await weighIn(149)
        expect(latest.pendingGoalPrompt).toBe('goalReached')
    })

    test('dismissing the prompt lets the next weigh-in raise it again', async () => {
        // Deliberately level-triggered: an undecided ask should come back, not be swallowed by one dismiss.
        seed({ goalType: 'lose', goalWeight: 150, bodyWeight: 200 })
        await mountProbe()

        await weighIn(148)
        expect(latest.pendingGoalPrompt).toBe('goalReached')

        await act(async () => {
            latest.dismissGoalPrompt()
        })
        expect(latest.pendingGoalPrompt).toBeNull()

        await weighIn(147)
        expect(latest.pendingGoalPrompt).toBe('goalReached')
    })

    test('a gain user is prompted at or above the goal, not below it', async () => {
        seed({ goalType: 'gain', goalWeight: 190, bodyWeight: 170 })
        await mountProbe()

        await weighIn(185)
        expect(latest.pendingGoalPrompt).toBeNull()

        await weighIn(190)
        expect(latest.pendingGoalPrompt).toBe('goalReached')
    })

    // adjustNutrition4's save order is the reverse of commitGoalAndWeighIn's: the weigh-in fires
    // BEFORE the goal/macro commit, not after. These pin that flipping the order doesn't flip the
    // outcome — the prompt, the saved goal fields and the weigh-in log all still land correctly.
    describe('weigh-in fired before the goal commit (adjustNutrition wizard order)', () => {
        test('reaching a goal committed in the SAME tick still raises the prompt from the final state', async () => {
            // Fresh user: DEFAULT_SETTINGS is goalType 'maintain', which can never be "reached". The
            // weigh-in lands first against that still-maintain state; only the later commit turns it
            // into a lose goal, and the saved (not the intermediate) state must decide the prompt.
            await mountProbe()
            await commitWeighInThenGoal(145, { goalType: 'lose', goalWeight: 150, goalOvershootAcknowledged: false })

            expect(latest.settings.goalType).toBe('lose')
            expect(latest.settings.goalWeight).toBe(150)
            expect(latest.settings.bodyWeight).toBe(145)
            expect(latest.pendingGoalPrompt).toBe('goalReached')
        })

        test('a goal commit that moves the goal out of reach of the SAME weigh-in does not raise the prompt', async () => {
            seed({ goalType: 'lose', goalWeight: 150, bodyWeight: 200 })
            await mountProbe()
            await commitWeighInThenGoal(140, { goalWeight: 130 })

            expect(latest.settings.goalWeight).toBe(130)
            expect(latest.settings.bodyWeight).toBe(140)
            expect(latest.pendingGoalPrompt).toBeNull()
        })

        test('the weigh-in still logs to bwProgress and persists even though its own settings update is discarded', async () => {
            await mountProbe()
            await commitWeighInThenGoal(145, { goalType: 'lose', goalWeight: 150 })

            expect(latest.bwProgress[getDateKey(new Date())]).toBe(145)
            expect(mockUpsertWeightForDate).toHaveBeenCalledWith('user-1', getDateKey(new Date()), 145)
        })

        test('macro targets from the later commit win over whatever the discarded weigh-in update computed', async () => {
            // Seeded goalType is 'maintain', so the weigh-in's own (queued, then discarded) update
            // would regenerate MAINTAIN-preset targets — nothing like the numbers below, which stand
            // in for the wizard's own calculateMacros result for the LOSE goal it commits right after.
            seed({ goalType: 'maintain', goalWeight: 170, bodyWeight: 170, calorieGoal: 2000, proteinGoal: 150, carbsGoal: 200, fatsGoal: 60 })
            await mountProbe()
            await commitWeighInThenGoal(165, { goalType: 'lose', goalWeight: 150, calorieGoal: 1800, proteinGoal: 160, carbsGoal: 180, fatsGoal: 50, macrosCustomized: false })

            expect(latest.settings.calorieGoal).toBe(1800)
            expect(latest.settings.proteinGoal).toBe(160)
            expect(latest.settings.carbsGoal).toBe(180)
            expect(latest.settings.fatsGoal).toBe(50)
        })
    })
})
