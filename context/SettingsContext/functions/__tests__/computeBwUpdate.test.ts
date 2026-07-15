import { applySwitchToMaintenance, computeBwUpdate, isGoalReached, OVERSHOOT_DEADBAND } from '../bodyWeightFunctions'
import { calculateMacros } from '../macroCalculation'
import type { Settings } from '../../types'

function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: undefined,
        birthDate: new Date(1998, 0, 1),
        gender: 'male',
        height: 70,
        bodyWeight: 175,
        activityLevel: 'moderate',
        unitSystem: 'imperial',
        goalType: 'lose',
        goalWeight: 170,
        goalPace: 1,
        calorieGoal: 2400,
        proteinGoal: 200,
        carbsGoal: 230,
        fatsGoal: 64,
        macrosCustomized: false,
        goalOvershootAcknowledged: false,
        ...overrides,
    }
}

describe('computeBwUpdate (issue 8 rules)', () => {
    test('invalid weight returns null', () => {
        expect(computeBwUpdate(0, makeSettings())).toBeNull()
        expect(computeBwUpdate(-5, makeSettings())).toBeNull()
    })

    test('maintain user + scale noise: goalType and pace never flip', () => {
        const settings = makeSettings({ goalType: 'maintain', goalWeight: 170, bodyWeight: 170, goalPace: 0.5 })
        const result = computeBwUpdate(170.5, settings)!
        expect(result.newSettings.goalType).toBe('maintain')
        expect(result.newSettings.goalPace).toBe(0.5)
        expect(result.prompt).toBeNull()
    })

    test('maintain targets stay anchored to goalWeight across weigh-ins', () => {
        const settings = makeSettings({ goalType: 'maintain', goalWeight: 170, bodyWeight: 170 })
        const first = computeBwUpdate(174, settings)!
        const second = computeBwUpdate(168, first.newSettings)!
        expect(second.newSettings.calorieGoal).toBe(first.newSettings.calorieGoal)
        expect(second.newSettings.proteinGoal).toBe(first.newSettings.proteinGoal)
    })

    test('weigh-in before crossing: targets recalc for the current goal, no prompt, no flip', () => {
        const result = computeBwUpdate(173, makeSettings())!
        expect(result.newSettings.goalType).toBe('lose')
        expect(result.newSettings.goalPace).toBe(1)
        expect(result.newSettings.bodyWeight).toBe(173)
        expect(result.prompt).toBeNull()
        expect(result.newSettings.calorieGoal).not.toBe(2400)
        expect(isGoalReached(result.newSettings)).toBe(false)
    })

    test('gaining on a cut keeps the cut (moving away from goal triggers nothing)', () => {
        const result = computeBwUpdate(177, makeSettings())!
        expect(result.newSettings.goalType).toBe('lose')
        expect(result.prompt).toBeNull()
    })

    test('crossing goal (lose) prompts goalReached but leaves goalType alone', () => {
        const result = computeBwUpdate(169.8, makeSettings({ bodyWeight: 170.5 }))!
        expect(result.prompt).toBe('goalReached')
        expect(result.newSettings.goalType).toBe('lose')
        expect(isGoalReached(result.newSettings)).toBe(true)
    })

    test('crossing goal (gain, landing exactly at goal) prompts goalReached', () => {
        const result = computeBwUpdate(170, makeSettings({ goalType: 'gain', bodyWeight: 169.5, goalPace: 0.5 }))!
        expect(result.prompt).toBe('goalReached')
        expect(result.newSettings.goalType).toBe('gain')
    })

    test('ask before act: a single jump past the deadband asks instead of auto-switching', () => {
        const result = computeBwUpdate(167, makeSettings({ bodyWeight: 171 }))!
        expect(result.prompt).toBe('goalReached')
        expect(result.newSettings.goalType).toBe('lose')
    })

    test('safety net: inside deadband does nothing, at deadband auto-switches to maintain', () => {
        const past = makeSettings({ bodyWeight: 169 })
        const inside = computeBwUpdate(168.5, past)!
        expect(inside.prompt).toBeNull()
        expect(inside.newSettings.goalType).toBe('lose')

        const at = computeBwUpdate(168, inside.newSettings)!
        expect(at.prompt).toBe('autoMaintain')
        expect(at.newSettings.goalType).toBe('maintain')
    })

    test('auto-maintain targets are anchored at goalWeight, not the overshoot weight', () => {
        const fired = computeBwUpdate(168, makeSettings({ bodyWeight: 169 }))!
        expect(fired.prompt).toBe('autoMaintain')
        const anchored = calculateMacros(makeSettings({ goalType: 'maintain', bodyWeight: 168, goalWeight: 170 }), true)
        expect(fired.newSettings.calorieGoal).toBe(anchored.calResult)
        expect(fired.newSettings.proteinGoal).toBe(anchored.proteinGrams)
    })

    test('metric deadband is 1 kg', () => {
        const settings = makeSettings({ unitSystem: 'metric', goalType: 'gain', goalWeight: 77, bodyWeight: 77.2, goalPace: 0.5, height: 178 })
        expect(computeBwUpdate(77.9, settings)!.prompt).toBeNull()
        const fired = computeBwUpdate(78, settings)!
        expect(fired.prompt).toBe('autoMaintain')
        expect(fired.newSettings.goalType).toBe('maintain')
        expect(OVERSHOOT_DEADBAND.metric).toBe(1)
    })

    test('goalOvershootAcknowledged disarms both the prompt and the safety net', () => {
        const acknowledged = makeSettings({ bodyWeight: 169.8, goalOvershootAcknowledged: true })
        const result = computeBwUpdate(166, acknowledged)!
        expect(result.prompt).toBeNull()
        expect(result.newSettings.goalType).toBe('lose')
    })

    test('hand-tuned macros survive weigh-ins', () => {
        const tuned = makeSettings({ macrosCustomized: true, proteinGoal: 225 })
        const result = computeBwUpdate(173, tuned)!
        expect(result.newSettings.calorieGoal).toBe(2400)
        expect(result.newSettings.proteinGoal).toBe(225)
        expect(result.newSettings.macrosCustomized).toBe(true)
    })

    test('hand-tuned macros survive even the auto-maintain switch', () => {
        const tuned = makeSettings({ bodyWeight: 169, macrosCustomized: true, proteinGoal: 225 })
        const result = computeBwUpdate(168, tuned)!
        expect(result.prompt).toBe('autoMaintain')
        expect(result.newSettings.goalType).toBe('maintain')
        expect(result.newSettings.proteinGoal).toBe(225)
    })

    test('applySwitchToMaintenance switches immediately and re-arms acknowledgement', () => {
        const acknowledged = makeSettings({ bodyWeight: 169.8, goalOvershootAcknowledged: true })
        const next = applySwitchToMaintenance(acknowledged)
        expect(next.goalType).toBe('maintain')
        expect(next.goalOvershootAcknowledged).toBe(false)
        expect(next.calorieGoal).toBe(calculateMacros(next, true).calResult)
    })

    test('isGoalReached: lose at/below goal, gain at/above goal, maintain never', () => {
        expect(isGoalReached({ goalType: 'lose', bodyWeight: 170, goalWeight: 170 })).toBe(true)
        expect(isGoalReached({ goalType: 'lose', bodyWeight: 170.1, goalWeight: 170 })).toBe(false)
        expect(isGoalReached({ goalType: 'gain', bodyWeight: 170, goalWeight: 170 })).toBe(true)
        expect(isGoalReached({ goalType: 'gain', bodyWeight: 169.9, goalWeight: 170 })).toBe(false)
        expect(isGoalReached({ goalType: 'maintain', bodyWeight: 170, goalWeight: 170 })).toBe(false)
    })
})
