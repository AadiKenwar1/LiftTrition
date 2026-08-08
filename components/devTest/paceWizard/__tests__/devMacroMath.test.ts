import { calculateCalorieTarget, LOW_CALORIE_THRESHOLDS } from '@/context/SettingsContext/functions/macroCalculation'
import type { Settings } from '@/context/SettingsContext/types'
import { basisWeightKg, devCalorieTarget, devFloorCalories, devMaxPace, devSplitMacros, DEV_PACE_CEILING } from '../devMacroMath'

// devTest carries no testing bar, but PaceFlowLauncher's persona rows state a hand-computed burn and cap as
// the manual PASS criteria for the walk-through — numbers that go quietly wrong the moment a constant moves.
// This pins those printed strings to the functions the wizard actually calls. Every expectation is worked
// out from Mifflin-St Jeor and the floor arithmetic independently of the code, never read back off a run.

function birthDateForAge(age: number): Date {
    const d = new Date()
    d.setDate(15)
    d.setMonth(d.getMonth() - 6)
    d.setFullYear(d.getFullYear() - age)
    return d
}

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'gymrat'] as const

function makeSettings(o: Partial<Settings> = {}): Settings {
    return {
        onboardingComplete: true,
        onboardingCompletedAt: undefined,
        birthDate: birthDateForAge(30),
        gender: 'male',
        height: 70,
        bodyWeight: 174,
        activityLevel: 'moderate',
        unitSystem: 'imperial',
        goalType: 'lose',
        goalWeight: 154,
        goalPace: 1,
        calorieGoal: 0,
        proteinGoal: 0,
        carbsGoal: 0,
        fatsGoal: 0,
        macrosCustomized: false,
        goalOvershootAcknowledged: false,
        ...o,
    }
}

describe('the burn and cap PaceFlowLauncher prints per persona', () => {
    // cap = floor₀.₁((maintenance − (protein·4 + fat·9 + 200)) / 500) clamped to [0.1, 2.0], protein and
    // fat at the cut rates (1.1 / 0.30 g per lb) on the BMI-30-capped basis. No launcher body reaches the
    // BMI ceiling, so every basis here is the scale weight.
    const personas = [
        { key: 'activeM150', gender: 'male' as const, age: 18, height: 69, bodyWeight: 150, activityLevel: 'active' as const, burn: 2917, cap: 2.0 },
        { key: 'sedentaryF140', gender: 'female' as const, age: 18, height: 64, bodyWeight: 140, activityLevel: 'sedentary' as const, burn: 1680, cap: 0.9 },
        { key: 'moderateM170', gender: 'male' as const, age: 20, height: 71, bodyWeight: 170, activityLevel: 'moderate' as const, burn: 2795, cap: 2.0 },
        { key: 'sedentaryM190', gender: 'male' as const, age: 22, height: 71, bodyWeight: 190, activityLevel: 'sedentary' as const, burn: 2261, cap: 1.4 },
        { key: 'gymRatM230', gender: 'male' as const, age: 25, height: 74, bodyWeight: 230, activityLevel: 'gymrat' as const, burn: 3986, cap: 2.0 },
        { key: 'lightF120', gender: 'female' as const, age: 25, height: 62, bodyWeight: 120, activityLevel: 'light' as const, burn: 1709, cap: 1.3 },
        { key: 'lightF170', gender: 'female' as const, age: 30, height: 66, bodyWeight: 170, activityLevel: 'light' as const, burn: 2073, cap: 1.3 },
        { key: 'sedentaryF150', gender: 'female' as const, age: 30, height: 64, bodyWeight: 150, activityLevel: 'sedentary' as const, burn: 1662, cap: 0.7 },
        { key: 'moderateM200', gender: 'male' as const, age: 40, height: 70, bodyWeight: 200, activityLevel: 'moderate' as const, burn: 2826, cap: 2.0 },
        { key: 'sedentaryM200', gender: 'male' as const, age: 40, height: 70, bodyWeight: 200, activityLevel: 'sedentary' as const, burn: 2188, cap: 1.1 },
        { key: 'sedentaryF115', gender: 'female' as const, age: 45, height: 60, bodyWeight: 115, activityLevel: 'sedentary' as const, burn: 1306, cap: 0.5 },
        { key: 'sedentaryM170', gender: 'male' as const, age: 55, height: 68, bodyWeight: 170, activityLevel: 'sedentary' as const, burn: 1897, cap: 0.9 },
        { key: 'sedentaryF90', gender: 'female' as const, age: 70, height: 58, bodyWeight: 90, activityLevel: 'sedentary' as const, burn: 982, cap: 0.2 },
    ]

    test.each(personas)('$key burns ≈$burn kcal and caps at $cap lb/wk', ({ gender, age, height, bodyWeight, activityLevel, burn, cap }) => {
        const s = makeSettings({ gender, birthDate: birthDateForAge(age), height, bodyWeight, activityLevel, goalType: 'lose', goalWeight: bodyWeight - 20, goalPace: 0 })
        expect(Math.round(devCalorieTarget(s, true).maintenance)).toBe(burn)
        expect(devMaxPace(s)).toBe(cap)
    })

    test('a cut seeded at the ceiling still lands every persona at or above 50 g of carbs', () => {
        // The cap's whole contract: the launcher's Cut chip seeds 2.0, the clamp pulls it to each body's
        // cap, and the carbs the split hands back can never dip under the buffer the cap priced in.
        for (const { gender, age, height, bodyWeight, activityLevel } of personas) {
            const s = makeSettings({ gender, birthDate: birthDateForAge(age), height, bodyWeight, activityLevel, goalType: 'lose', goalWeight: bodyWeight - 20, goalPace: 2 })
            const { target } = devCalorieTarget(s, true)
            expect(devSplitMacros('lose', target, basisWeightKg(s, true)).carbGrams).toBeGreaterThanOrEqual(MIN_CARBS_G)
        }
    })

    test('the smallest body: cap 0.2 gives 882 kcal and a 99/27/61 split', () => {
        // 90 lb, 4'10", 70, female, sedentary — burn 981.6. Floor: 99 g protein (396) + 27 g fat (243) +
        // 200 = 839; spare 142.6 → 0.2. Target 981.6 − 100 = 882; carbs (882 − 396 − 243) / 4 = 60.75 → 61.
        const s = makeSettings({ gender: 'female', birthDate: birthDateForAge(70), height: 58, bodyWeight: 90, activityLevel: 'sedentary', goalType: 'lose', goalWeight: 80, goalPace: 2 })
        const { target } = devCalorieTarget(s, true)
        expect(target).toBe(882)
        expect(devSplitMacros('lose', target, basisWeightKg(s, true))).toEqual({ proteinGrams: 99, fatGrams: 27, carbGrams: 61 })
    })
})

