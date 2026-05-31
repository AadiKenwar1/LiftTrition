import { getDateKey } from '@/lib/utils/dateHelper'
import { EQUIPMENT_FATIGUE_FACTORS, MUSCLE_FATIGUE_FACTORS } from '../exerciseLibrary/constants'
import { Exercise, ExerciseLib, Log } from '../types'
import { estimate1RM } from './oneRepMaxFunctions'

// Daily fatigue "budget" by activity level (100% ≈ a hard day).
const DAILY_BUDGETS: Record<string, number> = {
    sedentary: 8,
    light: 9,
    moderate: 10,
    active: 11,
    gymrat: 12,
}

function getDailyBudget(activityLevel: string): number {
    return DAILY_BUDGETS[activityLevel] ?? 15
}

//Get the start of a day
function getStartOfDay(d: Date) {
    const copy = new Date(d)
    copy.setHours(0, 0, 0, 0)
    return copy
}

//Add days to a date
function addDays(d: Date, deltaDays: number) {
    const copy = new Date(d)
    copy.setDate(copy.getDate() + deltaDays)
    return copy
}

// Returns the user's body weight on the date of a given log, using the closest
// prior entry in bwProgress. Falls back to currentBodyWeight if no entry exists.
function bwOnDate(bwProgress: Record<string, number>, date: Date, currentBodyWeight: number): number {
    const logKey = getDateKey(date)
    const sorted = Object.keys(bwProgress).sort()
    let result = currentBodyWeight
    for (const key of sorted) {
        if (key <= logKey) result = bwProgress[key]
        else break
    }
    return result
}

// Resolves the effective load for a set. Bodyweight exercises use the user's
// body weight at the time of the log plus any added weight (e.g. belt/vest).
function effectiveLoad(loggedWeight: number, equipment: string | undefined, bodyWeightAtTime: number): number {
    if (equipment === 'Bodyweight') return bodyWeightAtTime + loggedWeight
    return loggedWeight
}

//Calculate fatigue for a single set (activity level affects only daily budget, not per-set score)
function calculateSetFatigue(weight: number, reps: number, rpe: number, exerciseName: string, fatigueFactor: number, refByName: Map<string, number>): number {
    const refMax = refByName.get(exerciseName) ?? 0
    const estimatedMax = estimate1RM(weight, reps)

    // Best recent e1RM for this lift name (last 30 days); max with this set's e1RM handles
    // missing/low rolling ref (sparse lifts, rename/keying), not "no fatigue sets."
    const currentMax = Math.max(refMax, estimatedMax)
    if (currentMax === 0) return 0

    // Adjusted Epley-style set score:
    //   (w / 1RM) * (1 + reps/30)
    // scaled by perceived effort (RPE) and exercise fatigue factor.
    const defaultRPE = 7
    const rpeScale = (rpe || defaultRPE) / 10
    const base = (weight / currentMax) * (1 + reps / 30)
    return base * rpeScale * fatigueFactor
}

// Builds a bodyweight-aware rolling 1RM reference map (exercise name → max e1RM over last refDays).
// Uses effective load so the ref and the formula always use identical weights.
function buildRefByName(logs: Log[], exercises: Exercise[], fullExerciseLib: ExerciseLib, refDays: number, currentBodyWeight: number, bwProgress: Record<string, number>): Map<string, number> {
    const refCutoff = addDays(new Date(), -refDays)
    const idToName = new Map(exercises.map((e) => [e.id, e.name]))
    const map = new Map<string, number>()

    for (const log of logs) {
        if (log.reps <= 0 || log.weight < 0) continue
        if (getStartOfDay(log.date) < getStartOfDay(refCutoff)) continue

        const name = idToName.get(log.exerciseID)
        if (!name) continue

        const def = fullExerciseLib[name]
        const bwAtTime = bwOnDate(bwProgress, log.date, currentBodyWeight)
        const w = effectiveLoad(log.weight, def?.equipment, bwAtTime)
        if (w <= 0) continue

        const e1 = estimate1RM(w, log.reps)
        if (e1 <= 0) continue

        const prev = map.get(name) ?? 0
        if (e1 > prev) map.set(name, e1)
    }

    return map
}

export type FatigueSummary = {
    today: number
    last3Days: number
    last6Days: number
    last9Days: number
}

