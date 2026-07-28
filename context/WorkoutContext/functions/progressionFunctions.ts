import { addDays, getDateKey } from '@/lib/utils/dateHelper'
import type { Log } from '../types'
import { estimate1RM } from './oneRepMaxFunctions'

/**
 * Progressive-overload suggestions, derived entirely from log history.
 *
 * The framing is "beat last session", not coaching: the bar is a set the user actually performed,
 * and the suggestion is one concrete way to beat it — never an instruction they have to follow.
 * Nothing is persisted, so edits and back-fills recalculate cleanly and no stored goal can desync
 * from the logs.
 */

// Working-set floor. Below this a set reads as a max test, not training volume, so it can't become
// the bar — otherwise a grindy single would prescribe a max double next session.
export const MIN_REPS = 3

// Universal safety net for lifters who never clear MIN_REPS. Singles still never anchor: +1 rep off
// a single is a 6.7% jump, where every other +1 rep in the range is under 3%.
export const HARD_FLOOR = 2

// Top of the rep range — reach it and the weight goes up instead of the reps.
export const REP_CAP = 12

// Where reps land after a weight jump.
export const REP_RESET = 8

// Older than this and we ask for a fresh baseline rather than guessing from stale numbers.
export const WINDOW_DAYS = 14

/**
 * Epley loses accuracy past ~12 reps and will score a light burnout set above heavy work.
 * Deliberately applied here at the call site rather than inside `estimate1RM`, which is shared with
 * the strength graph — capping there would visibly move existing users' charts.
 */
export const FORMULA_REP_CAP = 12

export type DailyGoal = {
    weight: number
    reps: number
}

export type ProgressionOptions = {
    weightUnit: 'lbs' | 'kg'
    /** From the exercise library entry. 'Bodyweight' switches on body-weight-aware scoring. */
    equipment?: string
    /** Profile body weight, only read for Bodyweight equipment. */
    bodyWeight?: number
}

/** Why there is no bar yet — each maps to its own line of copy. */
export type ProgressionStatus = 'coached' | 'firstTime' | 'stale' | 'lowReps'

export type ProgressionState = {
    /** The set to beat: a real log the user performed, never a synthesized number. */
    anchor: Log | null
    /** One concrete way to beat the anchor. Null whenever there is no anchor. */
    goal: DailyGoal | null
    status: ProgressionStatus
    /** True when an off day was ignored and the session before it held the bar. */
    heldPrevSession: boolean
}

/** Which rule counted the set. 'miss' means none of them did. */
export type GradeReason = 'suggestedSet' | 'moreRepsSameBar' | 'heavierBar' | 'outWorked' | 'miss'

/**
 * Jump sizes, keyed by how heavy the lift already is rather than by the exercise.
 *
 * Racks and plate trees change step size as they get heavier: lb dumbbells run in 2.5s up to about
 * 25 lb and in 5s above, kg dumbbells in 2s up to about 20 kg and 2.5s above. Following the weight
 * therefore names a number the gym can actually make, which following compound-vs-isolation did
 * not — that split asked for half a plate per side (1.25 lb, or 0.625 kg) and for dumbbells like
 * 32.5 lb that no rack carries.
 *
 * An empty bar is 45 lb / 20 kg, so a barbell always lands at or above the boundary and always gets
 * a whole plate pair. The finer step below it can only ever apply to dumbbells and stacks.
 */
const INCREMENTS = {
    lbs: { boundary: 25, below: 2.5, atOrAbove: 5 },
    kg: { boundary: 20, below: 2, atOrAbove: 2.5 },
} as const

// Smallest jump we will ever prescribe from this weight. Tiered on the load actually being moved,
// not the number logged, so a weighted pull-up is treated as the ~180 lb lift it is rather than as
// a 0 lb one — otherwise a lifter adding their first belt plate would climb in 2.5s forever.
export function getWeightIncrement(weight: number, options: ProgressionOptions): number {
    const tier = INCREMENTS[options.weightUnit]
    return effectiveWeight(weight, options) < tier.boundary ? tier.below : tier.atOrAbove
}

// Trims float drift from repeated increments (2 + 2 + 2.5 + … in kg).
function roundWeight(weight: number): number {
    return Math.round(weight * 100) / 100
}

// Load actually moved by a set. Bodyweight exercises add the lifter's own weight to whatever was on
// the belt — mirrors `effectiveLoad` in fatigueFunctions.tsx.
function effectiveWeight(weight: number, options: ProgressionOptions): number {
    if (options.equipment === 'Bodyweight') return (options.bodyWeight ?? 0) + weight
    return weight
}

