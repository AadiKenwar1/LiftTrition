import { calculateCalorieTarget } from '../macroCalculation'
import type { Settings } from '../../types'

// Every case pins a reference value computed by hand from Mifflin-St Jeor
// (BMR = 10·kg + 6.25·cm − 5·age + 5 male / − 161 female, × activity factor),
// never by running the function.

function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: undefined,
        birthDate: birthDateForAge(30),
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

// Mid-month, ~6 months back, minus the age — calculateAge runs on the wall clock, so an absolute
// birthDate would silently age the fixture every year and rot every hand-computed expectation.
function birthDateForAge(age: number): Date {
    const d = new Date()
    d.setDate(15)
    d.setMonth(d.getMonth() - 6)
    d.setFullYear(d.getFullYear() - age)
    return d
}

describe('calculateCalorieTarget maintenance', () => {
    // M 40y · 70in · 200 lb · moderate: kg = 200/2.20462 = 90.71858, cm = 177.8,
    // BMR = 907.18582 + 1111.25 − 200 + 5 = 1823.43582, × 1.55 = 2826.3255.
    const body = { gender: 'male' as const, birthDate: birthDateForAge(40), height: 70, bodyWeight: 200, activityLevel: 'moderate' as const, goalWeight: 200, goalPace: 2 }

    test('maintenance is identical across all three goal types for one body', () => {
        const lose = calculateCalorieTarget(makeSettings({ ...body, goalType: 'lose', goalWeight: 180 }), true)
        const gain = calculateCalorieTarget(makeSettings({ ...body, goalType: 'gain', goalWeight: 220 }), true)
        const maintain = calculateCalorieTarget(makeSettings({ ...body, goalType: 'maintain' }), true)
        expect(lose.maintenance).toBe(gain.maintenance)
        expect(gain.maintenance).toBe(maintain.maintenance)
        expect(maintain.maintenance).toBeCloseTo(2826.33, 1)
    })

    test('maintain with a sub-1200 maintenance returns it raw — no floor', () => {
        // F 70y · 58in · 90 lb · sedentary: kg = 40.82336, cm = 147.32,
        // BMR = 408.23362 + 920.75 − 350 − 161 = 817.98362, × 1.2 = 981.58034.
        const tiny = makeSettings({ gender: 'female', birthDate: birthDateForAge(70), height: 58, bodyWeight: 90, activityLevel: 'sedentary', goalType: 'maintain', goalWeight: 90 })
        const { maintenance, target } = calculateCalorieTarget(tiny, true)
        expect(maintenance).toBeCloseTo(981.58, 2)
        expect(target).toBe(982)
    })

    test('maintain anchors to goalWeight — bodyWeight drift changes nothing', () => {
        const drifted = calculateCalorieTarget(makeSettings({ bodyWeight: 174, goalWeight: 170 }), true)
        const atGoal = calculateCalorieTarget(makeSettings({ bodyWeight: 170, goalWeight: 170 }), true)
        expect(drifted).toEqual(atGoal)
    })
})

describe('calculateCalorieTarget lose — no adequacy floor', () => {
    // The rule these three pin: a lose target is stated exactly as the arithmetic produces it. The app
    // used to clamp the number up to 800 and say nothing; LowCalorieWarning now speaks instead, so a
    // deficit the user asked for is never quietly rewritten under them.
    //
    // Metric body chosen so maintenance is exact by hand: F 30y · 160cm · 70kg · sedentary,
    // BMR = 700 + 1000 − 150 − 161 = 1389, × 1.2 = 1666.8 — no imperial conversions involved.
    const metricF = { gender: 'female' as const, birthDate: birthDateForAge(30), height: 160, bodyWeight: 70, activityLevel: 'sedentary' as const, unitSystem: 'metric' as const, goalType: 'lose' as const, goalWeight: 60 }

    test('metric maintenance skips the imperial conversions', () => {
        const { maintenance } = calculateCalorieTarget(makeSettings({ ...metricF, goalPace: 1 }), false)
        expect(maintenance).toBeCloseTo(1666.8, 6)
    })

    // Three paces stepping across where the old 800 clamp sat: the targets march 801 → 800 → 799
    // without catching on anything. Under the old rule the third read 800.
    test.each([
        [1.7316, 801],
        [1.7336, 800],
        [1.7356, 799],
    ])('pace %s states its raw target %s — the old 800 line is not there', (goalPace, expected) => {
        // adjustment = goalPace × 500, subtracted from 1666.8.
        expect(calculateCalorieTarget(makeSettings({ ...metricF, goalPace }), false).target).toBe(expected)
    })

    test('a deep deficit is stated in full, however far below the minimums it lands', () => {
        // F 30y · 64in · 150 lb · sedentary: kg = 68.0389, cm = 162.56,
        // BMR = 680.389 + 1016 − 150 − 161 = 1385.389, × 1.2 = 1662.4668; pace 3 → −1500 → 162.47.
        const f150 = makeSettings({ gender: 'female', birthDate: birthDateForAge(30), height: 64, bodyWeight: 150, activityLevel: 'sedentary', goalType: 'lose', goalWeight: 130, goalPace: 3 })
        expect(calculateCalorieTarget(f150, true).target).toBe(162)
    })
})

describe('calculateCalorieTarget gain and degenerate fences', () => {
    test('gain never floors — a small body keeps a sub-1200 surplus target', () => {
        // Maintenance 981.58034 (the 90 lb body above) + 0.1 lb/wk surplus (50 kcal) = 1031.58 → 1032.
        const tinyGain = makeSettings({ gender: 'female', birthDate: birthDateForAge(70), height: 58, bodyWeight: 90, activityLevel: 'sedentary', goalType: 'gain', goalWeight: 100, goalPace: 0.1 })
        expect(calculateCalorieTarget(tinyGain, true).target).toBe(1032)
    })

    test('validator-legal degenerate bodies never produce a zero or negative target', () => {
        // F 90y · 24in · 50 lb · sedentary: kg = 22.67969, cm = 60.96,
        // BMR = 226.79691 + 381 − 450 − 161 = −3.20309, × 1.2 = −3.84371 — negative maintenance.
        const degenerate = { gender: 'female' as const, birthDate: birthDateForAge(90), height: 24, bodyWeight: 50, activityLevel: 'sedentary' as const }
        const maintain = calculateCalorieTarget(makeSettings({ ...degenerate, goalType: 'maintain', goalWeight: 50 }), true)
        expect(maintain.target).toBe(1)
        // Lose has no floor above it any more, so the 1 kcal fence is the only thing between a −3.84
        // maintenance minus a 50 kcal deficit and a zero GraphStats would divide by.
        const lose = calculateCalorieTarget(makeSettings({ ...degenerate, goalType: 'lose', goalWeight: 50, goalPace: 0.1 }), true)
        expect(lose.target).toBe(1)
    })
})
