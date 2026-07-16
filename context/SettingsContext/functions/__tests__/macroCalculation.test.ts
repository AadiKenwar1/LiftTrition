import { calculateMacros } from '../macroCalculation'
import type { Settings } from '../../types'

function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: undefined,
        birthDate: new Date(1998, 0, 1),
        gender: 'male',
        height: 70,
        bodyWeight: 174,
        activityLevel: 'moderate',
        unitSystem: 'imperial',
        goalType: 'maintain',
        goalWeight: 170,
        goalPace: 0.5,
        calorieGoal: 0,
        proteinGoal: 0,
        carbsGoal: 0,
        fatsGoal: 0,
        macrosCustomized: false,
        goalOvershootAcknowledged: false,
        ...overrides,
    }
}

describe('calculateMacros maintenance anchor', () => {
    test('maintain anchors to goalWeight — bodyWeight drift changes nothing', () => {
        const at174 = calculateMacros(makeSettings({ bodyWeight: 174 }), true)
        const at168 = calculateMacros(makeSettings({ bodyWeight: 168 }), true)
        expect(at174).toEqual(at168)
    })

    test('maintain targets equal a body actually at the goal weight', () => {
        const drifted = calculateMacros(makeSettings({ bodyWeight: 174, goalWeight: 170 }), true)
        const atGoal = calculateMacros(makeSettings({ bodyWeight: 170, goalWeight: 170 }), true)
        expect(drifted).toEqual(atGoal)
    })

    test('lose and gain still track bodyWeight', () => {
        const heavier = calculateMacros(makeSettings({ goalType: 'lose', bodyWeight: 174 }), true)
        const lighter = calculateMacros(makeSettings({ goalType: 'lose', bodyWeight: 168 }), true)
        expect(heavier.calResult).toBeGreaterThan(lighter.calResult)

        const bulkHeavier = calculateMacros(makeSettings({ goalType: 'gain', bodyWeight: 174 }), true)
        const bulkLighter = calculateMacros(makeSettings({ goalType: 'gain', bodyWeight: 168 }), true)
        expect(bulkHeavier.calResult).toBeGreaterThan(bulkLighter.calResult)
    })

    test('maintain with no goalWeight falls back to bodyWeight (legacy safety)', () => {
        const noAnchor = calculateMacros(makeSettings({ goalWeight: 0 }), true)
        const fromBody = calculateMacros(makeSettings({ goalWeight: 174 }), true)
        expect(noAnchor).toEqual(fromBody)
        expect(noAnchor.calResult).toBeGreaterThan(1500)
    })
})

describe('calculateMacros calorie floor', () => {
    // Small, older, sedentary user on an aggressive cut whose raw TDEE lands well below the 1200 floor.
    const subFloor = makeSettings({
        gender: 'female',
        birthDate: new Date(1960, 0, 1),
        height: 60,
        bodyWeight: 100,
        activityLevel: 'sedentary',
        goalType: 'lose',
        goalWeight: 90,
        goalPace: 1,
    })

    test('clamps calResult up to the 1200 floor for women', () => {
        expect(calculateMacros(subFloor, true).calResult).toBe(1200)
    })

    test('macros reconcile with the clamped calorie target, not the raw TDEE', () => {
        const { calResult, proteinGrams, fatGrams, carbGrams } = calculateMacros(subFloor, true)
        const macroCalories = proteinGrams * 4 + fatGrams * 9 + carbGrams * 4
        // Within rounding slack of the three integer-rounded macro grams.
        expect(Math.abs(macroCalories - calResult)).toBeLessThanOrEqual(15)
    })
})
