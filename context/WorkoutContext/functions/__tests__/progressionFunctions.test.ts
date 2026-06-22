import { getDailyGoal, isGoalHitToday, isGoalMet } from '../progressionFunctions'
import type { Log } from '../../types'

function mockLog(overrides: Partial<Log> = {}): Log {
    return {
        id: 'log-1',
        userID: 'user-1',
        workoutID: 'workout-1',
        exerciseID: 'ex-1',
        date: new Date('2026-03-01'),
        time: 1000,
        weight: 185,
        reps: 8,
        rpe: 0,
        createdAt: new Date('2026-03-01'),
        updatedAt: new Date('2026-03-01'),
        ...overrides,
    }
}

describe('getDailyGoal', () => {
    test('returns null when there is no prior session', () => {
        const logs = [mockLog({ date: new Date('2026-03-05') })]
        expect(getDailyGoal(logs, 'ex-1', new Date('2026-03-05'), { weightUnit: 'lbs', isCompound: true })).toBeNull()
    })

    test('suggests +1 rep from last session best set', () => {
        const logs = [
            mockLog({ id: '1', date: new Date('2026-03-01'), weight: 185, reps: 8, time: 1000 }),
            mockLog({ id: '2', date: new Date('2026-03-01'), weight: 185, reps: 6, time: 2000 }),
        ]
        expect(getDailyGoal(logs, 'ex-1', new Date('2026-03-05'), { weightUnit: 'lbs', isCompound: true })).toEqual({
            weight: 185,
            reps: 9,
        })
    })

    test('uses heaviest weight as anchor when reps differ', () => {
        const logs = [
            mockLog({ id: '1', date: new Date('2026-03-01'), weight: 185, reps: 10, time: 1000 }),
            mockLog({ id: '2', date: new Date('2026-03-01'), weight: 200, reps: 5, time: 2000 }),
        ]
        expect(getDailyGoal(logs, 'ex-1', new Date('2026-03-05'), { weightUnit: 'lbs', isCompound: true })).toEqual({
            weight: 200,
            reps: 6,
        })
    })

    test('bumps compound weight at rep cap', () => {
        const logs = [mockLog({ date: new Date('2026-03-01'), weight: 225, reps: 12 })]
        expect(getDailyGoal(logs, 'ex-1', new Date('2026-03-05'), { weightUnit: 'lbs', isCompound: true })).toEqual({
            weight: 230,
            reps: 8,
        })
    })

    test('bumps isolation weight by 2.5 lbs at rep cap', () => {
        const logs = [mockLog({ date: new Date('2026-03-01'), weight: 15, reps: 12 })]
        expect(getDailyGoal(logs, 'ex-1', new Date('2026-03-05'), { weightUnit: 'lbs', isCompound: false })).toEqual({
            weight: 17.5,
            reps: 8,
        })
    })

    test('uses metric increments', () => {
        const logs = [mockLog({ date: new Date('2026-03-01'), weight: 100, reps: 12 })]
        expect(getDailyGoal(logs, 'ex-1', new Date('2026-03-05'), { weightUnit: 'kg', isCompound: true })).toEqual({
            weight: 102.5,
            reps: 8,
        })
    })

    test('ignores logs on selected date when computing goal', () => {
        const logs = [
            mockLog({ id: '1', date: new Date('2026-03-01'), weight: 185, reps: 8 }),
            mockLog({ id: '2', date: new Date('2026-03-05'), weight: 185, reps: 9, time: 2000 }),
        ]
        expect(getDailyGoal(logs, 'ex-1', new Date('2026-03-05'), { weightUnit: 'lbs', isCompound: true })).toEqual({
            weight: 185,
            reps: 9,
        })
    })
})

describe('isGoalMet', () => {
    const goal = { weight: 185, reps: 9 }

    test('returns true when log meets goal exactly', () => {
        expect(isGoalMet(mockLog({ weight: 185, reps: 9 }), goal)).toBe(true)
    })

    test('returns true when log beats goal', () => {
        expect(isGoalMet(mockLog({ weight: 185, reps: 10 }), goal)).toBe(true)
    })

    test('returns false when reps are below goal', () => {
        expect(isGoalMet(mockLog({ weight: 185, reps: 8 }), goal)).toBe(false)
    })
})

describe('isGoalHitToday', () => {
    const goal = { weight: 185, reps: 9 }

    test('returns true when a log on selected date meets the goal', () => {
        const logs = [mockLog({ date: new Date('2026-03-05'), weight: 185, reps: 9 })]
        expect(isGoalHitToday(logs, 'ex-1', new Date('2026-03-05'), goal)).toBe(true)
    })

    test('returns false when logs on selected date miss the goal', () => {
        const logs = [mockLog({ date: new Date('2026-03-05'), weight: 185, reps: 8 })]
        expect(isGoalHitToday(logs, 'ex-1', new Date('2026-03-05'), goal)).toBe(false)
    })
})
