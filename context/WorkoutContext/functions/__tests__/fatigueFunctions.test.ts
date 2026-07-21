import { calculateFatigueFactor, calculateFatiguePercentage, calculateFatigueSummary } from '../fatigueFunctions'
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
            mainMuscle: 'Chest',
            fatigueFactor,
            equipment: 'Barbell',
            isCompound: true,
        },
    }
}

const BW = 180
const EMPTY_BW_PROGRESS: Record<string, number> = {}

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
            // Dates use the local date-time form (T12:00:00) so the log lands on the same LOCAL day as the
            // mocked clock; the bare '2026-01-31' form parses as UTC midnight = the prior local day, which the
            // deterministic start-of-day fatigue window (correctly) excludes from a 1-day window.
            const heavy = mockLog({ id: 'heavy', exerciseID: 'ex-1', date: new Date('2026-01-31T12:00:00'), weight: 100, reps: 5, rpe: 7 })
            const light = mockLog({ id: 'light', exerciseID: 'ex-1', date: new Date('2026-01-31T12:00:00'), weight: 50, reps: 5, rpe: 7 })
            const logs: Log[] = [heavy, light]

            const pct = calculateFatiguePercentage(1, logs, exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)

            // Expected:
            // e1RM(100x5)=116.65; both sets use currentMax=116.65 due to rolling ref
            // adjusted Epley base: (w/currentMax) * (1 + reps/30)
            // scaled by (rpe/10) * fatigueFactor; activity only via daily budget (moderate = 10)
            const e1 = 100 * (1 + 0.0333 * 5) // 116.65
            const rpeScale = 7 / 10
            const repFactor = 1 + 5 / 30
            const heavyFatigue = (100 / e1) * repFactor * rpeScale * 1.0
            const lightFatigue = (50 / e1) * repFactor * rpeScale * 1.0
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

            const pct = calculateFatiguePercentage(60, logs, exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)

            // With no rolling reference, currentMax falls back to this set's e1RM.
            const e1 = 100 * (1 + 0.0333 * 5)
            const expectedSetFatigue = (100 / e1) * (1 + 5 / 30) * (7 / 10) * 1.0
            const expected = (expectedSetFatigue / (10 * 60)) * 100

            expect(pct).toBeCloseTo(expected, 6)
        })

        test('returns 0 when there are no logs', () => {
            const exercises: Exercise[] = [mockExercise()]
            const lib = mockLib(1.0)
            expect(calculateFatiguePercentage(1, [], exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)).toBe(0)
        })

        test('bodyweight exercise logged as 0 uses profile body weight and produces fatigue > 0', () => {
            const exercises: Exercise[] = [mockExercise({ id: 'ex-1', name: 'Pull Ups' })]
            const lib: ExerciseLib = {
                'Pull Ups': {
                    mainMuscle: 'Back',
                    fatigueFactor: 1.1,
                    equipment: 'Bodyweight',
                    isCompound: true,
                },
            }

            const log = mockLog({ exerciseID: 'ex-1', date: new Date('2026-01-31T12:00:00'), weight: 0, reps: 10, rpe: 7 })
            const pct = calculateFatiguePercentage(1, [log], exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)

            expect(pct).toBeGreaterThan(0)
        })

        test('weighted bodyweight exercise uses BW + added weight', () => {
            const exercises: Exercise[] = [mockExercise({ id: 'ex-1', name: 'Pull Ups' })]
            const lib: ExerciseLib = {
                'Pull Ups': {
                    mainMuscle: 'Back',
                    fatigueFactor: 1.1,
                    equipment: 'Bodyweight',
                    isCompound: true,
                },
            }

            const unweighted = mockLog({ id: 'bw', exerciseID: 'ex-1', date: new Date('2026-01-31T12:00:00'), weight: 0, reps: 5, rpe: 7 })
            const weighted = mockLog({ id: 'belt', exerciseID: 'ex-1', date: new Date('2026-01-31T12:00:00'), weight: 25, reps: 5, rpe: 7 })

            const pctUnweighted = calculateFatiguePercentage(1, [unweighted], exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)
            const pctWeighted = calculateFatiguePercentage(1, [weighted], exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)

            // BW+25 set should produce more fatigue than BW-only set at the same reps/RPE
            expect(pctWeighted).toBeGreaterThan(pctUnweighted)
        })

        test('bwProgress uses historical body weight to compute effective load for old logs', () => {
            // Two pull-up logs: a recent one (Jan 20) at high BW anchors the ref,
            // and an old one (Jan 5) at lower historical BW. When bwProgress is provided,
            // the old log's effective load uses the historical BW (160) instead of
            // current BW (200), producing less fatigue than without bwProgress.
            const pullUpEx = mockExercise({ id: 'pu', name: 'Pull Ups' })
            const lib: ExerciseLib = {
                'Pull Ups': { mainMuscle: 'Back', fatigueFactor: 1.1, equipment: 'Bodyweight', isCompound: true },
            }

            const currentBW = 200
            // Recent log (Jan 20) — within 30d ref window; user was at 200 lbs.
            const recentLog = mockLog({ id: 'recent', exerciseID: 'pu', date: new Date('2026-01-20'), weight: 0, reps: 5, rpe: 7 })
            // Old log (Jan 5) — user was at 160 lbs historically.
            const oldLog = mockLog({ id: 'old', exerciseID: 'pu', date: new Date('2026-01-05'), weight: 0, reps: 5, rpe: 7 })

            // With bwProgress: oldLog uses 160, recentLog uses 200 (ref anchored at e1RM(200,5))
            // Old log effective load 160 < ref anchor 200 → lower fatigue contribution
            const bwProgress = { '2026-01-05': 160, '2026-01-20': 200 }
            const pctHistorical = calculateFatiguePercentage(60, [recentLog, oldLog], [pullUpEx], lib, 'moderate', currentBW, bwProgress)

            // Without bwProgress: both logs use currentBW=200 → old log effective load = 200 = ref anchor
            const pctCurrent = calculateFatiguePercentage(60, [recentLog, oldLog], [pullUpEx], lib, 'moderate', currentBW, EMPTY_BW_PROGRESS)

            // Using historical lighter BW for the old log produces less total fatigue
            expect(pctHistorical).toBeLessThan(pctCurrent)
        })

        describe('wall-clock boundary determinism', () => {
            const NOW_DATE = '2026-02-15'
            const exercises: Exercise[] = [mockExercise({ id: 'ex-1', name: 'Bench Press' })]
            const lib = mockLib(1.0)

            // Local-midnight-normalized log dates, mirroring parseDateKey's `new Date(y, m-1, d)`.
            const todayLog = mockLog({ id: 'today', exerciseID: 'ex-1', date: new Date(2026, 1, 15), weight: 100, reps: 5, rpe: 7 })
            const yesterdayLog = mockLog({ id: 'yesterday', exerciseID: 'ex-1', date: new Date(2026, 1, 14), weight: 100, reps: 5, rpe: 7 })

            // Asserts numDays=1 boundary inclusion/exclusion at a mocked wall-clock time; returns the today-only percentage.
            function assertBoundaryAt(systemTime: string): number {
                jest.setSystemTime(new Date(systemTime))

                const pctIncluded = calculateFatiguePercentage(1, [todayLog], exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)
                expect(pctIncluded).toBeGreaterThan(0)

                const pctExcluded = calculateFatiguePercentage(1, [yesterdayLog], exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)
                expect(pctExcluded).toBe(0)

                // No window widening: adding yesterday's (excluded) log must not inflate today's percentage.
                const pctBoth = calculateFatiguePercentage(1, [todayLog, yesterdayLog], exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)
                expect(pctBoth).toBeCloseTo(pctIncluded, 6)

                return pctIncluded
            }

            test('at 00:05, numDays=1 includes a log dated exactly today and excludes one dated exactly 1 day ago', () => {
                assertBoundaryAt(`${NOW_DATE}T00:05:00`)
            })

            test('at 23:55, numDays=1 includes a log dated exactly today and excludes one dated exactly 1 day ago', () => {
                assertBoundaryAt(`${NOW_DATE}T23:55:00`)
            })

            test('the today-only percentage is identical at 00:05 and 23:55 (no wall-clock drift)', () => {
                const early = assertBoundaryAt(`${NOW_DATE}T00:05:00`)
                const late = assertBoundaryAt(`${NOW_DATE}T23:55:00`)
                expect(early).toBe(late)
            })
        })
    })

    describe('calculateFatigueSummary', () => {
        test('today does not include yesterday', () => {
            const exercises: Exercise[] = [mockExercise({ id: 'ex-1', name: 'Bench Press' })]
            const lib = mockLib(1.0)

            const yesterday = new Date('2026-01-30T00:00:00')
            const yesterdayLog = mockLog({ id: 'y', exerciseID: 'ex-1', date: yesterday, weight: 100, reps: 5, rpe: 7 })

            const summary = calculateFatigueSummary([yesterdayLog], exercises, lib, 'moderate', BW, EMPTY_BW_PROGRESS)
            expect(summary.today).toBe(0)
            expect(summary.last3Days).toBeGreaterThan(0)
        })
    })

    describe('calculateFatigueFactor', () => {
        test('returns a bounded fatigue factor', () => {
            const f1 = calculateFatigueFactor(true, 'Chest', 'Barbell')
            const f2 = calculateFatigueFactor(false, 'Forearms', 'Machine')

            expect(f1).toBeGreaterThanOrEqual(0.5)
            expect(f1).toBeLessThanOrEqual(1.1)
            expect(f2).toBeGreaterThanOrEqual(0.5)
            expect(f2).toBeLessThanOrEqual(1.1)
        })
    })
})

