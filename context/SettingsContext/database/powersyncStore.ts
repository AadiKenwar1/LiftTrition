import type { SettingsRecord, WeightProgressRecord } from '@/lib/powersync/AppSchema'
import { powerSync } from '@/lib/powersync/system'
import { throwIfLoadFailureArmed } from '@/lib/devtools/forceLoadFailure'
import { throwIfSaveFailureArmed } from '@/lib/devtools/forceSaveFailure'
import { getDateKey, parseDateKey } from '@/lib/utils/dateHelper'
import { Settings } from '../types'

const defaultSettings: Settings = { onboardingComplete: false, onboardingCompletedAt: undefined, birthDate: new Date(), gender: 'male', height: 175, bodyWeight: 170, activityLevel: 'moderate', unitSystem: 'imperial', goalType: 'maintain', goalWeight: 190, goalPace: 0, calorieGoal: 2000, proteinGoal: 130, carbsGoal: 200, fatsGoal: 54 }

// Map DB row -> Settings
export function rowToSettings(row: SettingsRecord): Settings {
    return {
        onboardingComplete: !!row.onboarding_complete,
        onboardingCompletedAt: row.onboarding_completed_at ? parseDateKey(row.onboarding_completed_at) : undefined,
        birthDate: row.birth_date ? parseDateKey(row.birth_date) : new Date(),
        gender: (row.gender || 'male') as Settings['gender'],
        height: row.height ?? 175,
        bodyWeight: row.body_weight ?? 170,
        activityLevel: (row.activity_level === 'veryActive' ? 'gymrat' : row.activity_level || 'moderate') as Settings['activityLevel'],
        unitSystem: (row.unit_system || 'imperial') as Settings['unitSystem'],
        goalType: (row.goal_type || 'maintain') as Settings['goalType'],
        goalWeight: row.goal_weight ?? 190,
        goalPace: row.goal_pace ?? 0.5,
        calorieGoal: row.calorie_goal ?? 2000,
        proteinGoal: row.protein_goal ?? 130,
        carbsGoal: row.carbs_goal ?? 200,
        fatsGoal: row.fats_goal ?? 54,
    }
}

// Map Settings -> DB row
export function settingsToRow(s: Settings, userId: string) {
    return { user_id: userId, birth_date: getDateKey(s.birthDate), gender: s.gender, height: s.height, body_weight: s.bodyWeight, unit_system: s.unitSystem, activity_level: s.activityLevel, goal_type: s.goalType, goal_weight: s.goalWeight, goal_pace: s.goalPace, calorie_goal: s.calorieGoal, protein_goal: s.proteinGoal, carbs_goal: s.carbsGoal, fats_goal: s.fatsGoal, onboarding_complete: s.onboardingComplete ? 1 : 0, onboarding_completed_at: s.onboardingCompletedAt ? getDateKey(s.onboardingCompletedAt) : null }
}

// Load settings and body weight progress from PowerSync
export async function loadSettingsAndBw(userId: string): Promise<{ settings: Settings; bwProgress: Record<string, number>; hasData: boolean }> {
    if (__DEV__) await throwIfLoadFailureArmed('settings')

    // Load settings
    const settingsRows = (await powerSync.getAll('SELECT * FROM settings WHERE user_id = ?', [userId])) as SettingsRecord[]

    const hasData = settingsRows.length > 0
    const settings = hasData ? rowToSettings(settingsRows[0]) : defaultSettings

    // Load weight progress
    const weightRows = (await powerSync.getAll('SELECT * FROM weight_progress WHERE user_id = ? ORDER BY date ASC', [userId]    )) as WeightProgressRecord[]

    const bwProgress: Record<string, number> = {}
    for (const row of weightRows) {
        if (row.date && row.weight !== null) {
            bwProgress[row.date] = row.weight
        }
    }

    return { settings, bwProgress, hasData }
}

/**
 * Upsert the single settings row for a user.
 * Always exactly 1 DB op (UPDATE or INSERT).
 */
export async function upsertSettings(userId: string, settings: Settings): Promise<void> {
    if (__DEV__) await throwIfSaveFailureArmed('settings')
    const row = settingsToRow(settings, userId)
    await powerSync.writeTransaction(async (tx) => {
        const existing = (await tx.getAll('SELECT id FROM settings WHERE user_id = ?', [userId])) as SettingsRecord[]
        if (existing.length > 0) {
            await tx.execute(
                `UPDATE settings SET
                   birth_date = ?,
                   gender = ?,
                   height = ?,
                   body_weight = ?,
                   unit_system = ?,
                   activity_level = ?,
                   goal_type = ?,
                   goal_weight = ?,
                   goal_pace = ?,
                   calorie_goal = ?,
                   protein_goal = ?,
                   carbs_goal = ?,
                   fats_goal = ?,
                   onboarding_complete = ?,
                   onboarding_completed_at = ?,
                   updated_at = datetime('now')
                 WHERE user_id = ?`,
                [row.birth_date, row.gender, row.height, row.body_weight, row.unit_system, row.activity_level, row.goal_type, row.goal_weight, row.goal_pace, row.calorie_goal, row.protein_goal, row.carbs_goal, row.fats_goal, row.onboarding_complete, row.onboarding_completed_at, userId],
            )
        } else {
            await tx.execute(
                `INSERT INTO settings (
                   id, user_id, birth_date, gender, height, body_weight,
                   unit_system, activity_level, goal_type, goal_weight, goal_pace,
                   calorie_goal, protein_goal, carbs_goal, fats_goal,
                   onboarding_complete, onboarding_completed_at,
                   created_at, updated_at
                 )
                 VALUES (
                   uuid(), ?, ?, ?, ?, ?,
                   ?, ?, ?, ?, ?,
                   ?, ?, ?, ?,
                   ?, ?,
                   datetime('now'), datetime('now')
                 )`,
                [row.user_id, row.birth_date, row.gender, row.height, row.body_weight, row.unit_system, row.activity_level, row.goal_type, row.goal_weight, row.goal_pace, row.calorie_goal, row.protein_goal, row.carbs_goal, row.fats_goal, row.onboarding_complete, row.onboarding_completed_at],
            )
        }
    })
}

/**
 * Upsert a single weight_progress row for a specific date.
 * Always exactly 1 DB op (UPDATE or INSERT).
 */
export async function upsertWeightForDate(userId: string, dateKey: string, weight: number): Promise<void> {
    if (__DEV__) await throwIfSaveFailureArmed('settings')
    await powerSync.writeTransaction(async (tx) => {
        const existing = (await tx.getAll('SELECT id FROM weight_progress WHERE user_id = ? AND date = ?', [userId, dateKey])) as WeightProgressRecord[]
        if (existing.length > 0) {
            await tx.execute(
                `UPDATE weight_progress SET weight = ?, updated_at = datetime('now') WHERE user_id = ? AND date = ?`,
                [weight, userId, dateKey],
            )
        } else {
            await tx.execute(
                `INSERT INTO weight_progress (id, user_id, date, weight, created_at, updated_at)
                 VALUES (uuid(), ?, ?, ?, datetime('now'), datetime('now'))`,
                [userId, dateKey, weight],
            )
        }
    })
}
