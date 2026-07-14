import { getDateKey } from '@/lib/utils/dateHelper'
import type { Log } from '../types'

export type DailyGoal = {
    weight: number
    reps: number
}

export type ProgressionOptions = {
    weightUnit: 'lbs' | 'kg'
    isCompound: boolean
}

export const REP_CAP = 12
export const REP_RESET = 8

function getWeightIncrement(options: ProgressionOptions): number {
    if (options.weightUnit === 'kg') {
        return options.isCompound ? 2.5 : 1.25
    }
    return options.isCompound ? 5 : 2.5
}

function roundWeight(weight: number): number {
    return Math.round(weight * 100) / 100
}

export function applyProgression(weight: number, reps: number, options: ProgressionOptions): DailyGoal {
    if (reps < REP_CAP) {
        return { weight, reps: reps + 1 }
    }
    return {
        weight: roundWeight(weight + getWeightIncrement(options)),
        reps: REP_RESET,
    }
}

function pickBestSet(sessionLogs: Log[]): Log | null {
    if (sessionLogs.length === 0) return null

    return sessionLogs.reduce((best, log) => {
        if (log.weight > best.weight) return log
        if (log.weight < best.weight) return best
        if (log.reps > best.reps) return log
        if (log.reps < best.reps) return best
        return log.time >= best.time ? log : best
    })
}

export function getDailyGoal(logs: Log[], exerciseId: string, selectedDate: Date, options: ProgressionOptions): DailyGoal | null {
    const selectedKey = getDateKey(selectedDate)

    const priorLogs = logs.filter((log) => log.exerciseID === exerciseId && getDateKey(log.date) < selectedKey)
    if (priorLogs.length === 0) return null

    let lastSessionKey = ''
    for (const log of priorLogs) {
        const key = getDateKey(log.date)
        if (key > lastSessionKey) lastSessionKey = key
    }

    const lastSessionLogs = priorLogs.filter((log) => getDateKey(log.date) === lastSessionKey)
    const anchor = pickBestSet(lastSessionLogs)
    if (!anchor) return null

    return applyProgression(anchor.weight, anchor.reps, options)
}

export function isGoalMet(log: Log, goal: DailyGoal): boolean {
    return log.weight >= goal.weight && log.reps >= goal.reps
}

export function isGoalHitToday(logs: Log[], exerciseId: string, selectedDate: Date, goal: DailyGoal): boolean {
    const selectedKey = getDateKey(selectedDate)
    return logs.some((log) => log.exerciseID === exerciseId && getDateKey(log.date) === selectedKey && isGoalMet(log, goal))
}
