import { applySwitchToMaintenance, computeBwUpdate, goalReachedBannerCopy, isGoalReached, shouldPromptGoalReached } from '../bodyWeightFunctions'
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

    test('a big jump straight past goal still only asks', () => {
        const result = computeBwUpdate(167, makeSettings({ bodyWeight: 171 }))!
        expect(result.prompt).toBe('goalReached')
        expect(result.newSettings.goalType).toBe('lose')
    })

    test('level-triggered: every weigh-in at/past goal asks again, and nothing ever switches', () => {
        const first = computeBwUpdate(169.5, makeSettings({ bodyWeight: 170.5 }))!
        expect(first.prompt).toBe('goalReached')
        expect(first.newSettings.goalType).toBe('lose')

        const second = computeBwUpdate(168, first.newSettings)!
        expect(second.prompt).toBe('goalReached')
        expect(second.newSettings.goalType).toBe('lose')
        expect(second.newSettings.goalPace).toBe(1)
    })

    test('bouncing back above goal stops the asking until past goal again', () => {
        const past = computeBwUpdate(169.8, makeSettings({ bodyWeight: 170.5 }))!
        const bounced = computeBwUpdate(170.4, past.newSettings)!
        expect(bounced.prompt).toBeNull()
    })

    test('goalOvershootAcknowledged silences the prompt (Keep Going = mute while at/past goal)', () => {
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

    test('hand-tuned macros survive the consented switch to maintenance', () => {
        const tuned = makeSettings({ macrosCustomized: true, proteinGoal: 225 })
        const next = applySwitchToMaintenance(tuned)
        expect(next.goalType).toBe('maintain')
        expect(next.proteinGoal).toBe(225)
    })

    test('applySwitchToMaintenance switches immediately and re-arms acknowledgement', () => {
        const acknowledged = makeSettings({ bodyWeight: 169.8, goalOvershootAcknowledged: true })
        const next = applySwitchToMaintenance(acknowledged)
        expect(next.goalType).toBe('maintain')
        expect(next.goalOvershootAcknowledged).toBe(false)
        expect(next.calorieGoal).toBe(calculateMacros(next, true).calResult)
    })

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

    test('isGoalReached: lose at/below goal, gain at/above goal, maintain never', () => {
        expect(isGoalReached({ goalType: 'lose', bodyWeight: 170, goalWeight: 170 })).toBe(true)
        expect(isGoalReached({ goalType: 'lose', bodyWeight: 170.1, goalWeight: 170 })).toBe(false)
        expect(isGoalReached({ goalType: 'gain', bodyWeight: 170, goalWeight: 170 })).toBe(true)
        expect(isGoalReached({ goalType: 'gain', bodyWeight: 169.9, goalWeight: 170 })).toBe(false)
        expect(isGoalReached({ goalType: 'maintain', bodyWeight: 170, goalWeight: 170 })).toBe(false)
    })

    test('shouldPromptGoalReached: reached and unmuted asks; muted or not reached does not', () => {
        expect(shouldPromptGoalReached({ goalType: 'lose', bodyWeight: 170, goalWeight: 170, goalOvershootAcknowledged: false })).toBe(true)
        expect(shouldPromptGoalReached({ goalType: 'lose', bodyWeight: 170, goalWeight: 170, goalOvershootAcknowledged: true })).toBe(false)
        expect(shouldPromptGoalReached({ goalType: 'lose', bodyWeight: 175, goalWeight: 170, goalOvershootAcknowledged: false })).toBe(false)
    })
})