describe('what still matches production', () => {
    // The factor maps agree, so the burn — the number every screen anchors on — must equal the shipped
    // maintenanceCalories exactly, and a maintain target (burn, rounded, 1 kcal fence) must too. The lose
    // and gain targets diverge on purpose: the dev rule clamps pace to the nutrition-floor cap and the
    // 2.0 ceiling where production clamps the target at 800. This is what catches a factor edited on one
    // side only without freezing the prototype to the shipped arithmetic.
    test.each(ACTIVITY_LEVELS)('%s burn and maintain target match the shipped calculation', (activityLevel) => {
        for (const goalType of ['lose', 'maintain', 'gain'] as const) {
            const s = makeSettings({ activityLevel, goalType, goalPace: 1 })
            expect(devCalorieTarget(s, true).maintenance).toBe(calculateCalorieTarget(s, true).maintenance)
        }
        const m = makeSettings({ activityLevel, goalType: 'maintain', goalPace: 0, goalWeight: 174 })
        expect(devCalorieTarget(m, true)).toEqual(calculateCalorieTarget(m, true))
    })
})

describe('a maintenance below the recommended daily minimum', () => {
    // 92 lb, 4'11", 68, female, sedentary — the smallest body on the launcher's radar. Mifflin-St Jeor:
    // 417.3 + 936.6 − 340 − 161 = 852.9 BMR, × 1.2 = 1,023.5. Hand-worked, never read off a run.
    const tiny = makeSettings({ gender: 'female', birthDate: birthDateForAge(68), height: 59, bodyWeight: 92, goalWeight: 92, activityLevel: 'sedentary', goalType: 'maintain', goalPace: 0 })

    test('the true burn is what gets stated — no minimum is imposed on top of it', () => {
        const { maintenance, target } = devCalorieTarget(tiny, true)
        expect(Math.round(maintenance)).toBe(1024)
        expect(target).toBe(1024)
    })

    test('the stated target falls under the line the low-calorie warning fires at', () => {
        // The pairing that replaced the adequacy floor: lifting this body to 1,200 landed it on the one
        // number CalorieFeedback's strict comparison does not fire at, so the app both prescribed a
        // surplus to a maintain user and went silent about the adequacy problem the floor was for.
        expect(devCalorieTarget(tiny, true).target).toBeLessThan(LOW_CALORIE_THRESHOLDS.female)
    })

    test('the pace cap binds before the 800 line ever could', () => {
        // Cut floor for 92 lb: 101 g protein (404) + 28 g fat (252) + 200 = 856; spare 167.5 → cap 0.3.
        // A requested 0.5 clamps to 0.3, so the target is 1,023.5 − 150 = 874 — above 856, above 800,
        // and the 800 fence never spoke.
        expect(devMaxPace({ ...tiny, goalType: 'lose' })).toBe(0.3)
        expect(devCalorieTarget({ ...tiny, goalType: 'lose', goalPace: 0.5 }, true).target).toBe(874)
    })

    test('gain keeps its 1 kcal fence and the interface ceiling', () => {
        expect(devCalorieTarget({ ...tiny, goalType: 'gain', goalPace: 0.1 }, true).target).toBe(1074)
        // A pace typed past the ceiling adds exactly the ceiling's surplus: 1,023.5 + 1,000 = 2,024.
        expect(devCalorieTarget({ ...tiny, goalType: 'gain', goalPace: 5 }, true).target).toBe(2024)
        expect(devMaxPace({ ...tiny, goalType: 'gain' })).toBe(DEV_PACE_CEILING)
    })

    test('maintain keeps a 1 kcal fence of its own — a degenerate body cannot state a zero', () => {
        // Mifflin-St Jeor is unbounded below: a zeroed height and weight put the raw burn at
        // (0 + 0 − 500 − 161) × 1.2 = −793, and GraphStats divides by the goal.
        const degenerate = makeSettings({ gender: 'female', birthDate: birthDateForAge(100), height: 0, bodyWeight: 0, goalWeight: 0, activityLevel: 'sedentary', goalType: 'maintain', goalPace: 0 })
        expect(devCalorieTarget(degenerate, true).target).toBe(1)
    })

    test('a normal body is untouched either way', () => {
        // 174 lb, 5'10", 30, male, moderate — BMR 1,755.5 × 1.55 = 2,721. goalWeight matches bodyWeight
        // because maintenanceCalories anchors a maintain goal to goalWeight, and a real maintain user's
        // goalWeight is the weight being maintained.
        expect(devCalorieTarget(makeSettings({ goalType: 'maintain', goalPace: 0, goalWeight: 174 }), true).target).toBe(2721)
    })
})

