import { addDays, getDateKey } from '@/lib/utils/dateHelper'
import type { Log } from '../../types'
import {
    applyProgression,
    getCalibrationMessage,
    getIndicatorState,
    getProgressionState,
    gradeSession,
    gradeSet,
    isGoalMet,
    score,
    type GradeReason,
    type ProgressionOptions,
} from '../progressionFunctions'

const EX = 'ex-1'
const TODAY = new Date(2026, 6, 25)
const LBS: ProgressionOptions = { weightUnit: 'lbs', isCompound: true, equipment: 'Barbell', bodyWeight: 180 }

function mockLog(overrides: Partial<Log> = {}): Log {
    return {
        id: 'log-1',
        userID: 'user-1',
        workoutID: 'workout-1',
        exerciseID: EX,
        date: TODAY,
        time: 1000,
        weight: 185,
        reps: 8,
        rpe: 0,
        createdAt: TODAY,
        updatedAt: TODAY,
        ...overrides,
    }
}

/** [daysAgo, weight, reps] — 0 means "logged today", which is what gets graded. */
type SetSpec = [number, number, number]

function buildLogs(sets: SetSpec[]): Log[] {
    return sets.map(([daysAgo, weight, reps], i) =>
        mockLog({ id: `log-${i}`, date: addDays(TODAY, -daysAgo), time: i, weight, reps })
    )
}

/** Resolves a history to its goal string plus the reason today's session counted, if it did. */
function run(sets: SetSpec[], overrides: Partial<ProgressionOptions> = {}) {
    const options = { ...LBS, ...overrides }
    const logs = buildLogs(sets)
    const state = getProgressionState(logs, EX, TODAY, options)
    const goal = state.goal ? `${state.goal.weight} × ${state.goal.reps}` : state.status

    let reason: GradeReason | null = null
    if (state.anchor && state.goal) {
        const todayKey = getDateKey(TODAY)
        const reasons = logs
            .filter((l) => getDateKey(l.date) === todayKey)
            .map((l) => gradeSet(l, state.goal!, state.anchor!, options))
        reason = reasons.find((r) => r !== 'miss') ?? (reasons.length > 0 ? 'miss' : null)
    }

    return { goal, reason, held: state.heldPrevSession, status: state.status }
}

/**
 * Every scenario from audit/progressFixes-scenarios.md plus the edge cases surfaced while designing
 * the engine. `opts` carries a default so its absence can't make Jest read the parameter as `done`
 * and time the test out.
 */
