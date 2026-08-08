import { macrosWereEdited } from '../macroCalculation'

// The rule that decides whether a plan screen commits macrosCustomized. Wrong in one direction, the user's
// typed numbers are silently discarded at the next weigh-in (withRegeneratedTargets only spares a
// customized profile); wrong in the other, a plain walk-through freezes targets that should keep tracking
// the body. Both screens compare already-rounded goals against raw formula output, so the rounding
// boundary is the case that matters most.

// calculateMacros's return shape: a target and three gram counts.
const computed = { calResult: 1688, proteinGrams: 127, carbGrams: 169, fatGrams: 56 }
const untouched = { calorieGoal: 1688, proteinGoal: 127, carbsGoal: 169, fatsGoal: 56 }

describe('macrosWereEdited with nothing touched', () => {
    test('goals matching the formula exactly are not an edit', () => {
        expect(macrosWereEdited(untouched, computed)).toBe(false)
    })
})

describe('macrosWereEdited on a changed card', () => {
    // Any one of the four is enough — the modal edits them one at a time.
    test.each([
        ['calories', { ...untouched, calorieGoal: 1800 }],
        ['protein', { ...untouched, proteinGoal: 150 }],
        ['carbs', { ...untouched, carbsGoal: 200 }],
        ['fats', { ...untouched, fatsGoal: 60 }],
    ])('a changed %s card counts as an edit', (_label, goals) => {
        expect(macrosWereEdited(goals, computed)).toBe(true)
    })

    test('a one-gram change still counts — the rule is any difference, not a meaningful one', () => {
        expect(macrosWereEdited({ ...untouched, fatsGoal: 57 }, computed)).toBe(true)
    })

    test('several cards changed at once still reads as one edited plan', () => {
        expect(macrosWereEdited({ calorieGoal: 1800, proteinGoal: 150, carbsGoal: 200, fatsGoal: 60 }, computed)).toBe(true)
    })
})

describe('macrosWereEdited against unrounded formula output', () => {
    // The screens seed their state with Math.round of these, so a fractional target must not read as an
    // edit — otherwise every walk-through would falsely freeze the user's targets.
    const fractional = { calResult: 1687.6, proteinGrams: 126.5, carbGrams: 168.7, fatGrams: 55.4 }
    const seeded = { calorieGoal: 1688, proteinGoal: 127, carbsGoal: 169, fatsGoal: 55 }

    test('goals seeded by rounding the formula are not an edit', () => {
        expect(macrosWereEdited(seeded, fractional)).toBe(false)
    })

    test('a value that rounds the other way is an edit', () => {
        // 1,687 is what the seed would have been had calResult rounded down; typing it is a real change.
        expect(macrosWereEdited({ ...seeded, calorieGoal: 1687 }, fractional)).toBe(true)
    })

    test('a .5 gram rounds up like the seed does, not down', () => {
        // Math.round(126.5) is 127, so 126 could only have been typed.
        expect(macrosWereEdited({ ...seeded, proteinGoal: 126 }, fractional)).toBe(true)
    })
})
