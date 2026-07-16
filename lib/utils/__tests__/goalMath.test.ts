import { weeksToGoal } from '../goalMath'

describe('weeksToGoal', () => {
    test('maintain is a fixed 12-week horizon', () => {
        expect(weeksToGoal('maintain', 174, 174, 0)).toBe(12)
    })
    test('lose/gain divide distance by pace, rounded, min 1 week', () => {
        expect(weeksToGoal('lose', 180, 170, 1)).toBe(10)
        expect(weeksToGoal('gain', 170, 180.4, 1)).toBe(10)
        expect(weeksToGoal('lose', 170.2, 170, 1)).toBe(1)
    })
    test('pace 0 falls back to 1 lb/kg per week instead of dividing by zero', () => {
        expect(weeksToGoal('lose', 180, 170, 0)).toBe(10)
    })
})