const CASES: [string, SetSpec[], string, GradeReason | null, Partial<ProgressionOptions>?][] = [
    ['1 · normal week-to-week progress',        [[3, 185, 8]],                              '185 × 9',   null],
    ['2 · hit 12 reps, weight goes up',         [[3, 185, 12]],                             '190 × 8',   null],
    // Now caught by the heavier-bar rule before the estimated-max comparison gets to it.
    ['3 · the 195×7 bug',                       [[3, 190, 7], [0, 195, 7]],                 '190 × 8',   'heavierBar'],
    ['4 · lighter, more reps, still stronger',  [[3, 190, 7], [0, 185, 10]],                '190 × 8',   'outWorked'],
    ['4b · and next session it follows you',    [[6, 190, 7], [3, 185, 10]],                '185 × 11',  null],
    ['5 · warmups logged',                      [[3, 135, 10], [3, 155, 8], [3, 190, 8]],   '190 × 9',   null],
    ['6 · first time doing an exercise',        [],                                         'firstTime', null],
    ['7 · one bad day, bar holds',              [[6, 190, 8], [3, 135, 10]],                '190 × 9',   null],
    ['8 · two bad days, app believes you',      [[6, 135, 10], [3, 135, 10]],               '135 × 11',  null],
    ['9 · failed weight jump',                  [[6, 185, 12], [3, 190, 5]],                '190 × 6',   null],
    ['10 · genuinely getting weaker',           [[6, 190, 8], [3, 190, 7]],                 '190 × 8',   null],
    ['11 · deliberate deload, nudges once',     [[6, 225, 10], [3, 185, 8]],                '225 × 11',  null],
    ['12 · max double plus working sets',       [[3, 200, 2], [3, 185, 10]],                '185 × 11',  null],
    ['13 · heavier than planned, fewer reps',   [[6, 185, 12], [3, 195, 5]],                '195 × 6',   null],
    ['14 · two-plus weeks off',                 [[15, 190, 8]],                             'stale',     null],
    ['15 · trains every ~10 days',              [[20, 190, 8], [10, 190, 8]],               '190 × 9',   null],
    ['16 · burnout finisher after heavy work',  [[3, 225, 8], [3, 185, 20]],                '225 × 9',   null],
    ['17 · gaming the goal with 135×35',        [[3, 225, 8], [0, 135, 35]],                '225 × 9',   'miss'],
    ['18 · bodyweight, tie-break on reps',      [[6, 0, 9], [3, 0, 11]],                    '0 × 12',    null, { equipment: 'Bodyweight' }],
    ['19 · a zero-rep log',                     [[3, 190, 0]],                              'lowReps',   null],
    ['20 · only heavy doubles',                 [[3, 200, 2]],                              '200 × 3',   null],
    ['22 · trained twice in one day',           [[3, 185, 8], [3, 190, 6]],                 '190 × 7',   null],
    ['23 · two identical sets',                 [[3, 185, 8], [3, 185, 8]],                 '185 × 9',   null],
    ['24 · max single day stays invisible',     [[6, 190, 7], [3, 225, 1]],                 '190 × 8',   null],
    ['25 · jump day still celebrates',          [[3, 185, 12], [0, 190, 8]],                '190 × 8',   'suggestedSet'],
    ['E1 · 13th rep past the formula cap',      [[3, 170, 12], [0, 170, 13]],               '175 × 8',   'moreRepsSameBar'],
    ['E2 · exact repeat is not a beat',         [[3, 190, 7], [0, 190, 7]],                 '190 × 8',   'miss'],
    ['E3 · dead-even trade 185×8 vs 190×7',     [[3, 190, 7], [0, 185, 8]],                 '190 × 8',   'miss'],
    ['E4 · jump day overshot',                  [[3, 185, 12], [0, 195, 8]],                '190 × 8',   'suggestedSet'],
    ['E5 · heavy double beats a rep bar',       [[3, 190, 8], [0, 250, 2]],                 '190 × 9',   'outWorked'],
    ['E6 · submaximal single does not',         [[3, 190, 8], [0, 225, 1]],                 '190 × 9',   'miss'],
    ['E7 · singles-only lifter',                [[6, 225, 1], [3, 230, 1]],                 'lowReps',   null],
    ['E8 · doubles-only lifter',                [[6, 225, 2], [3, 230, 2]],                 '230 × 3',   null],
    ['E9 · bodyweight at the cap',              [[3, 0, 12], [0, 0, 13]],                   '5 × 8',     'moreRepsSameBar', { equipment: 'Bodyweight' }],
    ['E10 · bodyweight sick day, no hold',      [[6, 0, 12], [3, 0, 6]],                    '0 × 7',     null, { equipment: 'Bodyweight' }],
    ['E11 · only the last two sessions count',  [[6, 190, 8], [4, 135, 10], [3, 135, 10]],  '135 × 11',  null],
    ['E12 · belt plus bodyweight',              [[3, 0, 15], [3, 5, 3], [0, 0, 15]],        '5 × 4',     'outWorked', { equipment: 'Bodyweight' }],
    ['E13 · exactly 14 days out',               [[14, 190, 8]],                             '190 × 9',   null],
    ['E14 · isolation lift, 2.5 lb jumps',      [[3, 40, 12]],                              '42.5 × 8',  null, { isCompound: false }],
    ['E15 · kilograms, 2.5 kg jumps',           [[3, 100, 12]],                             '102.5 × 8', null, { weightUnit: 'kg' }],
    // The 2-rep fallback is all-or-nothing across the window, so a doubles-only DAY is skipped
    // outright whenever real working sets exist anywhere else in range.
    ['25 · doubles day skipped, working sets exist elsewhere', [[6, 200, 5], [3, 225, 1], [3, 225, 2]], '200 × 6', null],
    ['26 · off-day hold cannot reach past the window',         [[16, 225, 10], [3, 185, 8]],            '185 × 9', null],
    // Heavier bar, far fewer reps: less total work, so it misses — but it still becomes the bar
    // next session, because it's the heaviest set you showed.
    ['29 · heavier for three fewer reps misses today',        [[3, 195, 8], [0, 200, 5]],              '195 × 9', 'miss'],
    ['29b · …and next session follows you to 200',            [[6, 195, 8], [3, 200, 5]],              '200 × 6', null],
    // Estimated max puts 200×7 just 0.13% under a 195×8 bar — imperceptible, so the heavier-bar
    // rule takes it. Two reps down is a real drop and stays a miss.
    ['30 · heavier bar, one rep fewer',                       [[3, 195, 8], [0, 200, 7]],              '195 × 9', 'heavierBar'],
    ['30b · heavier bar, two reps fewer',                     [[3, 195, 8], [0, 200, 6]],              '195 × 9', 'miss'],
    ['E16 · bodyweight continues onto added weight',           [[3, 5, 8]],                             '5 × 9',   null, { equipment: 'Bodyweight' }],
    ['E17 · kilogram isolation, 1.25 kg jumps',                [[3, 20, 12]],                           '21.25 × 8', null, { weightUnit: 'kg', isCompound: false }],
]

