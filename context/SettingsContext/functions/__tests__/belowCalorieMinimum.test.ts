import { belowCalorieMinimum, LOW_CALORIE_THRESHOLDS } from '../macroCalculation'

// The app's one adequacy rule, and the only thing standing between a user and an unremarked crash diet
// now that nothing clamps. The boundary matters in both directions: one kcal either side of the line
// decides whether the warning card mounts, and the two genders must not borrow each other's number.

describe('belowCalorieMinimum boundary', () => {
    // [gender, calories, expected] — walked one kcal either side of each gender's own threshold.
    test.each([
        ['male' as const, 1499, true],
        ['male' as const, 1500, false],
        ['male' as const, 1501, false],
        ['female' as const, 1199, true],
        ['female' as const, 1200, false],
        ['female' as const, 1201, false],
    ])('%s at %s kcal → below = %s', (gender, calories, expected) => {
        expect(belowCalorieMinimum(calories, gender)).toBe(expected)
    })

    test('landing exactly on the line is not below it', () => {
        // Strictly less-than, so a target that rounds onto the threshold reads as fine rather than
        // warning at the very number the copy recommends.
        expect(belowCalorieMinimum(LOW_CALORIE_THRESHOLDS.male, 'male')).toBe(false)
        expect(belowCalorieMinimum(LOW_CALORIE_THRESHOLDS.female, 'female')).toBe(false)
    })
})

describe('belowCalorieMinimum reads the right threshold per gender', () => {
    test('the 300 kcal band between the two lines splits the genders', () => {
        // 1,300 is under the male minimum and over the female one — the single case that proves the
        // lookup is by gender and not a shared constant.
        expect(belowCalorieMinimum(1300, 'male')).toBe(true)
        expect(belowCalorieMinimum(1300, 'female')).toBe(false)
    })

    test('the male line sits above the female one', () => {
        expect(LOW_CALORIE_THRESHOLDS.male).toBeGreaterThan(LOW_CALORIE_THRESHOLDS.female)
    })
})

describe('belowCalorieMinimum degenerate targets', () => {
    test('the 1 kcal fence a degenerate body produces still warns', () => {
        // calculateCalorieTarget floors at 1 rather than 0; that number must not read as acceptable.
        expect(belowCalorieMinimum(1, 'male')).toBe(true)
        expect(belowCalorieMinimum(1, 'female')).toBe(true)
    })

    test('zero warns rather than passing through as falsy', () => {
        expect(belowCalorieMinimum(0, 'female')).toBe(true)
    })
})
