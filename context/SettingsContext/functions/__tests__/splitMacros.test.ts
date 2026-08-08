import { splitMacros } from '../macroCalculation'

// Expected grams hand-computed from the goal presets (lose 30/30/40, maintain 25/30/45,
// gain 25/25/50 — protein & carbs at 4 kcal/g, fat at 9), never by running the function.

describe('splitMacros presets', () => {
    test('lose split at 800 kcal: 60g P / 27g F / 80g C', () => {
        // 240 kcal P / 4 = 60; 240 kcal F / 9 = 26.67 rounds up; 320 kcal C / 4 = 80.
        expect(splitMacros('lose', 800)).toEqual({ proteinGrams: 60, fatGrams: 27, carbGrams: 80 })
    })

    test('maintain split at 2000: 125g P / 67g F / 225g C', () => {
        // 500 kcal P / 4 = 125; 600 kcal F / 9 = 66.67 rounds up; 900 kcal C / 4 = 225.
        expect(splitMacros('maintain', 2000)).toEqual({ proteinGrams: 125, fatGrams: 67, carbGrams: 225 })
    })

    test('gain split at 3000: 188g P / 83g F / 375g C', () => {
        // 750 kcal P / 4 = 187.5, the one exact half in the table — Math.round takes it up.
        expect(splitMacros('gain', 3000)).toEqual({ proteinGrams: 188, fatGrams: 83, carbGrams: 375 })
    })

    test('grams floor at 1 so a degenerate calorie target cannot render a 0g macro', () => {
        // 10 kcal lose: fat computes 3 kcal / 9 = 0.33g and would round to 0 without the floor.
        expect(splitMacros('lose', 10)).toEqual({ proteinGrams: 1, fatGrams: 1, carbGrams: 1 })
    })
})