describe('scenario matrix', () => {
    test.each(CASES)('%s', (_name, sets, expectedGoal, expectedReason, opts = {}) => {
        const got = run(sets, opts)
        expect(got.goal).toBe(expectedGoal)
        if (expectedReason !== null) expect(got.reason).toBe(expectedReason)
    })
})

describe('applyProgression', () => {
    test('adds a rep below the cap', () => {
        expect(applyProgression(185, 8, LBS)).toEqual({ weight: 185, reps: 9 })
    })

    test('bumps weight and drops reps at the cap', () => {
        expect(applyProgression(185, 12, LBS)).toEqual({ weight: 190, reps: 8 })
    })

    test('subtracts the range width above the cap rather than snapping to REP_RESET', () => {
        expect(applyProgression(185, 15, LBS)).toEqual({ weight: 190, reps: 11 })
    })

    test('uses a 2.5 lb increment for isolation lifts', () => {
        expect(applyProgression(40, 12, { ...LBS, isCompound: false })).toEqual({ weight: 42.5, reps: 8 })
    })

    test('uses 2.5 kg for compound and 1.25 kg for isolation', () => {
        expect(applyProgression(100, 12, { ...LBS, weightUnit: 'kg' })).toEqual({ weight: 102.5, reps: 8 })
        expect(applyProgression(20, 12, { ...LBS, weightUnit: 'kg', isCompound: false })).toEqual({ weight: 21.25, reps: 8 })
    })
})

describe('getProgressionState', () => {
    test('reports firstTime when the exercise has never been trained', () => {
        expect(run([]).status).toBe('firstTime')
    })

    test('reports stale when every session is outside the window', () => {
        expect(run([[15, 190, 8]]).status).toBe('stale')
    })

    test('reports lowReps when nothing in the window clears the hard floor', () => {
        expect(run([[3, 225, 1]]).status).toBe('lowReps')
    })

    test('ignores sets logged on the selected date', () => {
        expect(run([[3, 185, 8], [0, 225, 12]]).goal).toBe('185 × 9')
    })

    test('holds the previous session only when it is both heavier and stronger', () => {
        expect(run([[6, 190, 8], [3, 135, 10]]).held).toBe(true) // heavier and stronger — an off day
        expect(run([[6, 190, 7], [3, 185, 10]]).held).toBe(false) // heavier but weaker — a real choice
        expect(run([[6, 185, 12], [3, 190, 5]]).held).toBe(false) // lighter — a failed weight jump
        expect(run([[6, 190, 8], [3, 190, 7]]).held).toBe(false) // same bar — never holds
    })

    test('keeps a max-test-only day from becoming the last session', () => {
        expect(run([[6, 190, 7], [3, 225, 1]]).goal).toBe('190 × 8')
    })

    test('anchors on the heaviest set of a session, not the latest', () => {
        expect(run([[3, 190, 8], [3, 135, 10]]).goal).toBe('190 × 9')
    })

    test('ignores logs belonging to a different exercise', () => {
        const logs = [
            mockLog({ id: 'a', exerciseID: EX, date: addDays(TODAY, -3), weight: 185, reps: 8 }),
            mockLog({ id: 'b', exerciseID: 'ex-2', date: addDays(TODAY, -1), weight: 315, reps: 12 }),
        ]
        expect(getProgressionState(logs, EX, TODAY, LBS).goal).toEqual({ weight: 185, reps: 9 })
    })

    // The log date is user-selectable, so viewing an earlier day must not see the future.
    test('ignores sessions later than the selected date', () => {
        const logs = buildLogs([[4, 185, 8], [1, 225, 10]])
        expect(getProgressionState(logs, EX, addDays(TODAY, -2), LBS).goal).toEqual({ weight: 185, reps: 9 })
    })

    test('breaks a tie between identical sets on time, taking the later one', () => {
        const logs = buildLogs([[3, 185, 8], [3, 185, 8]])
        expect(getProgressionState(logs, EX, TODAY, LBS).anchor?.id).toBe('log-1')
    })
})

