/**
 * V1 Fatigue Baseline Test
 *
 * Captures numeric fatigue outputs from the current V1 exercise library so they
 * can be compared against V2 after the migration.  All results are written to
 * fatigueBaseline_v1.txt at the project root.
 *
 * Three tiers:
 *   T1 — 14 single-exercise fatigue-factor values
 *   T2 — 15 single-day mini-session fatigue percentages
 *   T3 — 12 full-week fatigue summaries (today / last3 / last6 / last9)
 */

import * as fs from 'fs'
import * as path from 'path'
import { calculateFatigueFactor, calculateFatiguePercentage, calculateFatigueSummary } from '../fatigueFunctions'
import type { Exercise, ExerciseLib, ExerciseLibraryEntry, Log } from '../../types'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const NOW = new Date('2026-01-31T12:00:00')
const BW = 180
const EMPTY_BW: Record<string, number> = {}
const output: string[] = [`=== V1 FATIGUE BASELINE — ${NOW.toISOString().slice(0, 10)} ===`]

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function libEntry(
    mainMuscle: string,
    accessories: string[],
    equipment: string,
    isCompound: boolean,
): ExerciseLibraryEntry {
    return {
        mainMuscle,
        accessoryMuscles: accessories,
        fatigueFactor: calculateFatigueFactor(isCompound, mainMuscle, accessories, equipment),
        equipment,
        isCompound,
    }
}

function mkEx(id: string, name: string): Exercise {
    return { id, userID: 'u1', workoutID: 'w1', name, userMax: 0, order: 0, archived: false, createdAt: NOW, updatedAt: NOW }
}

function mkLog(id: string, exId: string, date: Date, weight: number, reps: number, rpe: number): Log {
    return { id, userID: 'u1', workoutID: 'w1', exerciseID: exId, date, time: 0, weight, reps, rpe, createdAt: date, updatedAt: date }
}

/** Returns a Date n whole days before NOW (preserving time component). */
function dAgo(n: number): Date {
    const d = new Date(NOW)
    d.setDate(d.getDate() - n)
    return d
}

/** Creates n identical log entries for one exercise. */
function sets(exId: string, date: Date, w: number, reps: number, rpe: number, n: number): Log[] {
    return Array.from({ length: n }, (_, i) => mkLog(`${exId}-s${i}`, exId, date, w, reps, rpe))
}

// ─────────────────────────────────────────────────────────────
// V1 EXERCISE LIBRARY
// ─────────────────────────────────────────────────────────────

const LIB: ExerciseLib = {
    'Barbell Bench Press':  libEntry('Upper Chest',    ['Triceps', 'Front Delts'],               'Barbell',    true),
    'Incline DB Press':     libEntry('Upper Chest',    ['Front Delts'],                           'Dumbbell',   true),
    'Cable Fly':            libEntry('Lower Chest',    [],                                        'Cable',      false),
    'Dips':                 libEntry('Lower Chest',    ['Triceps', 'Front Delts'],                'Bodyweight', true),
    'Pull Ups':             libEntry('Lats',           ['Upper/Mid Back', 'Biceps'],              'Bodyweight', true),
    'Bent Over Row':        libEntry('Upper/Mid Back', ['Lats', 'Biceps'],                        'Barbell',    true),
    'Lat Pulldown':         libEntry('Lats',           ['Rear Delts'],                            'Cable',      true),
    'Seated Cable Row':     libEntry('Upper/Mid Back', ['Rear Delts', 'Biceps'],                  'Cable',      true),
    'Overhead Press':       libEntry('Front Delts',    ['Triceps', 'Side Delts'],                 'Barbell',    true),
    'Lateral Raise':        libEntry('Side Delts',     [],                                        'Dumbbell',   false),
    'Face Pull':            libEntry('Rear Delts',     ['Upper/Mid Back'],                        'Cable',      false),
    'Barbell Squat':        libEntry('Quads',          ['Hamstrings', 'Glutes'],                  'Barbell',    true),
    'Romanian Deadlift':    libEntry('Hamstrings',     ['Glutes', 'Lower Back'],                  'Barbell',    true),
    'Leg Press':            libEntry('Quads',          ['Glutes'],                                'Machine',    true),
    'Leg Curl':             libEntry('Hamstrings',     [],                                        'Machine',    false),
    'Deadlift':             libEntry('Lower Back',     ['Hamstrings', 'Glutes', 'Upper/Mid Back'], 'Barbell',   true),
    'Barbell Curl':         libEntry('Biceps',         [],                                        'Barbell',    false),
    'Tricep Pushdown':      libEntry('Triceps',        [],                                        'Cable',      false),
    'Hammer Curl':          libEntry('Biceps',         ['Forearms'],                              'Dumbbell',   false),
    'Chest Press Machine':  libEntry('Upper Chest',    [],                                        'Machine',    true),
    'Cable Row':            libEntry('Upper/Mid Back', ['Biceps'],                                'Cable',      true),
    'Plank':                libEntry('Abs',            [],                                        'Bodyweight', false),
    'Cable Crunch':         libEntry('Abs',            ['Obliques'],                              'Cable',      false),
    'DB Shoulder Press':    libEntry('Front Delts',    ['Triceps', 'Side Delts'],                 'Dumbbell',   true),
    'Incline DB Curl':      libEntry('Biceps',         [],                                        'Dumbbell',   false),
    'Tricep Extension':     libEntry('Triceps',        [],                                        'Dumbbell',   false),
    'Calf Raise':           libEntry('Calves',         [],                                        'Machine',    false),
    'Hip Thrust':           libEntry('Glutes',         ['Hamstrings'],                            'Barbell',    true),
    'Close Grip Bench':     libEntry('Triceps',        ['Upper Chest', 'Front Delts'],            'Barbell',    true),
}