// Strength score used to compare two sets. Rep credit stops at FORMULA_REP_CAP so a light high-rep
// set can't out-score heavy work. Falls back to raw reps only when there is no load at all to
// score — an unconfigured bodyweight exercise, where reps are the sole signal.
export function score(weight: number, reps: number, options: ProgressionOptions): number {
    const load = effectiveWeight(weight, options)
    if (load <= 0) return reps
    return estimate1RM(load, Math.min(reps, FORMULA_REP_CAP))
}

// Ladder order: heavier bar wins, then more reps, then the later set. Fully deterministic so the
// same history always yields the same bar and the indicator never flip-flops between equal sets.
function heavier(a: Log, b: Log): Log {
    if (a.weight !== b.weight) return a.weight > b.weight ? a : b
    if (a.reps !== b.reps) return a.reps > b.reps ? a : b
    return a.time >= b.time ? a : b
}

// One rep more — or, at the top of the range, more weight and reps back down. Subtracting the range
// width rather than assigning REP_RESET keeps this sane when the anchor sits above the cap
// (185×15 → 190×11, not 190×3) and is identical to assignment when reps === REP_CAP.
export function applyProgression(weight: number, reps: number, options: ProgressionOptions): DailyGoal {
    if (reps < REP_CAP) {
        return { weight, reps: reps + 1 }
    }
    return {
        weight: roundWeight(weight + getWeightIncrement(weight, options)),
        reps: reps - (REP_CAP - REP_RESET),
    }
}

/**
 * Resolves the bar and the suggestion from log history alone. Today's own sets never count toward
 * today's bar, which is why a brand-new exercise has no suggestion even after the first set is
 * logged — there is nothing behind it yet.
 */
export function getProgressionState(logs: Log[], exerciseId: string, selectedDate: Date, options: ProgressionOptions): ProgressionState {
    const empty = (status: ProgressionStatus): ProgressionState => ({ anchor: null, goal: null, status, heldPrevSession: false })

    const selectedKey = getDateKey(selectedDate)
    const cutoffKey = getDateKey(addDays(selectedDate, -WINDOW_DAYS))

    const priorLogs = logs.filter((log) => log.exerciseID === exerciseId && getDateKey(log.date) < selectedKey)
    if (priorLogs.length === 0) return empty('firstTime')

    const inWindow = priorLogs.filter((log) => getDateKey(log.date) >= cutoffKey)
    if (inWindow.length === 0) return empty('stale')

    // Prefer real working sets. Fall back to the hard floor only when there are none, so a lifter
    // who trains in doubles gets coached instead of stranded on a calibration message forever.
    const working = inWindow.filter((log) => log.reps >= MIN_REPS)
    const pool = working.length > 0 ? working : inWindow.filter((log) => log.reps >= HARD_FLOOR)
    if (pool.length === 0) return empty('lowReps')

    // Session days come from the pool, not from all logs, so a day containing nothing but max tests
    // stays invisible rather than becoming "your last session".
    const days = [...new Set(pool.map((log) => getDateKey(log.date)))].sort()
    const lastKey = days[days.length - 1]
    const prevKey = days[days.length - 2]

    const last = pool.filter((log) => getDateKey(log.date) === lastKey).reduce(heavier)
    const prev = prevKey ? pool.filter((log) => getDateKey(log.date) === prevKey).reduce(heavier) : null

    // An off day is lighter AND less work. Weight alone would treat a lighter-but-stronger session
    // (185×10 after 190×7) as noise; score alone would re-ask a failed weight jump at full reps.
    const heldPrevSession =
        prev !== null && prev.weight > last.weight && score(prev.weight, prev.reps, options) > score(last.weight, last.reps, options)

    const anchor = heldPrevSession && prev !== null ? prev : last

    return {
        anchor,
        goal: applyProgression(anchor.weight, anchor.reps, options),
        status: 'coached',
        heldPrevSession,
    }
}

// Just the suggested set, for callers that don't need the bar or the reason there isn't one.
export function getDailyGoal(logs: Log[], exerciseId: string, selectedDate: Date, options: ProgressionOptions): DailyGoal | null {
    return getProgressionState(logs, exerciseId, selectedDate, options).goal
}

