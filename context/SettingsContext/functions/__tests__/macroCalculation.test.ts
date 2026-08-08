import { calculateCalorieTarget, calculateMacros } from '../macroCalculation'
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

// Mid-month, ~6 months back, minus the age — calculateAge runs on the wall clock, so an absolute
// birthDate would silently age the fixture every year and rot the hand-computed expectation below.
function birthDateForAge(age: number): Date {
    const d = new Date()
    d.setDate(15)
    d.setMonth(d.getMonth() - 6)
    d.setFullYear(d.getFullYear() - age)
    return d
}

describe('calculateMacros states the target it computed', () => {
    // Metric so the arithmetic is exact by hand — F 65y · 150cm · 45kg · sedentary:
    // BMR = 450 + 937.5 − 325 − 161 = 901.5, × 1.2 = 1081.8. A 1 lb/wk cut takes 500 off → 581.8.
    const subMinimum = makeSettings({
        gender: 'female',
        birthDate: birthDateForAge(65),
        height: 150,
        bodyWeight: 45,
        unitSystem: 'metric',
        activityLevel: 'sedentary',
        goalType: 'lose',
        goalWeight: 40,
        goalPace: 1,
    })

    test('a sub-minimum target is stated raw — nothing is clamped up to 1200', () => {
        expect(calculateMacros(subMinimum, false).calResult).toBe(582)
    })

    test('macros reconcile with that stated target', () => {
        const { calResult, proteinGrams, fatGrams, carbGrams } = calculateMacros(subMinimum, false)
        const macroCalories = proteinGrams * 4 + fatGrams * 9 + carbGrams * 4
        // Within rounding slack of the three integer-rounded macro grams.
        expect(Math.abs(macroCalories - calResult)).toBeLessThanOrEqual(15)
    })

    test('calResult is calculateCalorieTarget.target — one number, two entry points', () => {
        // The guarantee the pace slider's readout depends on: what it quotes is what the plan screen
        // commits. Proven across all three goals rather than on the cut alone.
        for (const goalType of ['lose', 'maintain', 'gain'] as const) {
            const s = makeSettings({ goalType, goalPace: 0.7 })
            expect(calculateMacros(s, true).calResult).toBe(calculateCalorieTarget(s, true).target)
        }
    })
})
