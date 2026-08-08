import { calculateCalorieTarget, derivedPace } from '../macroCalculation'
import type { Settings } from '../../types'

// derivedPace is pure arithmetic over (maintenance, calorieGoal, goalType) — most cases feed it
// plain numbers. The round-trip cases go through calculateCalorieTarget because the contract under
// test is theirs jointly: a slider-chosen pace must survive the kcal rounding invisibly (< 0.001).

function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: undefined,
        birthDate: birthDateForAge(30),
        gender: 'female',
        height: 64,
        bodyWeight: 150,
        activityLevel: 'sedentary',
        unitSystem: 'imperial',
        goalType: 'lose',
        goalWeight: 130,
        goalPace: 1,
        calorieGoal: 0,
        proteinGoal: 0,
        carbsGoal: 0,
        fatsGoal: 0,
        macrosCustomized: false,
        goalOvershootAcknowledged: false,
        ...overrides,
    }
}

// Mid-month, ~6 months back, minus the age — keeps the fixture's age fixed on any run date.
function birthDateForAge(age: number): Date {
    const d = new Date()
    d.setDate(15)
    d.setMonth(d.getMonth() - 6)
    d.setFullYear(d.getFullYear() - age)
    return d
}

describe('derivedPace arithmetic', () => {
    test('lose counts the deficit: (2000 − 1400) / 500 = 1.2', () => {
        expect(derivedPace(2000, 1400, 'lose')).toBe(1.2)
    })

    test('gain counts the surplus: (2600 − 2000) / 500 = 1.2', () => {
        expect(derivedPace(2000, 2600, 'gain')).toBe(1.2)
    })

    test('zero deficit derives 0 — eating at maintenance moves nothing', () => {
        expect(derivedPace(2000, 2000, 'lose')).toBe(0)
    })

    test('a wrong-direction target clamps to 0, never negative', () => {
        expect(derivedPace(2000, 2300, 'lose')).toBe(0)
        expect(derivedPace(2000, 1700, 'gain')).toBe(0)
    })

    test('maintain always derives 0', () => {
        expect(derivedPace(2000, 1234, 'maintain')).toBe(0)
    })
})

describe('derivedPace round trip with calculateCalorieTarget', () => {
    // F 30y · 64in · 150 lb · sedentary — maintenance 1662.4672 by hand.

    test('an unclamped slider pace survives the kcal rounding to within 0.001 lb/week', () => {
        // pace 1.2 → raw 1062.4672 → target 1062; back: 600.4672 / 500 = 1.20093.
        const { maintenance, target } = calculateCalorieTarget(makeSettings({ goalPace: 1.2 }), true)
        expect(Math.abs(derivedPace(maintenance, target, 'lose') - 1.2)).toBeLessThan(0.001)
    })

    test('the fastest pace round-trips too — no clamp left to break it', () => {
        // pace 2 → raw 662.4672 → target 662; back: 1000.4672 / 500 = 2.00093. Under the old 800 floor
        // this target clamped up and derived 1.72493, so the quoted date silently contradicted the slider.
        const { maintenance, target } = calculateCalorieTarget(makeSettings({ goalPace: 2 }), true)
        expect(target).toBe(662)
        expect(Math.abs(derivedPace(maintenance, target, 'lose') - 2)).toBeLessThan(0.001)
    })
})