describe('gradeSession', () => {
    const session = (sets: SetSpec[]) => {
        const logs = buildLogs(sets)
        return gradeSession(logs, EX, TODAY, getProgressionState(logs, EX, TODAY, LBS), LBS)
    }

    // Asserts which set carried the session, deliberately not which rule fired — that's gradeSet's
    // business and this test shouldn't break when the grading rules change.
    test('counts a hit from any set in the session, not just the first', () => {
        const result = session([[3, 190, 7], [0, 135, 5], [0, 195, 7]])
        expect(result.hit).toBe(true)
        expect(result.log?.weight).toBe(195)
    })

    test('reports a miss when every set fell short', () => {
        expect(session([[3, 190, 7], [0, 135, 5], [0, 190, 7]])).toMatchObject({ hit: false, reason: 'miss', log: null })
    })

    test('reports a miss when there is no bar to grade against', () => {
        expect(session([[0, 185, 8]])).toMatchObject({ hit: false, reason: 'miss', log: null })
    })
})

describe('gradeSet', () => {
    const anchor = mockLog({ weight: 190, reps: 7 })
    const goal = { weight: 190, reps: 8 }

    test('counts the suggested set', () => {
        expect(gradeSet({ weight: 190, reps: 8 }, goal, anchor, LBS)).toBe('suggestedSet')
    })

    test('counts more reps on the same bar even past the formula cap', () => {
        const capped = mockLog({ weight: 170, reps: 12 })
        expect(gradeSet({ weight: 170, reps: 13 }, { weight: 175, reps: 8 }, capped, LBS)).toBe('moreRepsSameBar')
    })

    test('counts out-working the bar at a lighter weight', () => {
        expect(gradeSet({ weight: 185, reps: 10 }, goal, anchor, LBS)).toBe('outWorked')
    })

    test('counts a heavier bar at no more than one rep fewer', () => {
        expect(gradeSet({ weight: 195, reps: 7 }, goal, anchor, LBS)).toBe('heavierBar')
        expect(gradeSet({ weight: 195, reps: 6 }, goal, anchor, LBS)).toBe('heavierBar')
    })

    test('rejects a heavier bar once it costs two reps', () => {
        expect(gradeSet({ weight: 195, reps: 5 }, goal, anchor, LBS)).toBe('miss')
    })

    // Relative to the anchor, not an absolute rep floor: "5+ reps and heavier" would credit this.
    test('rejects a heavier bar that gives up most of a high-rep set', () => {
        const highRep = mockLog({ weight: 195, reps: 12 })
        expect(gradeSet({ weight: 200, reps: 5 }, { weight: 200, reps: 8 }, highRep, LBS)).toBe('miss')
    })

    test('does not let a heavier max single count against a doubles bar', () => {
        const doubles = mockLog({ weight: 200, reps: 2 })
        expect(gradeSet({ weight: 205, reps: 1 }, { weight: 200, reps: 3 }, doubles, LBS)).toBe('miss')
    })

    test('rejects an exact repeat — a tie is not a beat', () => {
        expect(gradeSet({ weight: 190, reps: 7 }, goal, anchor, LBS)).toBe('miss')
    })

    test('rejects a dead-even trade', () => {
        expect(gradeSet({ weight: 185, reps: 8 }, goal, anchor, LBS)).toBe('miss')
    })

    test('rejects a submaximal single', () => {
        expect(gradeSet({ weight: 225, reps: 1 }, goal, anchor, LBS)).toBe('miss')
    })

    test('rejects a light high-rep set once credit is capped', () => {
        const heavy = mockLog({ weight: 225, reps: 8 })
        expect(gradeSet({ weight: 135, reps: 35 }, { weight: 225, reps: 9 }, heavy, LBS)).toBe('miss')
    })

    test('still counts the suggested set on jump day, where it scores below the bar', () => {
        const atCap = mockLog({ weight: 185, reps: 12 })
        expect(score(190, 8, LBS)).toBeLessThan(score(185, 12, LBS))
        expect(gradeSet({ weight: 190, reps: 8 }, { weight: 190, reps: 8 }, atCap, LBS)).toBe('suggestedSet')
    })

    test('isGoalMet agrees with gradeSet', () => {
        expect(isGoalMet({ weight: 195, reps: 7 }, goal, anchor, LBS)).toBe(true)
        expect(isGoalMet({ weight: 190, reps: 7 }, goal, anchor, LBS)).toBe(false)
    })
})