describe('basis weight — the scale weight ceilinged at BMI 30', () => {
    test('cut and bulk read the scale, maintain defends the goal weight', () => {
        expect(basisWeightKg(makeSettings({ goalType: 'lose', bodyWeight: 200, goalWeight: 180 }), true)).toBeCloseTo(200 / 2.20462, 6)
        expect(basisWeightKg(makeSettings({ goalType: 'gain', bodyWeight: 200, goalWeight: 220 }), true)).toBeCloseTo(200 / 2.20462, 6)
        expect(basisWeightKg(makeSettings({ goalType: 'maintain', bodyWeight: 200, goalWeight: 180 }), true)).toBeCloseTo(180 / 2.20462, 6)
    })

    test('a legacy maintain row with no goal weight falls back to the scale weight', () => {
        expect(basisWeightKg(makeSettings({ goalType: 'maintain', bodyWeight: 200, goalWeight: 0 }), true)).toBeCloseTo(200 / 2.20462, 6)
    })

    test('past the ceiling the height speaks, not the scale', () => {
        // BMI 30 at 5'10" is 30 × 1.778² kg = 94.84 kg = 209.1 lb. 310 lb is ceilinged there; 200 lb
        // passes untouched — min() keeps the rule continuous, no cliff at the BMI-30 line.
        expect(basisWeightKg(makeSettings({ goalType: 'lose', bodyWeight: 310, goalWeight: 250 }), true)).toBeCloseTo(30 * 1.778 * 1.778, 6)
        expect(basisWeightKg(makeSettings({ goalType: 'lose', bodyWeight: 200, goalWeight: 180 }), true)).toBeCloseTo(200 / 2.20462, 6)
    })

    test('a ceilinged body is prescribed for the frame, not the fat mass', () => {
        // Basis 209.1 lb cutting: 1.1 → 230 g protein, 0.30 → 63 g fat — not the 341 g raw bodyweight
        // arithmetic would demand of 310 lb.
        const basis = basisWeightKg(makeSettings({ goalType: 'lose', bodyWeight: 310, goalWeight: 250 }), true)
        const m = devSplitMacros('lose', 2200, basis)
        expect(m.proteinGrams).toBe(230)
        expect(m.fatGrams).toBe(63)
    })
})

