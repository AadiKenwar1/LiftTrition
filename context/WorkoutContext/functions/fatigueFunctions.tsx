import { EQUIPMENT_FATIGUE_FACTORS, MUSCLE_FATIGUE_FACTORS } from '../exerciseLibrary/constants'
import { Exercise, ExerciseLib, Log } from '../types'
import { estimate1RM, oneRMMap } from './oneRepMaxFunctions'

// Daily fatigue "budget" by activity level (100% ≈ a hard day).
const DAILY_BUDGETS: Record<string, number> = {
    sedentary: 11,
    light: 13,
    moderate: 15,
    active: 17,
    gymrat: 19,
}

//Activity multipliers for fatigue calculation
const FREQUENCY_MULTIPLIERS: Record<string, number> = {
    sedentary: 0.966,
    light: 0.95,
    moderate: 0.933,
    active: 0.9,
    gymrat: 0.85,
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

//Calculate fatigue for a single set
function calculateSetFatigue(log: Log, exerciseName: string, fatigueFactor: number, frequencyMultiplier: number, refByName: Map<string, number>): number {
    const refMax = refByName.get(exerciseName) ?? 0
    const estimatedMax = estimate1RM(log.weight, log.reps)

    // Best recent e1RM for this lift name (last 30 days); max with this set's e1RM handles
    // missing/low rolling ref (sparse lifts, rename/keying), not “no fatigue sets.”
    const currentMax = Math.max(refMax, estimatedMax)
    if (currentMax === 0) return 0

    // Adjusted Epley-style set score:
    //   (w / 1RM) * (1 + reps/30)
    // scaled by perceived effort (RPE), exercise fatigue factor, and activity multiplier.
    const defaultRPE = 7
    const rpeScale = (log.rpe || defaultRPE) / 10
    const base = (log.weight / currentMax) * (1 + log.reps / 30)
    return base * rpeScale * fatigueFactor * frequencyMultiplier
}

export type FatigueSummary = {
    today: number
    last3Days: number
    last6Days: number
    last9Days: number
}

//Calculate fatigue summary (today/3/6/9-day)
export function calculateFatigueSummary(logs: Log[], exercises: Exercise[], fullExerciseLib: ExerciseLib, activityLevel: string = 'moderate', refByName?: Map<string, number>): FatigueSummary {
    if (logs.length === 0) return { today: 0, last3Days: 0, last6Days: 0, last9Days: 0 }

    const DAYS = 30

    const localRefByName = refByName ?? oneRMMap(exercises, logs, DAYS)
    const frequencyMultiplier = FREQUENCY_MULTIPLIERS[activityLevel] || 0.933
    const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]))
    const dailyBudget = getDailyBudget(activityLevel)

    const todayStart = getStartOfDay(new Date())
    const cutoff1 = addDays(todayStart, -1)
    const cutoff3 = addDays(todayStart, -3)
    const cutoff6 = addDays(todayStart, -6)
    const cutoff9 = addDays(todayStart, -9)

    let t1 = 0
    let t3 = 0
    let t6 = 0
    let t9 = 0

    for (const log of logs) {
        if (log.reps <= 0 || log.weight <= 0) continue
        if (log.date < cutoff9) continue

        const exercise = exerciseMap.get(log.exerciseID)
        if (!exercise) continue
        const exerciseDef = fullExerciseLib[exercise.name]
        if (!exerciseDef?.fatigueFactor) continue

        const setFatigue = calculateSetFatigue(log, exercise.name, exerciseDef.fatigueFactor, frequencyMultiplier, localRefByName)
        if (setFatigue === 0) continue

        if (log.date >= cutoff1) {
            t1 += setFatigue
            t3 += setFatigue
            t6 += setFatigue
            t9 += setFatigue
        } else if (log.date >= cutoff3) {
            t3 += setFatigue
            t6 += setFatigue
            t9 += setFatigue
        } else if (log.date >= cutoff6) {
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
        return 'Intense workout today! Make sure you get some good rest tonight.'
    }
    if (percentage >= 75) {
        return 'Nice work today. You pushed pretty hard! Make sure you recover well.'
    }
    if (percentage >= 50) {
        return "Good session today. You're putting in solid work."
    }
    if (percentage >= 25) {
        return 'Nice light session today. Good chance to work on form and keep things moving.'
    }
    if (percentage > 0) {
        return 'Light work today, but it all adds up. Staying consistent is what matters.'
    }
    return "No training today so far. If today is a rest day, that's great!"
}

//Calculate fatigue factor for user added exercise
export function calculateFatigueFactor(isCompound: boolean, mainMuscle: string, accessoryMuscles: string[], equipment: string): number {
    const baseFatigue = isCompound ? 0.7 : 0.5
    const mainMuscleFatigue = MUSCLE_FATIGUE_FACTORS[mainMuscle] || 0.08
    const accessoryFatigue =
        accessoryMuscles.length > 0 ?
            Math.min(
                accessoryMuscles.reduce((total, muscle) => {
                    return total + (MUSCLE_FATIGUE_FACTORS[muscle] || 0.05) * 0.5
                }, 0),
                0.2,
            )
        :   0

    const equipmentFatigue = EQUIPMENT_FATIGUE_FACTORS[equipment] || 0.0
    const fatigue = baseFatigue + mainMuscleFatigue + accessoryFatigue + equipmentFatigue
    return Math.min(1.1, Math.max(0.5, parseFloat(fatigue.toFixed(2))))
}

//Calculate fatigue percentage for the last X days (legacy function, used for specific day fatigue calculation)
export function calculateFatiguePercentage(numDays: number, logs: Log[], exercises: Exercise[], fullExerciseLib: ExerciseLib, activityLevel: string = 'moderate', refByName?: Map<string, number>): number {
    if (logs.length === 0) return 0

    const localRefByName = refByName ?? oneRMMap(exercises, logs, 30)

    const frequencyMultiplier = FREQUENCY_MULTIPLIERS[activityLevel] || 0.933
    const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]))

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - numDays)

    let totalFatigue = 0

    for (const log of logs) {
        // Skip invalid logs
        if (log.reps <= 0 || log.weight <= 0) continue

        // Skip logs outside date range
        if (log.date < cutoffDate) continue

        //Get the exercise the log is for
        const exercise = exerciseMap.get(log.exerciseID)
        if (!exercise) continue

        //Find the exercises definition and get the fatigue factor
        const exerciseDef = fullExerciseLib[exercise.name]
        if (!exerciseDef?.fatigueFactor) continue

        totalFatigue += calculateSetFatigue(log, exercise.name, exerciseDef.fatigueFactor, frequencyMultiplier, localRefByName)
    }

    const dailyBudget = getDailyBudget(activityLevel) * numDays
    const percentage = (totalFatigue / dailyBudget) * 100

    return Math.max(0, percentage)
}