// ─────────────────────────────────────────────────────────────
// MINI SESSION RUNNER
// ─────────────────────────────────────────────────────────────

interface SetSpec { name: string; weight: number; reps: number; rpe: number; numSets: number }

function runMiniSession(exerciseSpecs: SetSpec[]): number {
    const exercises: Exercise[] = []
    const logs: Log[] = []
    exerciseSpecs.forEach(({ name, weight, reps, rpe, numSets }, i) => {
        const e = mkEx(`ms-e${i}`, name)
        exercises.push(e)
        sets(e.id, NOW, weight, reps, rpe, numSets).forEach(l => logs.push(l))
    })
    return calculateFatiguePercentage(1, logs, exercises, LIB, 'moderate', BW, EMPTY_BW)
}

// ─────────────────────────────────────────────────────────────
// FULL SESSION RUNNER
// ─────────────────────────────────────────────────────────────

interface DaySpec { daysAgo: number; workouts: SetSpec[] }

function buildFullSession(idx: number, days: DaySpec[]): { exercises: Exercise[]; logs: Log[] } {
    const exercises: Exercise[] = []
    const logs: Log[] = []
    const seen = new Map<string, string>()
    let logId = 0

    days.forEach(({ daysAgo: ago, workouts }) => {
        const date = dAgo(ago)
        workouts.forEach(({ name, weight, reps, rpe, numSets }) => {
            if (!seen.has(name)) {
                const e = mkEx(`t3-${idx}-e${seen.size}`, name)
                exercises.push(e)
                seen.set(name, e.id)
            }
            const exId = seen.get(name)!
            for (let s = 0; s < numSets; s++) {
                logs.push(mkLog(`t3-${idx}-l${logId++}`, exId, date, weight, reps, rpe))
            }
        })
    })

    return { exercises, logs }
}

// ─────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────