describe('the priority split — protein, fat, carbs as the remainder', () => {
    test('a round pound weight lands on the round gram figures', () => {
        // 200 lb of basis: cutting 1.1/0.30 → 220 g and 60 g; maintaining 0.9/0.35 → 180 g and 70 g;
        // bulking 0.9/0.40 → 180 g and 80 g.
        expect(devSplitMacros('lose', 3000, 200 / 2.20462).proteinGrams).toBe(220)
        expect(devSplitMacros('lose', 3000, 200 / 2.20462).fatGrams).toBe(60)
        expect(devSplitMacros('maintain', 3000, 200 / 2.20462).proteinGrams).toBe(180)
        expect(devSplitMacros('maintain', 3000, 200 / 2.20462).fatGrams).toBe(70)
        expect(devSplitMacros('gain', 3000, 200 / 2.20462).fatGrams).toBe(80)
    })

    test('a prescription landing on an exact half gram rounds up, not whichever way the float fell', () => {
        // 195 lb × 0.9 = 175.5 and 145 lb × 0.9 = 130.5. The pound weight reaches the split as kilograms,
        // so the conversion lands a hair either side of the exact half — untreated, one tie rounds down
        // and the other up. Both must land the same way.
        expect(devSplitMacros('maintain', 3000, 195 / 2.20462).proteinGrams).toBe(176)
        expect(devSplitMacros('maintain', 3000, 145 / 2.20462).proteinGrams).toBe(131)
    })

    test('deep cut — carbs take what is left, nothing is repaired', () => {
        // 68 kg = 149.9 lb cutting: protein 165 g (660), fat 45 g (405); 1,300 leaves 235 → 59 g carbs.
        expect(devSplitMacros('lose', 1300, 68)).toEqual({ proteinGrams: 165, fatGrams: 45, carbGrams: 59 })
    })

    test('maintenance — same shape, maintain rates', () => {
        // 149.9 lb maintaining: protein 135 g (540), fat 53 g (477); 2,100 leaves 1,083 → 271 g carbs.
        expect(devSplitMacros('maintain', 2100, 68)).toEqual({ proteinGrams: 135, fatGrams: 53, carbGrams: 271 })
    })

    test('protein holds steady as calories fall — the coupling the percentage split had', () => {
        expect(devSplitMacros('lose', 2000, 68).proteinGrams).toBe(devSplitMacros('lose', 1300, 68).proteinGrams)
    })

    test('grams reconcile to the calorie target within integer-rounding slack', () => {
        for (const cals of [1300, 1800, 2400, 3200]) {
            for (const goalType of ['lose', 'maintain', 'gain'] as const) {
                const m = devSplitMacros(goalType, cals, 68)
                expect(Math.abs(m.proteinGrams * 4 + m.fatGrams * 9 + m.carbGrams * 4 - cals)).toBeLessThanOrEqual(8)
            }
        }
    })

    test('metric and imperial give the same grams for the same body', () => {
        // 154.324 lb and 70 kg are the same mass; 70 in and 177.8 cm the same height. The grams must be
        // identical on both sides — the conversion happens once, unrounded, inside basisWeightKg.
        const imp = basisWeightKg(makeSettings({ goalType: 'lose', bodyWeight: 154.324, goalWeight: 140, unitSystem: 'imperial', height: 70 }), true)
        const met = basisWeightKg(makeSettings({ goalType: 'lose', bodyWeight: 70, goalWeight: 63.5, unitSystem: 'metric', height: 177.8 }), false)
        expect(devSplitMacros('lose', 2000, imp)).toEqual(devSplitMacros('lose', 2000, met))
    })
})

describe('the nutrition floor and the cap it prices', () => {
    test('the floor is protein plus fat plus the 50 g carb buffer', () => {
        // 68 kg cutting: 165 × 4 + 45 × 9 + 200 = 1,265. 200 lb of basis cutting: 220 × 4 + 60 × 9 +
        // 200 = 1,620 — the moderateM200 persona's floor.
        expect(devFloorCalories('lose', 68)).toBe(1265)
        expect(devFloorCalories('lose', 200 / 2.20462)).toBe(1620)
    })

    test('a target at the cap clears the floor; one step faster would not', () => {
        // sedentaryM200: burn 2,188.3, floor 1,620 → spare 568.3 → cap 1.1. At 1.1 the target is 1,638
        // (≥ 1,620); at 1.2 it would be 1,588 — under the floor, which is why 1.2 does not exist.
        const s = makeSettings({ gender: 'male', birthDate: birthDateForAge(40), height: 70, bodyWeight: 200, activityLevel: 'sedentary', goalType: 'lose', goalWeight: 180, goalPace: 2 })
        expect(devMaxPace(s)).toBe(1.1)
        const { target } = devCalorieTarget(s, true)
        expect(target).toBe(1638)
        expect(target).toBeGreaterThanOrEqual(devFloorCalories('lose', basisWeightKg(s, true)))
    })
})