/**
 * Grades one set against the bar. Four ways to pass, each covering a case the others can't, ordered
 * most specific to most general so the reported reason is the most informative one:
 *
 *  - the suggested set — jump day, where the ask deliberately scores *lower* than the anchor
 *  - more reps on the same bar or heavier — a 13th rep the capped formula won't credit
 *  - a heavier bar at no more than one rep fewer — a real achievement the formula scores as a wash
 *  - out-working the bar outright — every weight/rep trade in between
 *
 * The heavier-bar rule exists because estimated max is too precise at the margin: against a 195×8
 * bar, 200×7 falls 0.13% short. Nobody perceives that, and refusing to credit added weight is the
 * same defect the whole rewrite set out to fix. It's deliberately relative to the anchor's reps
 * rather than an absolute floor — "5+ reps and heavier" would credit 200×5 against a 195×12 bar,
 * a 14% regression.
 *
 * Note there is no rep floor on grading, only on anchoring: a 205×1 counts against a 200×2 bar.
 * That is the case Epley handles worst — its `reps === 1` branch makes 1→2 a 6.66% step where every
 * other rep is under 3% — so "heavier bar, one rep off" is the more trustworthy signal down there,
 * and a single can never become the bar regardless.
 *
 * Strict `>` on the last branch, with no tolerance band: the reference is a set the user actually
 * performed, so blanket slack would forgive real regression and compound session over session.
 */
export function gradeSet(log: Pick<Log, 'weight' | 'reps'>, goal: DailyGoal, anchor: Log, options: ProgressionOptions): GradeReason {
    if (log.weight >= goal.weight && log.reps >= goal.reps) return 'suggestedSet'
    if (log.weight >= anchor.weight && log.reps > anchor.reps) return 'moreRepsSameBar'
    if (log.weight > anchor.weight && log.reps >= anchor.reps - 1) return 'heavierBar'
    if (score(log.weight, log.reps, options) > score(anchor.weight, anchor.reps, options)) return 'outWorked'
    return 'miss'
}

// Convenience predicate for callers that don't care which rule fired.
export function isGoalMet(log: Pick<Log, 'weight' | 'reps'>, goal: DailyGoal, anchor: Log, options: ProgressionOptions): boolean {
    return gradeSet(log, goal, anchor, options) !== 'miss'
}

/**
 * Whether any set logged on the selected date beat the bar. Per-set on purpose — the hit doesn't
 * have to come from the top set or the last one.
 */
export function gradeSession(
    logs: Log[],
    exerciseId: string,
    selectedDate: Date,
    state: ProgressionState,
    options: ProgressionOptions
): { hit: boolean; reason: GradeReason; log: Log | null } {
    if (!state.anchor || !state.goal) return { hit: false, reason: 'miss', log: null }

    const selectedKey = getDateKey(selectedDate)
    const todayLogs = logs.filter((log) => log.exerciseID === exerciseId && getDateKey(log.date) === selectedKey)

    for (const log of todayLogs) {
        const reason = gradeSet(log, state.goal, state.anchor, options)
        if (reason !== 'miss') return { hit: true, reason, log }
    }
    return { hit: false, reason: 'miss', log: null }
}

/**
 * What the indicator is showing. 'hit' and 'preview' both display the NEXT session's set — they
 * differ only in why: one is a target that was beaten, the other a day that never had one.
 */
export type IndicatorView = 'today' | 'hit' | 'preview'

export type IndicatorState = {
    status: ProgressionStatus
    /** The set to display, already resolved to the right session. Null when there's nothing yet. */
    goal: DailyGoal | null
    view: IndicatorView
}

/**
 * Everything the UI needs in one call: which set to show, and whether it's today's target or the
 * next session's. The look-ahead fires in two cases that are really the same case — the selected
 * day is settled, so there's nothing left to aim for on it. Either the target was beaten, or there
 * was no target and the set that creates one has now been logged.
 *
 * Centralised deliberately: this decision used to be re-derived by the caller and again by the
 * view, which meant three expressions had to agree about the same question.
 */
export function getIndicatorState(logs: Log[], exerciseId: string, selectedDate: Date, options: ProgressionOptions): IndicatorState {
    const state = getProgressionState(logs, exerciseId, selectedDate, options)
    const beatenToday = gradeSession(logs, exerciseId, selectedDate, state, options).hit

    const selectedKey = getDateKey(selectedDate)
    const loggedToday = logs.some((log) => log.exerciseID === exerciseId && getDateKey(log.date) === selectedKey)

    if (beatenToday || (state.goal === null && loggedToday)) {
        // Report the look-ahead's own status, so a day that only produced sub-floor sets still
        // explains itself rather than repeating the selected day's message.
        const next = getProgressionState(logs, exerciseId, addDays(selectedDate, 1), options)
        return { status: next.status, goal: next.goal, view: beatenToday ? 'hit' : 'preview' }
    }

    return { status: state.status, goal: state.goal, view: 'today' }
}

// Copy for each state where there is no bar to show yet.
export function getCalibrationMessage(status: ProgressionStatus): string | null {
    switch (status) {
        case 'firstTime':
            return 'Log a set to start getting suggestions.'
        case 'stale':
            return 'Been a while — log a set to reset your bar.'
        case 'lowReps':
            return 'Log a set of 2+ reps to get a suggestion.'
        default:
            return null
    }
}