//Calculate fatigue summary (today/3/6/9-day)
export function calculateFatigueSummary(logs: Log[], exercises: Exercise[], fullExerciseLib: ExerciseLib, activityLevel: string = 'moderate', currentBodyWeight: number, bwProgress: Record<string, number>): FatigueSummary {
    if (logs.length === 0) return { today: 0, last3Days: 0, last6Days: 0, last9Days: 0 }

    const DAYS = 30

    const localRefByName = buildRefByName(logs, exercises, fullExerciseLib, DAYS, currentBodyWeight, bwProgress)
    const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]))
    const dailyBudget = getDailyBudget(activityLevel)

    const todayStart = getStartOfDay(new Date())
    // Calendar-day windows (inclusive):
    // - today: today only
    // - last3Days: today + previous 2 days
    // - last6Days: today + previous 5 days
    // - last9Days: today + previous 8 days
    const cutoff1 = todayStart
    const cutoff3 = addDays(todayStart, -2)
    const cutoff6 = addDays(todayStart, -5)
    const cutoff9 = addDays(todayStart, -8)

    let t1 = 0
    let t3 = 0
    let t6 = 0
    let t9 = 0

    for (const log of logs) {
        if (log.reps <= 0 || log.weight < 0) continue
        const logDay = getStartOfDay(log.date)
        if (logDay < cutoff9) continue

        const exercise = exerciseMap.get(log.exerciseID)
        if (!exercise) continue
        const exerciseDef = fullExerciseLib[exercise.name]
        if (!exerciseDef?.fatigueFactor) continue

        const bwAtTime = bwOnDate(bwProgress, log.date, currentBodyWeight)
        const w = effectiveLoad(log.weight, exerciseDef.equipment, bwAtTime)
        if (w <= 0) continue

        const setFatigue = calculateSetFatigue(w, log.reps, log.rpe, exercise.name, exerciseDef.fatigueFactor, localRefByName)
        if (setFatigue === 0) continue

        if (logDay >= cutoff1) {
            t1 += setFatigue
            t3 += setFatigue
            t6 += setFatigue
            t9 += setFatigue
        } else if (logDay >= cutoff3) {
            t3 += setFatigue
            t6 += setFatigue
            t9 += setFatigue
        } else if (logDay >= cutoff6) {
            t6 += setFatigue
            t9 += setFatigue
        } else {
            t9 += setFatigue
        }
    }

    return {
        today: Math.max(0, (t1 / (dailyBudget * 1)) * 100),
        last3Days: Math.max(0, (t3 / (dailyBudget * 3)) * 100),
        last6Days: Math.max(0, (t6 / (dailyBudget * 6)) * 100),
        last9Days: Math.max(0, (t9 / (dailyBudget * 9)) * 100),
    }
}

// Returns a casual feedback message based on fatigue percentage
export function getFatigueFeedback(percentage: number): string {
    if (percentage >= 100) {
        return 'You went all out today🔥! Recover hard tonight.'
    }
    if (percentage >= 75) {
        return 'Heavy day logged💪. Great work! Make sure to prioritize recovery.'
    }
    if (percentage >= 50) {
        return 'Strong day logged⚡. Push a little more or call it a win, your choice'
    }
    if (percentage >= 25) {
        return 'Solid day logged🏋️. Add more if you want, or stay the course.'
    }
    if (percentage > 0) {
        return 'Light day logged🧘. Easy day to focus on form or add more later.'
    }
    return '📋 No sets logged today. Fatigue shows how demanding your training was.'
}

//Calculate fatigue factor for an exercise
export function calculateFatigueFactor(isCompound: boolean, mainMuscle: string, equipment: string): number {
    const baseFatigue = isCompound ? 0.75 : 0.47
    const mainMuscleFatigue = MUSCLE_FATIGUE_FACTORS[mainMuscle] || 0.08
    const equipmentFatigue = EQUIPMENT_FATIGUE_FACTORS[equipment] || 0.0
    const fatigue = baseFatigue + mainMuscleFatigue + equipmentFatigue
    return Math.min(1.1, Math.max(0.5, parseFloat(fatigue.toFixed(2))))
}

//Calculate fatigue percentage for the last X days (legacy function, used for specific day fatigue calculation)
export function calculateFatiguePercentage(numDays: number, logs: Log[], exercises: Exercise[], fullExerciseLib: ExerciseLib, activityLevel: string = 'moderate', currentBodyWeight: number, bwProgress: Record<string, number>): number {
    if (logs.length === 0) return 0

    const localRefByName = buildRefByName(logs, exercises, fullExerciseLib, 30, currentBodyWeight, bwProgress)
    const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]))

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - numDays)

    let totalFatigue = 0

    for (const log of logs) {
        if (log.reps <= 0 || log.weight < 0) continue
        if (log.date < cutoffDate) continue

        const exercise = exerciseMap.get(log.exerciseID)
        if (!exercise) continue

        const exerciseDef = fullExerciseLib[exercise.name]
        if (!exerciseDef?.fatigueFactor) continue

        const bwAtTime = bwOnDate(bwProgress, log.date, currentBodyWeight)
        const w = effectiveLoad(log.weight, exerciseDef.equipment, bwAtTime)
        if (w <= 0) continue

        totalFatigue += calculateSetFatigue(w, log.reps, log.rpe, exercise.name, exerciseDef.fatigueFactor, localRefByName)
    }

    const dailyBudget = getDailyBudget(activityLevel) * numDays
    const percentage = (totalFatigue / dailyBudget) * 100

    return Math.max(0, percentage)
}
