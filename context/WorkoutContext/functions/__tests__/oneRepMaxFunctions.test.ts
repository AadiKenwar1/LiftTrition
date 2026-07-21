import { estimate1RM, oneRMMap } from '../oneRepMaxFunctions'
import type { Exercise, Log } from '../../types'

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
        date: new Date(),
        time: Date.now(),
        weight: 100,
        reps: 5,
        rpe: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    }
}

describe('estimate1RM', () => {
    describe('invalid inputs', () => {
        test('returns 0 for zero weight', () => {
            expect(estimate1RM(0, 5)).toBe(0)
        })

        test('returns 0 for zero reps', () => {
            expect(estimate1RM(100, 0)).toBe(0)
        })

        test('returns 0 for negative weight', () => {
            expect(estimate1RM(-100, 5)).toBe(0)
        })

        test('returns 0 for negative reps', () => {
            expect(estimate1RM(100, -1)).toBe(0)
        })
    })

    describe('reps === 1 (true single)', () => {
        test('returns the weight itself — no Epley multiplier', () => {
            expect(estimate1RM(225, 1)).toBe(225)
        })

        test('returns the weight itself for any load', () => {
            expect(estimate1RM(100, 1)).toBe(100)
            expect(estimate1RM(315, 1)).toBe(315)
        })
    })

    describe('multi-rep Epley formula', () => {
        test('100 × 5 → ~116.65', () => {
            expect(estimate1RM(100, 5)).toBeCloseTo(116.65, 1)
        })

        test('100 × 10 → ~133.3', () => {
            expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1)
        })

        test('e1RM is always greater than the bar weight for reps > 1', () => {
            expect(estimate1RM(100, 2)).toBeGreaterThan(100)
            expect(estimate1RM(100, 5)).toBeGreaterThan(100)
            expect(estimate1RM(100, 10)).toBeGreaterThan(100)
        })

        test('higher reps produce higher e1RM for the same weight', () => {
            expect(estimate1RM(100, 10)).toBeGreaterThan(estimate1RM(100, 5))
        })
    })
})

describe('oneRMMap', () => {
    test('returns empty map when no logs', () => {
        const result = oneRMMap([mockExercise()], [], 30)
        expect(result.size).toBe(0)
    })

    test('maps exercise name to its max e1RM within the window', () => {
        const today = new Date()
        const log = mockLog({ weight: 100, reps: 5, date: today })
        const result = oneRMMap([mockExercise()], [log], 30)
        expect(result.get('Bench Press')).toBeCloseTo(116.65, 1)
    })

    test('keeps the highest e1RM when multiple logs exist', () => {
        const today = new Date()
        const light = mockLog({ id: 'l1', weight: 80, reps: 5, date: today })
        const heavy = mockLog({ id: 'l2', weight: 100, reps: 5, date: today })
        const result = oneRMMap([mockExercise()], [light, heavy], 30)
        expect(result.get('Bench Press')).toBeCloseTo(estimate1RM(100, 5), 5)
    })

    test('excludes logs outside the reference window', () => {
        const old = new Date()
        old.setDate(old.getDate() - 40)
        const log = mockLog({ weight: 100, reps: 5, date: old })
        const result = oneRMMap([mockExercise()], [log], 30)
        expect(result.has('Bench Press')).toBe(false)
    })

    test('a true single (reps === 1) is stored as the bar weight', () => {
        const today = new Date()
        const log = mockLog({ weight: 225, reps: 1, date: today })
        const result = oneRMMap([mockExercise()], [log], 30)
        expect(result.get('Bench Press')).toBe(225)
    })

    describe('wall-clock boundary determinism', () => {
        const refDays = 30
        // Local-midnight-normalized log dates, mirroring parseDateKey's `new Date(y, m-1, d)`.
        const includedBoundaryLog = mockLog({ id: 'included', weight: 100, reps: 5, date: new Date(2026, 0, 2) }) // (refDays - 1) days before 2026-01-31
        const excludedBoundaryLog = mockLog({ id: 'excluded', weight: 100, reps: 5, date: new Date(2026, 0, 1) }) // refDays days before 2026-01-31

        afterEach(() => {
            jest.useRealTimers()
        })

        // Asserts boundary inclusion/exclusion at a mocked wall-clock time; returns the included value for cross-time comparison.
        function assertBoundaryAt(systemTime: string): number | undefined {
            jest.useFakeTimers()
            jest.setSystemTime(new Date(systemTime))

            const includedResult = oneRMMap([mockExercise()], [includedBoundaryLog], refDays)
            expect(includedResult.get('Bench Press')).toBeCloseTo(estimate1RM(100, 5), 5)

            const excludedResult = oneRMMap([mockExercise()], [excludedBoundaryLog], refDays)
            expect(excludedResult.has('Bench Press')).toBe(false)

            return includedResult.get('Bench Press')
        }

        test('at 00:05, the (refDays-1)-days-ago log is included and the refDays-days-ago log is excluded', () => {
            assertBoundaryAt('2026-01-31T00:05:00')
        })

        test('at 23:55, the (refDays-1)-days-ago log is included and the refDays-days-ago log is excluded', () => {
            assertBoundaryAt('2026-01-31T23:55:00')
        })

        test('the (refDays-1)-days-ago value is identical at 00:05 and 23:55', () => {
            const early = assertBoundaryAt('2026-01-31T00:05:00')
            const late = assertBoundaryAt('2026-01-31T23:55:00')
            expect(early).toBe(late)
        })
    })
})
