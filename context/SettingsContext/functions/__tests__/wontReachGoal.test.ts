import { derivedPace, wontReachGoal } from '../macroCalculation'

// The rule behind the "you won't reach your goal" card: a target sitting the wrong side of maintenance
// leaves no deficit to lose on or surplus to gain on. It has to agree with the projection exactly — the
// card is the explanation for the "—" a dateless projection renders — so the boundary is walked one kcal
// either side on both goals, and the two are checked against each other rather than trusted to match.

describe('wontReachGoal on a cut', () => {
    // [calories, expected] — maintenance 2,000, walked across the line.
    test.each([
        [1999, false],
        [2000, true],
        [2001, true],
        [2500, true],
    ])('eating %s against a 2,000 maintenance → warns = %s', (calories, expected) => {
        expect(wontReachGoal(calories, 2000, 'lose', 'imperial')).toBe(expected)
    })

    test('eating exactly at maintenance warns — a zero deficit reaches nothing', () => {
        expect(wontReachGoal(2000, 2000, 'lose', 'imperial')).toBe(true)
    })

    test('a deficit of a single kcal does not warn', () => {
        // The card speaks to direction, not to how long the plan takes; one kcal is a real deficit and
        // the projection quotes it (as an enormous week count) rather than rendering "—".
        expect(wontReachGoal(1999, 2000, 'lose', 'imperial')).toBe(false)
    })
})

describe('wontReachGoal on a bulk', () => {
    // The mirror: a surplus is needed, so the warning fires at or below maintenance.
    test.each([
        [2001, false],
        [2000, true],
        [1999, true],
        [1500, true],
    ])('eating %s against a 2,000 maintenance → warns = %s', (calories, expected) => {
        expect(wontReachGoal(calories, 2000, 'gain', 'imperial')).toBe(expected)
    })
})

describe('wontReachGoal on maintain', () => {
    test('maintain never warns — eating at maintenance is the goal', () => {
        // The whole point of the goal, so neither side of the line is wrong for it.
        expect(wontReachGoal(2000, 2000, 'maintain', 'imperial')).toBe(false)
        expect(wontReachGoal(1200, 2000, 'maintain', 'imperial')).toBe(false)
        expect(wontReachGoal(3000, 2000, 'maintain', 'imperial')).toBe(false)
    })
})

describe('wontReachGoal agrees with the projection', () => {
    // The card must appear exactly when the projection has no date to show, or one of them is lying.
    // Fractional maintenance because a real Mifflin-St Jeor number is never a whole kcal.
    const maintenance = 2188.12298

    test.each([
        ['lose' as const, 1688],
        ['lose' as const, 2188],
        ['lose' as const, 2189],
        ['lose' as const, 2500],
        ['gain' as const, 2688],
        ['gain' as const, 2189],
        ['gain' as const, 2188],
        ['gain' as const, 1500],
    ])('%s at %s kcal: warning fires exactly when the derived pace is zero', (goalType, calories) => {
        expect(wontReachGoal(calories, maintenance, goalType, 'imperial')).toBe(derivedPace(maintenance, calories, goalType) === 0)
    })

    test('a target one kcal under a fractional maintenance still counts as progress', () => {
        // 2,188 sits 0.12298 under maintenance: a real, tiny deficit. Rounding the comparison would
        // wrongly call this a wrong-direction plan and contradict the date the projection quotes.
        expect(wontReachGoal(2188, maintenance, 'lose', 'imperial')).toBe(false)
        expect(derivedPace(maintenance, 2188, 'lose')).toBeGreaterThan(0)
    })
})

describe('wontReachGoal on a metric plan', () => {
    // Mirrors projectGoal.test.ts's metric fixture (maintenance 2,181 from a 178cm/90kg sedentary male):
    // the guard has to key off the same post-lbsToKg display pace projectGoal divides weeks by, not the
    // raw lb one, or the card disagrees with the "—" the next screen renders.
    const maintenance = 2181

    test('a real but sub-0.1kg pace that rounds to 0 still warns, matching the "—" projectGoal renders', () => {
        // 2,171 kcal → derived (2181 − 2171)/500 = 0.02 lb/week: honestly positive in lb, but
        // lbsToKg(0.02) rounds to 0.0 kg/week — the exact case an unconverted check misses.
        expect(derivedPace(maintenance, 2171, 'lose')).toBeGreaterThan(0)
        expect(wontReachGoal(2171, maintenance, 'lose', 'metric')).toBe(true)
    })

    test('the same target does not warn in imperial — the raw lb pace is real progress there', () => {
        expect(wontReachGoal(2171, maintenance, 'lose', 'imperial')).toBe(false)
    })

    test('a pace that survives the kg rounding does not warn', () => {
        // 2,171 − 500 = 1,671 kcal → derived 1.02 lb/week → lbsToKg rounds to 0.5 kg/week, well above 0.
        expect(wontReachGoal(1671, maintenance, 'lose', 'metric')).toBe(false)
    })
})