describe('V1 Fatigue Baseline', () => {
    beforeAll(() => {
        jest.useFakeTimers()
        jest.setSystemTime(NOW)
    })

    afterAll(() => {
        jest.useRealTimers()
        const filePath = path.resolve(__dirname, '../../../../fatigueBaseline_v1.txt')
        fs.writeFileSync(filePath, output.join('\n') + '\n', 'utf-8')
        console.log(`\nBaseline written → ${filePath}`)
    })

    // ──────────────────────────────────────────────────────────
    // TIER 1 — Single Exercise Fatigue Factors
    // ──────────────────────────────────────────────────────────

    describe('Tier 1 — Single Exercise Fatigue Factors', () => {
        beforeAll(() => output.push('\n--- TIER 1: Single Exercise Fatigue Factors ---'))

        const T1_CASES: Array<{
            label: string
            isCompound: boolean
            main: string
            acc: string[]
            eq: string
        }> = [
            { label: 'Barbell Bench Press',  isCompound: true,  main: 'Upper Chest',    acc: ['Triceps', 'Front Delts'],               eq: 'Barbell'    },
            { label: 'Incline DB Press',     isCompound: true,  main: 'Upper Chest',    acc: ['Front Delts'],                          eq: 'Dumbbell'   },
            { label: 'Cable Fly',            isCompound: false, main: 'Lower Chest',    acc: [],                                       eq: 'Cable'      },
            { label: 'Pull Ups',             isCompound: true,  main: 'Lats',           acc: ['Upper/Mid Back', 'Biceps'],             eq: 'Bodyweight' },
            { label: 'Bent Over Row',        isCompound: true,  main: 'Upper/Mid Back', acc: ['Lats', 'Biceps'],                       eq: 'Barbell'    },
            { label: 'Lat Pulldown',         isCompound: true,  main: 'Lats',           acc: ['Rear Delts'],                           eq: 'Cable'      },
            { label: 'Overhead Press',       isCompound: true,  main: 'Front Delts',    acc: ['Triceps', 'Side Delts'],                eq: 'Barbell'    },
            { label: 'Lateral Raise',        isCompound: false, main: 'Side Delts',     acc: [],                                       eq: 'Dumbbell'   },
            { label: 'Barbell Squat',        isCompound: true,  main: 'Quads',          acc: ['Hamstrings', 'Glutes'],                 eq: 'Barbell'    },
            { label: 'Romanian Deadlift',    isCompound: true,  main: 'Hamstrings',     acc: ['Glutes', 'Lower Back'],                 eq: 'Barbell'    },
            { label: 'Leg Press',            isCompound: true,  main: 'Quads',          acc: ['Glutes'],                               eq: 'Machine'    },
            { label: 'Barbell Curl',         isCompound: false, main: 'Biceps',         acc: [],                                       eq: 'Barbell'    },
            { label: 'Tricep Pushdown',      isCompound: false, main: 'Triceps',        acc: [],                                       eq: 'Cable'      },
            { label: 'Plank',               isCompound: false, main: 'Abs',            acc: [],                                       eq: 'Bodyweight' },
        ]

        T1_CASES.forEach(({ label, isCompound, main, acc, eq }) => {
            test(label, () => {
                const factor = calculateFatigueFactor(isCompound, main, acc, eq)
                output.push(`[T1] ${label.padEnd(30)} factor: ${factor.toFixed(4)}`)
                expect(factor).toBeGreaterThanOrEqual(0.5)
                expect(factor).toBeLessThanOrEqual(1.1)
            })
        })
    })

    // ──────────────────────────────────────────────────────────
    // TIER 2 — Mini Sessions (single-day fatigue %)
    // ──────────────────────────────────────────────────────────

    describe('Tier 2 — Mini Sessions (single-day fatigue %)', () => {
        beforeAll(() => output.push('\n--- TIER 2: Mini Sessions (single-day fatigue %) ---'))

        const T2_CASES: Array<{ label: string; exercises: SetSpec[] }> = [
            {
                label: 'Chest Day',
                exercises: [
                    { name: 'Barbell Bench Press', weight: 100, reps: 5,  rpe: 7, numSets: 4 },
                    { name: 'Incline DB Press',    weight: 35,  reps: 8,  rpe: 7, numSets: 3 },
                    { name: 'Cable Fly',           weight: 20,  reps: 12, rpe: 7, numSets: 3 },
                ],
            },
            {
                label: 'Back Day',
                exercises: [
                    { name: 'Pull Ups',      weight: 0,  reps: 8,  rpe: 7, numSets: 4 },
                    { name: 'Bent Over Row', weight: 80, reps: 8,  rpe: 7, numSets: 4 },
                    { name: 'Lat Pulldown',  weight: 70, reps: 10, rpe: 7, numSets: 3 },
                ],
            },
            {
                label: 'Shoulder Day',
                exercises: [
                    { name: 'Overhead Press', weight: 60, reps: 8,  rpe: 7, numSets: 4 },
                    { name: 'Lateral Raise',  weight: 15, reps: 15, rpe: 7, numSets: 3 },
                    { name: 'Face Pull',      weight: 25, reps: 15, rpe: 7, numSets: 3 },
                ],
            },
            {
                label: 'Arm Day',
                exercises: [
                    { name: 'Barbell Curl',     weight: 40, reps: 10, rpe: 7, numSets: 3 },
                    { name: 'Tricep Pushdown',  weight: 30, reps: 12, rpe: 7, numSets: 3 },
                    { name: 'Hammer Curl',      weight: 20, reps: 12, rpe: 7, numSets: 3 },
                ],
            },
            {
                label: 'Leg Day',
                exercises: [
                    { name: 'Barbell Squat',      weight: 120, reps: 5,  rpe: 7, numSets: 4 },
                    { name: 'Romanian Deadlift',  weight: 100, reps: 8,  rpe: 7, numSets: 3 },
                    { name: 'Leg Press',          weight: 150, reps: 10, rpe: 7, numSets: 3 },
                ],
            },
            {
                label: 'Push Day',
                exercises: [
                    { name: 'Barbell Bench Press', weight: 100, reps: 5,  rpe: 7, numSets: 4 },
                    { name: 'Overhead Press',      weight: 60,  reps: 8,  rpe: 7, numSets: 3 },
                    { name: 'Tricep Pushdown',     weight: 30,  reps: 12, rpe: 7, numSets: 3 },
                ],
            },
            {
                label: 'Pull Day',
                exercises: [
                    { name: 'Pull Ups',         weight: 0,  reps: 8,  rpe: 7, numSets: 4 },
                    { name: 'Seated Cable Row', weight: 70, reps: 10, rpe: 7, numSets: 3 },
                    { name: 'Barbell Curl',     weight: 40, reps: 10, rpe: 7, numSets: 3 },
                ],
            },
            {
                label: 'Lower Day',
                exercises: [
                    { name: 'Deadlift',  weight: 140, reps: 5,  rpe: 8, numSets: 4 },
                    { name: 'Leg Press', weight: 150, reps: 10, rpe: 7, numSets: 3 },
                    { name: 'Leg Curl',  weight: 60,  reps: 12, rpe: 7, numSets: 3 },
                ],
            },
            {
                label: 'Machine-Only Day',
                exercises: [
                    { name: 'Chest Press Machine', weight: 80,  reps: 10, rpe: 7, numSets: 3 },
                    { name: 'Leg Press',           weight: 150, reps: 10, rpe: 7, numSets: 3 },
                    { name: 'Cable Row',           weight: 70,  reps: 10, rpe: 7, numSets: 3 },
                ],
            },
            {
                label: 'Bodyweight Day',
                exercises: [
                    { name: 'Pull Ups', weight: 0, reps: 10, rpe: 7, numSets: 3 },
                    { name: 'Dips',     weight: 0, reps: 12, rpe: 7, numSets: 3 },
                    { name: 'Plank',    weight: 0, reps: 30, rpe: 6, numSets: 3 },
                ],
            },
            {
                label: 'High RPE Day (RPE 9-10)',
                exercises: [
                    { name: 'Barbell Bench Press', weight: 115, reps: 3, rpe: 10, numSets: 4 },
                    { name: 'Barbell Squat',       weight: 140, reps: 3, rpe: 10, numSets: 4 },
                    { name: 'Deadlift',            weight: 160, reps: 3, rpe: 10, numSets: 3 },
                ],
            },
            {
                label: 'Low RPE Day (RPE 5)',
                exercises: [
                    { name: 'Barbell Bench Press', weight: 80,  reps: 8, rpe: 5, numSets: 4 },
                    { name: 'Barbell Squat',       weight: 100, reps: 8, rpe: 5, numSets: 4 },
                    { name: 'Deadlift',            weight: 120, reps: 8, rpe: 5, numSets: 3 },
                ],
            },
            {
                label: 'Heavy Low Rep Day (3 reps)',
                exercises: [
                    { name: 'Barbell Bench Press', weight: 115, reps: 3, rpe: 8, numSets: 5 },
                    { name: 'Barbell Squat',       weight: 140, reps: 3, rpe: 8, numSets: 5 },
                ],
            },
            {
                label: 'Light High Rep Day (15 reps)',
                exercises: [
                    { name: 'Barbell Bench Press', weight: 60, reps: 15, rpe: 7, numSets: 4 },
                    { name: 'Barbell Squat',       weight: 70, reps: 15, rpe: 7, numSets: 4 },
                ],
            },
            {
                label: 'Full Body Blitz (4 exercises)',
                exercises: [
                    { name: 'Barbell Squat',       weight: 100, reps: 5, rpe: 7, numSets: 3 },
                    { name: 'Barbell Bench Press', weight: 90,  reps: 5, rpe: 7, numSets: 3 },
                    { name: 'Pull Ups',            weight: 0,   reps: 8, rpe: 7, numSets: 3 },
                    { name: 'Overhead Press',      weight: 55,  reps: 8, rpe: 7, numSets: 3 },
                ],
            },
        ]

        T2_CASES.forEach(({ label, exercises }, i) => {
            test(label, () => {
                const pct = runMiniSession(exercises)
                output.push(`[T2-${String(i + 1).padStart(2, '0')}] ${label.padEnd(38)} fatigue%: ${pct.toFixed(2)}`)
                expect(pct).toBeGreaterThanOrEqual(0)
            })
        })
    })

    // ──────────────────────────────────────────────────────────
    // TIER 3 — Full Week Sessions (fatigue summary)
    // ──────────────────────────────────────────────────────────

    describe('Tier 3 — Full Week Sessions (fatigue summary)', () => {
        beforeAll(() => output.push('\n--- TIER 3: Full Week Sessions (today / last3 / last6 / last9) ---'))

        function fullSessionTest(
            label: string,
            idx: number,
            days: DaySpec[],
            activityLevel = 'moderate',
        ) {
            test(label, () => {
                const { exercises, logs } = buildFullSession(idx, days)
                const s = calculateFatigueSummary(logs, exercises, LIB, activityLevel, BW, EMPTY_BW)
                output.push(
                    `[T3-${String(idx).padStart(2, '0')}] ${label.padEnd(32)} activity:${activityLevel.padEnd(10)}` +
                    `  today:${s.today.toFixed(1).padStart(6)}%` +
                    `  last3:${s.last3Days.toFixed(1).padStart(6)}%` +
                    `  last6:${s.last6Days.toFixed(1).padStart(6)}%` +
                    `  last9:${s.last9Days.toFixed(1).padStart(6)}%`,
                )
                // Each window is an average % — shorter windows with concentrated
                // training can be higher than longer windows, so we only assert >= 0.
                expect(s.today).toBeGreaterThanOrEqual(0)
                expect(s.last3Days).toBeGreaterThanOrEqual(0)
                expect(s.last6Days).toBeGreaterThanOrEqual(0)
                expect(s.last9Days).toBeGreaterThanOrEqual(0)
            })
        }

        // T3-01: Push/Pull/Legs split (6 days, today = leg day)
        fullSessionTest('PPL Split', 1, [
            { daysAgo: 5, workouts: [
                { name: 'Barbell Bench Press', weight: 100, reps: 5,  rpe: 7, numSets: 4 },
                { name: 'Overhead Press',      weight: 60,  reps: 8,  rpe: 7, numSets: 3 },
                { name: 'Tricep Pushdown',     weight: 30,  reps: 12, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 4, workouts: [
                { name: 'Pull Ups',      weight: 0,  reps: 8,  rpe: 7, numSets: 4 },
                { name: 'Bent Over Row', weight: 80, reps: 8,  rpe: 7, numSets: 4 },
                { name: 'Barbell Curl',  weight: 40, reps: 10, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 3, workouts: [
                { name: 'Barbell Squat',     weight: 120, reps: 5,  rpe: 7, numSets: 4 },
                { name: 'Romanian Deadlift', weight: 100, reps: 8,  rpe: 7, numSets: 3 },
                { name: 'Leg Press',         weight: 150, reps: 10, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 2, workouts: [
                { name: 'Barbell Bench Press', weight: 100, reps: 5,  rpe: 7, numSets: 4 },
                { name: 'Overhead Press',      weight: 60,  reps: 8,  rpe: 7, numSets: 3 },
                { name: 'Tricep Pushdown',     weight: 30,  reps: 12, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 1, workouts: [
                { name: 'Pull Ups',      weight: 0,  reps: 8,  rpe: 7, numSets: 4 },
                { name: 'Bent Over Row', weight: 80, reps: 8,  rpe: 7, numSets: 4 },
                { name: 'Barbell Curl',  weight: 40, reps: 10, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 0, workouts: [
                { name: 'Barbell Squat',     weight: 120, reps: 5,  rpe: 7, numSets: 4 },
                { name: 'Romanian Deadlift', weight: 100, reps: 8,  rpe: 7, numSets: 3 },
                { name: 'Leg Press',         weight: 150, reps: 10, rpe: 7, numSets: 3 },
            ]},
        ])

        // T3-02: Upper/Lower split (4 days)
        fullSessionTest('Upper/Lower Split', 2, [
            { daysAgo: 5, workouts: [
                { name: 'Barbell Bench Press', weight: 100, reps: 5,  rpe: 7, numSets: 4 },
                { name: 'Pull Ups',            weight: 0,   reps: 8,  rpe: 7, numSets: 4 },
                { name: 'Overhead Press',      weight: 60,  reps: 8,  rpe: 7, numSets: 3 },
                { name: 'Barbell Curl',        weight: 40,  reps: 10, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 4, workouts: [
                { name: 'Barbell Squat',     weight: 120, reps: 5,  rpe: 7, numSets: 4 },
                { name: 'Romanian Deadlift', weight: 100, reps: 8,  rpe: 7, numSets: 3 },
                { name: 'Leg Press',         weight: 150, reps: 10, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 2, workouts: [
                { name: 'Barbell Bench Press', weight: 105, reps: 5,  rpe: 8, numSets: 4 },
                { name: 'Pull Ups',            weight: 0,   reps: 8,  rpe: 8, numSets: 4 },
                { name: 'Overhead Press',      weight: 62,  reps: 8,  rpe: 8, numSets: 3 },
                { name: 'Barbell Curl',        weight: 42,  reps: 10, rpe: 8, numSets: 3 },
            ]},
            { daysAgo: 0, workouts: [
                { name: 'Barbell Squat',     weight: 125, reps: 5,  rpe: 8, numSets: 4 },
                { name: 'Romanian Deadlift', weight: 105, reps: 8,  rpe: 8, numSets: 3 },
                { name: 'Leg Press',         weight: 155, reps: 10, rpe: 8, numSets: 3 },
            ]},
        ])

        // T3-03: Full body 3×/week
        fullSessionTest('Full Body 3x Week', 3, [
            { daysAgo: 6, workouts: [
                { name: 'Barbell Squat',       weight: 100, reps: 5, rpe: 7, numSets: 3 },
                { name: 'Barbell Bench Press', weight: 90,  reps: 5, rpe: 7, numSets: 3 },
                { name: 'Pull Ups',            weight: 0,   reps: 8, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 4, workouts: [
                { name: 'Barbell Squat',       weight: 100, reps: 5, rpe: 7, numSets: 3 },
                { name: 'Barbell Bench Press', weight: 90,  reps: 5, rpe: 7, numSets: 3 },
                { name: 'Pull Ups',            weight: 0,   reps: 8, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 2, workouts: [
                { name: 'Barbell Squat',       weight: 100, reps: 5, rpe: 7, numSets: 3 },
                { name: 'Barbell Bench Press', weight: 90,  reps: 5, rpe: 7, numSets: 3 },
                { name: 'Pull Ups',            weight: 0,   reps: 8, rpe: 7, numSets: 3 },
            ]},
        ])

        // T3-04: Bro split (5 days: chest/back/shoulders/arms/legs)
        fullSessionTest('Bro Split', 4, [
            { daysAgo: 7, workouts: [
                { name: 'Barbell Bench Press', weight: 100, reps: 5,  rpe: 7, numSets: 4 },
                { name: 'Incline DB Press',    weight: 35,  reps: 8,  rpe: 7, numSets: 3 },
                { name: 'Cable Fly',           weight: 20,  reps: 12, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 6, workouts: [
                { name: 'Pull Ups',      weight: 0,  reps: 8,  rpe: 7, numSets: 4 },
                { name: 'Bent Over Row', weight: 80, reps: 8,  rpe: 7, numSets: 4 },
                { name: 'Lat Pulldown',  weight: 70, reps: 10, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 5, workouts: [
                { name: 'Overhead Press', weight: 60, reps: 8,  rpe: 7, numSets: 4 },
                { name: 'Lateral Raise',  weight: 15, reps: 15, rpe: 7, numSets: 3 },
                { name: 'Face Pull',      weight: 25, reps: 15, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 4, workouts: [
                { name: 'Barbell Curl',    weight: 40, reps: 10, rpe: 7, numSets: 4 },
                { name: 'Tricep Pushdown', weight: 30, reps: 12, rpe: 7, numSets: 4 },
                { name: 'Hammer Curl',     weight: 20, reps: 12, rpe: 7, numSets: 3 },
            ]},
            { daysAgo: 3, workouts: [
                { name: 'Barbell Squat',     weight: 120, reps: 5,  rpe: 7, numSets: 4 },
                { name: 'Romanian Deadlift', weight: 100, reps: 8,  rpe: 7, numSets: 3 },
                { name: 'Leg Press',         weight: 150, reps: 10, rpe: 7, numSets: 3 },
            ]},
        ])

        // T3-05: Powerlifting week (4 sessions, heavy)
        fullSessionTest('Powerlifting Week', 5, [
            { daysAgo: 7, workouts: [{ name: 'Barbell Squat',       weight: 140, reps: 3, rpe: 9, numSets: 5 }] },
            { daysAgo: 5, workouts: [{ name: 'Barbell Bench Press', weight: 120, reps: 3, rpe: 9, numSets: 5 }] },
            { daysAgo: 3, workouts: [{ name: 'Deadlift',            weight: 170, reps: 3, rpe: 9, numSets: 4 }] },
            { daysAgo: 1, workouts: [{ name: 'Barbell Squat',       weight: 130, reps: 3, rpe: 8, numSets: 5 }] },
        ])

        // T3-06: Deload week (light loads, RPE 5)
        fullSessionTest('Deload Week', 6, [
            { daysAgo: 6, workouts: [
                { name: 'Barbell Bench Press', weight: 60, reps: 8, rpe: 5, numSets: 3 },
                { name: 'Pull Ups',            weight: 0,  reps: 6, rpe: 5, numSets: 3 },
            ]},
            { daysAgo: 3, workouts: [
                { name: 'Barbell Squat',     weight: 70, reps: 8, rpe: 5, numSets: 3 },
                { name: 'Romanian Deadlift', weight: 70, reps: 8, rpe: 5, numSets: 3 },
            ]},
            { daysAgo: 0, workouts: [
                { name: 'Barbell Bench Press', weight: 60, reps: 8, rpe: 5, numSets: 3 },
                { name: 'Overhead Press',      weight: 40, reps: 8, rpe: 5, numSets: 3 },
            ]},
        ])

        // T3-07: Peak week (very heavy, RPE 10, low reps)
        fullSessionTest('Peak Week', 7, [
            { daysAgo: 7, workouts: [{ name: 'Barbell Squat',       weight: 150, reps: 2, rpe: 10, numSets: 5 }] },
            { daysAgo: 5, workouts: [{ name: 'Barbell Bench Press', weight: 130, reps: 2, rpe: 10, numSets: 5 }] },
            { daysAgo: 3, workouts: [{ name: 'Deadlift',            weight: 180, reps: 2, rpe: 10, numSets: 4 }] },
            { daysAgo: 1, workouts: [{ name: 'Overhead Press',      weight: 80,  reps: 2, rpe: 10, numSets: 5 }] },
        ], 'active')

        // T3-08: Bodyweight-only week
        fullSessionTest('Bodyweight Only Week', 8, [
            { daysAgo: 6, workouts: [
                { name: 'Pull Ups', weight: 0, reps: 10, rpe: 7, numSets: 4 },
                { name: 'Dips',     weight: 0, reps: 12, rpe: 7, numSets: 4 },
                { name: 'Plank',    weight: 0, reps: 30, rpe: 6, numSets: 3 },
            ]},
            { daysAgo: 3, workouts: [
                { name: 'Pull Ups', weight: 0, reps: 10, rpe: 7, numSets: 4 },
                { name: 'Dips',     weight: 0, reps: 12, rpe: 7, numSets: 4 },
                { name: 'Plank',    weight: 0, reps: 30, rpe: 6, numSets: 3 },
            ]},
            { daysAgo: 0, workouts: [
                { name: 'Pull Ups', weight: 0, reps: 10, rpe: 7, numSets: 4 },
                { name: 'Dips',     weight: 0, reps: 12, rpe: 7, numSets: 4 },
                { name: 'Plank',    weight: 0, reps: 30, rpe: 6, numSets: 3 },
            ]},
        ])

        // T3-09: Gymrat high volume (6 days, gymrat activity level)
        fullSessionTest('Gymrat High Volume', 9, [
            { daysAgo: 5, workouts: [
                { name: 'Barbell Bench Press', weight: 100, reps: 5,  rpe: 8, numSets: 5 },
                { name: 'Incline DB Press',    weight: 35,  reps: 8,  rpe: 8, numSets: 4 },
                { name: 'Overhead Press',      weight: 65,  reps: 8,  rpe: 8, numSets: 4 },
            ]},
            { daysAgo: 4, workouts: [
                { name: 'Pull Ups',      weight: 0,  reps: 8,  rpe: 8, numSets: 5 },
                { name: 'Bent Over Row', weight: 90, reps: 8,  rpe: 8, numSets: 5 },
                { name: 'Lat Pulldown',  weight: 75, reps: 10, rpe: 8, numSets: 4 },
            ]},
            { daysAgo: 3, workouts: [
                { name: 'Barbell Squat',     weight: 130, reps: 5,  rpe: 8, numSets: 5 },
                { name: 'Romanian Deadlift', weight: 110, reps: 8,  rpe: 8, numSets: 4 },
                { name: 'Leg Press',         weight: 160, reps: 10, rpe: 8, numSets: 4 },
            ]},
            { daysAgo: 2, workouts: [
                { name: 'Barbell Bench Press', weight: 100, reps: 5,  rpe: 8, numSets: 5 },
                { name: 'Incline DB Press',    weight: 35,  reps: 8,  rpe: 8, numSets: 4 },
                { name: 'Cable Fly',           weight: 25,  reps: 12, rpe: 8, numSets: 4 },
            ]},
            { daysAgo: 1, workouts: [
                { name: 'Pull Ups',      weight: 0,  reps: 8,  rpe: 8, numSets: 5 },
                { name: 'Bent Over Row', weight: 90, reps: 8,  rpe: 8, numSets: 5 },
                { name: 'Barbell Curl',  weight: 45, reps: 10, rpe: 8, numSets: 4 },
            ]},
            { daysAgo: 0, workouts: [
                { name: 'Barbell Squat', weight: 130, reps: 5,  rpe: 8, numSets: 5 },
                { name: 'Deadlift',      weight: 150, reps: 5,  rpe: 8, numSets: 4 },
                { name: 'Leg Press',     weight: 160, reps: 10, rpe: 8, numSets: 4 },
            ]},
        ], 'gymrat')

        // T3-10: Sedentary / light week (machines, RPE 6)
        fullSessionTest('Sedentary Light Week', 10, [
            { daysAgo: 3, workouts: [
                { name: 'Chest Press Machine', weight: 60,  reps: 10, rpe: 6, numSets: 3 },
                { name: 'Leg Press',           weight: 100, reps: 10, rpe: 6, numSets: 3 },
            ]},
            { daysAgo: 0, workouts: [
                { name: 'Chest Press Machine', weight: 60, reps: 10, rpe: 6, numSets: 3 },
                { name: 'Cable Row',           weight: 60, reps: 10, rpe: 6, numSets: 3 },
            ]},
        ], 'sedentary')

        // T3-11: 9-day accumulated load (heavy session every day)
        fullSessionTest(
            'Accumulated 9-Day Load',
            11,
            Array.from({ length: 9 }, (_, i) => ({
                daysAgo: 8 - i,
                workouts: [
                    { name: 'Barbell Bench Press', weight: 100, reps: 5, rpe: 8, numSets: 3 },
                    { name: 'Barbell Squat',       weight: 120, reps: 5, rpe: 8, numSets: 3 },
                    { name: 'Deadlift',            weight: 140, reps: 5, rpe: 8, numSets: 2 },
                ],
            })),
            'active',
        )

        // T3-12: Sporadic week (sessions on day 8, day 3, and today)
        fullSessionTest('Sporadic Week', 12, [
            { daysAgo: 8, workouts: [
                { name: 'Barbell Bench Press', weight: 100, reps: 5, rpe: 8, numSets: 4 },
                { name: 'Barbell Squat',       weight: 120, reps: 5, rpe: 8, numSets: 4 },
                { name: 'Deadlift',            weight: 140, reps: 5, rpe: 8, numSets: 3 },
            ]},
            { daysAgo: 3, workouts: [
                { name: 'Barbell Bench Press', weight: 100, reps: 5, rpe: 8, numSets: 4 },
                { name: 'Barbell Squat',       weight: 120, reps: 5, rpe: 8, numSets: 4 },
                { name: 'Deadlift',            weight: 140, reps: 5, rpe: 8, numSets: 3 },
            ]},
            { daysAgo: 0, workouts: [
                { name: 'Barbell Bench Press', weight: 100, reps: 5, rpe: 8, numSets: 4 },
                { name: 'Barbell Squat',       weight: 120, reps: 5, rpe: 8, numSets: 4 },
                { name: 'Deadlift',            weight: 140, reps: 5, rpe: 8, numSets: 3 },
            ]},
        ])
    })
})