describe('score', () => {
    test('stops crediting reps at 12', () => {
        expect(score(135, 35, LBS)).toBe(score(135, 12, LBS))
        expect(score(135, 13, LBS)).toBe(score(135, 12, LBS))
    })

    test('adds profile body weight for bodyweight equipment', () => {
        const bw: ProgressionOptions = { ...LBS, equipment: 'Bodyweight', bodyWeight: 180 }
        expect(score(0, 10, bw)).toBe(score(180, 10, LBS))
        expect(score(5, 10, bw)).toBe(score(185, 10, LBS))
    })

    test('falls back to raw reps when there is no load to score', () => {
        const unset: ProgressionOptions = { ...LBS, equipment: 'Bodyweight', bodyWeight: 0 }
        expect(score(0, 11, unset)).toBe(11)
    })

    test('ranks a weighted set above a bodyweight one only when it is genuinely more work', () => {
        const bw: ProgressionOptions = { ...LBS, equipment: 'Bodyweight', bodyWeight: 180 }
        expect(score(5, 12, bw)).toBeGreaterThan(score(0, 15, bw))
        expect(score(5, 3, bw)).toBeLessThan(score(0, 15, bw))
    })
})

describe('getIndicatorState', () => {
    const state = (sets: SetSpec[], overrides: Partial<ProgressionOptions> = {}) =>
        getIndicatorState(buildLogs(sets), EX, TODAY, { ...LBS, ...overrides })

    test('shows today’s target when there is a bar and it has not been beaten', () => {
        expect(state([[3, 190, 7]])).toMatchObject({ goal: { weight: 190, reps: 8 }, view: 'today', status: 'coached' })
    })

    test('advances to the next session once the target is beaten', () => {
        expect(state([[3, 190, 7], [0, 190, 8]])).toMatchObject({ goal: { weight: 190, reps: 9 }, view: 'hit' })
    })

    test('advances when a beat came from out-working the bar rather than matching it', () => {
        expect(state([[3, 190, 7], [0, 195, 7]])).toMatchObject({ goal: { weight: 195, reps: 8 }, view: 'hit' })
    })

    test('holds today’s target when the day’s sets missed', () => {
        expect(state([[3, 190, 7], [0, 190, 7]])).toMatchObject({ goal: { weight: 190, reps: 8 }, view: 'today' })
    })

    // A preview looks ahead for the same reason a hit does, but must not claim a goal was beaten.
    test('previews the next session on the first day an exercise is logged', () => {
        expect(state([[0, 185, 8]])).toMatchObject({ goal: { weight: 185, reps: 9 }, view: 'preview' })
    })

    test('previews the next session after a layoff, once a set is logged', () => {
        expect(state([[20, 190, 8], [0, 185, 8]])).toMatchObject({ goal: { weight: 185, reps: 9 }, view: 'preview' })
    })

    test('stays on the calibration prompt when nothing has been logged today', () => {
        expect(state([])).toMatchObject({ goal: null, view: 'today', status: 'firstTime' })
        expect(state([[20, 190, 8]])).toMatchObject({ goal: null, view: 'today', status: 'stale' })
    })

    test('reports the look-ahead status when today only produced sub-floor sets', () => {
        expect(state([[0, 225, 1]])).toMatchObject({ goal: null, view: 'preview', status: 'lowReps' })
    })
})

describe('getCalibrationMessage', () => {
    test('returns one message per no-bar state', () => {
        expect(getCalibrationMessage('firstTime')).toBe('Log a set to start getting suggestions.')
        expect(getCalibrationMessage('stale')).toBe('Been a while — log a set to reset your bar.')
        expect(getCalibrationMessage('lowReps')).toBe('Log a set of 2+ reps to get a suggestion.')
    })

    test('returns null once there is a bar', () => {
        expect(getCalibrationMessage('coached')).toBeNull()
    })
})
