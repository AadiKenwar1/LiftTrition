import { calculateFatigueFactor, calculateFatiguePercentage } from '../fatigueFunctions'
import type { Exercise, ExerciseLib, Log } from '../../types'

function mockExercise(overrides: Partial<Exercise> = {}): Exercise {
    return {
        id: 'ex-1',
        userID: 'user-1',
        workoutID: 'workout-1',
        name: 'Bench Press',
        userMax: 0,
        order: 0,
        archived: false,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    }
}

function mockLog(overrides: Partial<Log> = {}): Log {
    return {
        id: 'log-1',
        userID: 'user-1',
        workoutID: 'workout-1',
        exerciseID: 'ex-1',
        date: new Date('2026-01-31'),
        time: 0,
        weight: 100,
        reps: 5,
        rpe: 7,
        createdAt: new Date('2026-01-31T12:00:00'),
        updatedAt: new Date('2026-01-31T12:00:00'),
        ...overrides,
    }
}

function mockLib(fatigueFactor: number): ExerciseLib {
    return {
        'Bench Press': {
            mainMuscle: 'Upper Chest',
            accessoryMuscles: [],
            fatigueFactor,
            equipment: 'Barbell',
            isCompound: true,
        },
    }
}

describe('fatigueFunctions', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(new Date('2026-01-31T12:00:00'))
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe('calculateFatiguePercentage', () => {
        test('uses a rolling 30-day 1RM reference per exercise name', () => {
            const exercises: Exercise[] = [mockExercise({ id: 'ex-1', name: 'Bench Press' })]
            const lib = mockLib(1.0)

            // Two sets in-window: heavy + light. The 30-day 1RM reference should be based on the heavy set.
            const heavy = mockLog({ id: 'heavy', exerciseID: 'ex-1', date: new Date('2026-01-31'), weight: 100, reps: 5, rpe: 7 })
            const light = mockLog({ id: 'light', exerciseID: 'ex-1', date: new Date('2026-01-31'), weight: 50, reps: 5, rpe: 7 })
            const logs: Log[] = [heavy, light]

            const pct = calculateFatiguePercentage(1, logs, exercises, lib, 'moderate')

            // Expected:
            // e1RM(100x5)=116.65; both sets use currentMax=116.65 due to rolling ref
            // adjusted Epley base: (w/currentMax) * (1 + reps/30)
            // scaled by (rpe/10) * fatigueFactor * frequencyMultiplier
            // percentage = total / (600*1) * 100
            const e1 = 100 * (1 + 0.0333 * 5) // 116.65
            const freq = 0.933
            const rpeScale = 7 / 10
            const repFactor = 1 + 5 / 30
            const heavyFatigue = (100 / e1) * repFactor * rpeScale * 1.0 * freq
            const lightFatigue = (50 / e1) * repFactor * rpeScale * 1.0 * freq
            const expected = ((heavyFatigue + lightFatigue) / 10) * 100

            expect(pct).toBeGreaterThan(0)
            expect(pct).toBeCloseTo(expected, 6)
        })

        test('falls back to per-set estimate1RM when the 30-day reference has no qualifying sets', () => {
            const exercises: Exercise[] = [mockExercise({ id: 'ex-1', name: 'Bench Press' })]
            const lib = mockLib(1.0)

            // This log is within fatigue window (60d) but outside rolling ref (30d).
            const oldLog = mockLog({
                id: 'old',
                exerciseID: 'ex-1',
                date: new Date('2025-12-22T00:00:00'), // 40 days before 2026-01-31
                weight: 100,
                reps: 5,
                rpe: 7,
            })
            const logs: Log[] = [oldLog]

            const pct = calculateFatiguePercentage(60, logs, exercises, lib, 'moderate')

            // With no rolling reference, currentMax falls back to this set's e1RM.
            const e1 = 100 * (1 + 0.0333 * 5)
            const expectedSetFatigue = (100 / e1) * (1 + 5 / 30) * (7 / 10) * 1.0 * 0.933
            const expected = (expectedSetFatigue / (10 * 60)) * 100

            expect(pct).toBeCloseTo(expected, 6)
        })

        test('returns 0 when there are no logs', () => {
            const exercises: Exercise[] = [mockExercise()]
            const lib = mockLib(1.0)
            expect(calculateFatiguePercentage(1, [], exercises, lib, 'moderate')).toBe(0)
        })
    })

    describe('calculateFatigueFactor', () => {
        test('returns a bounded fatigue factor', () => {
            const f1 = calculateFatigueFactor(true, 'Upper Chest', ['Triceps'], 'Barbell')
            const f2 = calculateFatigueFactor(false, 'Forearms', [], 'Machine')

            expect(f1).toBeGreaterThanOrEqual(0.5)
            expect(f1).toBeLessThanOrEqual(1.1)
            expect(f2).toBeGreaterThanOrEqual(0.5)
            expect(f2).toBeLessThanOrEqual(1.1)
        })
    })
})

