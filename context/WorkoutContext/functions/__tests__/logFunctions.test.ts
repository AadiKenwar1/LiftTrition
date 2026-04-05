import { Dispatch, SetStateAction } from 'react'
import { Log } from '../../types'
import { addLog, deleteLog } from '../logFunctions'

// Helper function to create mock log
function createMockLog(overrides: Partial<Log> = {}): Log {
    return {
        id: 'test-log-id',
        userID: 'user-1',
        workoutID: 'workout-1',
        exerciseID: 'exercise-1',
        date: new Date('2024-01-01'),
        time: 0,
        weight: 100,
        reps: 10,
        rpe: 8,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    }
}

// Helper function to create mock setter that tracks state
function createMockSetter<T>() {
    let state: T[] = []

    const setter: Dispatch<SetStateAction<T[]>> = (updater) => {
        if (typeof updater === 'function') {
            state = (updater as (prev: T[]) => T[])(state)
        } else {
            state = updater
        }
    }

    const getState = () => [...state]
    const setState = (newState: T[]) => {
        state = [...newState]
    }

    return { setter, getState, setState }
}

describe('Log Functions', () => {
    describe('addLog', () => {
        describe('Normal Cases', () => {
            test('should add new log with correct data', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                const date = new Date('2024-01-15')
                addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 8, date, setter)

                const result = getState()
                expect(result).toHaveLength(1)
                expect(result[0].workoutID).toBe('workout-1')
                expect(result[0].exerciseID).toBe('exercise-1')
                expect(result[0].userID).toBe('user-1')
                expect(result[0].weight).toBe(100)
                expect(result[0].reps).toBe(10)
                expect(result[0].rpe).toBe(8)
                expect(result[0].date).toEqual(date)
                expect(typeof result[0].time).toBe('number')
                expect(Number.isFinite(result[0].time)).toBe(true)
            })

            test('should set time to Date.now() (epoch ms)', () => {
                const fixedNow = 1_705_318_800_123
                const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNow)
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 8, new Date('2024-01-15'), setter)

                expect(getState()[0].time).toBe(fixedNow)
                nowSpy.mockRestore()
            })

            test('should store date as Date object', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                const date = new Date('2024-01-15T10:30:00Z')
                addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 8, date, setter)

                const result = getState()
                expect(result[0].date).toEqual(date)
                expect(result[0].date).toBeInstanceOf(Date)
            })

            test('should add multiple logs', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 8, new Date(), setter)
                addLog('workout-1', 'exercise-1', 'user-1', 105, 10, 8, new Date(), setter)
                addLog('workout-1', 'exercise-1', 'user-1', 110, 10, 8, new Date(), setter)

                const result = getState()
                expect(result).toHaveLength(3)
            })
        })

        describe('Edge Cases', () => {
            test('should handle zero weight', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 0, 10, 8, new Date(), setter)

                const result = getState()
                expect(result[0].weight).toBe(0)
            })

            test('should handle zero reps', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 100, 0, 8, new Date(), setter)

                const result = getState()
                expect(result[0].reps).toBe(0)
            })

            test('should handle zero RPE', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 0, new Date(), setter)

                const result = getState()
                expect(result[0].rpe).toBe(0)
            })

            test('should handle very large numbers', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 1000, 100, 10, new Date(), setter)

                const result = getState()
                expect(result[0].weight).toBe(1000)
                expect(result[0].reps).toBe(100)
                expect(result[0].rpe).toBe(10)
            })

            test('should handle decimal weight', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 100.5, 10, 8, new Date(), setter)

                const result = getState()
                expect(result[0].weight).toBe(100.5)
            })

            test('should not add log when weight is negative (validation)', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', -10, 10, 8, new Date(), setter)

                expect(getState()).toHaveLength(0)
            })

            test('should not add log when reps is negative (validation)', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 100, -5, 8, new Date(), setter)

                expect(getState()).toHaveLength(0)
            })

            test('should not add log when RPE is negative (validation)', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 100, 10, -1, new Date(), setter)

                expect(getState()).toHaveLength(0)
            })
        })

        describe('Property Validation', () => {
            test('should set all required properties when adding log', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                const date = new Date('2024-01-15')
                addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 8, date, setter)

                const result = getState()
                expect(result[0].id).toBeDefined()
                expect(result[0].id).not.toBe('')
                expect(result[0].userID).toBe('user-1')
                expect(result[0].workoutID).toBe('workout-1')
                expect(result[0].exerciseID).toBe('exercise-1')
                expect(result[0].date).toEqual(date)
                expect(result[0].weight).toBe(100)
                expect(result[0].reps).toBe(10)
                expect(result[0].rpe).toBe(8)
                expect(typeof result[0].time).toBe('number')
                expect(Number.isFinite(result[0].time)).toBe(true)
                expect(result[0].createdAt).toBeInstanceOf(Date)
                expect(result[0].updatedAt).toBeInstanceOf(Date)
            })

            test('should generate unique IDs for multiple logs', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 8, new Date(), setter)
                addLog('workout-1', 'exercise-1', 'user-1', 105, 10, 8, new Date(), setter)
                addLog('workout-1', 'exercise-1', 'user-1', 110, 10, 8, new Date(), setter)

                const result = getState()
                const ids = result.map((l) => l.id)
                const uniqueIds = new Set(ids)
                expect(uniqueIds.size).toBe(3)
            })
        })
    })

    describe('deleteLog', () => {
        describe('Normal Cases', () => {
            test('should delete log by id', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([createMockLog({ id: 'log1' }), createMockLog({ id: 'log2' }), createMockLog({ id: 'log3' })])

                deleteLog('log2', setter)

                const result = getState()
                expect(result).toHaveLength(2)
                expect(result.find((l) => l.id === 'log2')).toBeUndefined()
            })

            test('should preserve other logs when deleting one', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([createMockLog({ id: 'log1', weight: 100 }), createMockLog({ id: 'log2', weight: 200 }), createMockLog({ id: 'log3', weight: 300 })])

                deleteLog('log2', setter)

                const result = getState()
                expect(result).toHaveLength(2)
                expect(result.find((l) => l.id === 'log1')?.weight).toBe(100)
                expect(result.find((l) => l.id === 'log3')?.weight).toBe(300)
            })
        })

        describe('Edge Cases', () => {
            test('should handle deleting non-existent log', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([createMockLog({ id: 'log1' })])

                deleteLog('non-existent', setter)

                const result = getState()
                expect(result).toHaveLength(1)
            })

            test('should handle deleting from empty array', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([])

                deleteLog('log1', setter)

                const result = getState()
                expect(result).toHaveLength(0)
            })

            test('should handle deleting last log', () => {
                const { setter, getState, setState } = createMockSetter<Log>()
                setState([createMockLog({ id: 'log1' })])

                deleteLog('log1', setter)

                const result = getState()
                expect(result).toHaveLength(0)
            })
        })
    })

    describe('Challenging Cases', () => {
        test('should handle adding many logs', () => {
            const { setter, getState, setState } = createMockSetter<Log>()
            setState([])

            for (let i = 0; i < 100; i++) {
                addLog('workout-1', 'exercise-1', 'user-1', 100 + i, 10, 8, new Date(), setter)
            }

            const result = getState()
            expect(result).toHaveLength(100)
        })

        test('should handle logs for different exercises', () => {
            const { setter, getState, setState } = createMockSetter<Log>()
            setState([])

            addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 8, new Date(), setter)
            addLog('workout-1', 'exercise-2', 'user-1', 200, 10, 8, new Date(), setter)
            addLog('workout-1', 'exercise-1', 'user-1', 105, 10, 8, new Date(), setter)

            const result = getState()
            expect(result).toHaveLength(3)
            expect(result.filter((l) => l.exerciseID === 'exercise-1')).toHaveLength(2)
            expect(result.filter((l) => l.exerciseID === 'exercise-2')).toHaveLength(1)
        })

        test('should handle deleting multiple logs in sequence', () => {
            const { setter, getState, setState } = createMockSetter<Log>()
            setState([createMockLog({ id: 'log1' }), createMockLog({ id: 'log2' }), createMockLog({ id: 'log3' }), createMockLog({ id: 'log4' })])

            deleteLog('log2', setter)
            deleteLog('log4', setter)

            const result = getState()
            expect(result).toHaveLength(2)
            expect(result.find((l) => l.id === 'log1')).toBeDefined()
            expect(result.find((l) => l.id === 'log3')).toBeDefined()
        })

        test('should handle adding logs with different dates', () => {
            const { setter, getState, setState } = createMockSetter<Log>()
            setState([])

            const date1 = new Date('2024-01-01')
            const date2 = new Date('2024-01-15')
            const date3 = new Date('2024-02-01')

            addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 8, date1, setter)
            addLog('workout-1', 'exercise-1', 'user-1', 105, 10, 8, date2, setter)
            addLog('workout-1', 'exercise-1', 'user-1', 110, 10, 8, date3, setter)

            const result = getState()
            expect(result).toHaveLength(3)
            expect(result[0].date).toEqual(date1)
            expect(result[1].date).toEqual(date2)
            expect(result[2].date).toEqual(date3)
            expect(result.every((l) => typeof l.time === 'number')).toBe(true)
        })

        test('should handle adding logs across multiple workouts and exercises', () => {
            const { setter, getState, setState } = createMockSetter<Log>()
            setState([])

            addLog('workout-1', 'exercise-1', 'user-1', 100, 10, 8, new Date(), setter)
            addLog('workout-1', 'exercise-2', 'user-1', 200, 10, 8, new Date(), setter)
            addLog('workout-2', 'exercise-1', 'user-1', 150, 10, 8, new Date(), setter)
            addLog('workout-2', 'exercise-3', 'user-1', 250, 10, 8, new Date(), setter)

            const result = getState()
            expect(result).toHaveLength(4)
            expect(result.filter((l) => l.workoutID === 'workout-1')).toHaveLength(2)
            expect(result.filter((l) => l.workoutID === 'workout-2')).toHaveLength(2)
            expect(result.filter((l) => l.exerciseID === 'exercise-1')).toHaveLength(2)
        })
    })
})
