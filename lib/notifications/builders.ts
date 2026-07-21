import type { NutritionEntry, NutritionStreakState } from '@/lib/nutrition/types'
import { addDays, getDateKey } from '@/lib/utils/dateHelper'
import type { MealKey, NotificationPrefs, NotificationSpec } from './types'

export const MEAL_REMINDER_DAYS = 7
export const STREAK_MIN = 3
export const REENGAGEMENT_DAYS = 3
export const IOS_PENDING_LIMIT = 64

const MEAL_ORDER: MealKey[] = ['breakfast', 'lunch', 'dinner']

const MEAL_CONTENT: Record<MealKey, { title: string; body: string }> = {
    breakfast: { title: 'Log your breakfast', body: 'Start the day on track — add what you ate this morning.' },
    lunch: { title: 'Log your lunch', body: 'Keep the day going — add what you had for lunch.' },
    dinner: { title: 'Log your dinner', body: 'Close out the day — log your dinner in PLATES.' },
}

// Map an hour-of-day to its meal window (breakfast < 11, lunch < 16, dinner otherwise).
export function mealForHour(hour: number): MealKey {
    if (hour < 11) return 'breakfast'
    if (hour < 16) return 'lunch'
    return 'dinner'
}

// Determine which meals already have a logged entry today, keyed by the entry's time-of-day window.
export function getLoggedMealsForToday(entries: NutritionEntry[], now: Date): Record<MealKey, boolean> {
    const todayKey = getDateKey(now)
    const logged: Record<MealKey, boolean> = { breakfast: false, lunch: false, dinner: false }
    for (const entry of entries) {
        if (!entry.time) continue
        if (getDateKey(new Date(entry.date)) !== todayKey) continue
        logged[mealForHour(new Date(entry.time).getHours())] = true
    }
    return logged
}

// Build a local Date at the given hour/minute on the same calendar day as `day`.
function atTime(day: Date, hour: number, minute: number): Date {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0)
}

// Build one-shot meal reminders across the next N days; today's are skipped if logged or already past.
export function buildMealReminders(prefs: NotificationPrefs, loggedMeals: Record<MealKey, boolean>, now: Date): NotificationSpec[] {
    const specs: NotificationSpec[] = []
    for (let dayOffset = 0; dayOffset < MEAL_REMINDER_DAYS; dayOffset++) {
        const day = addDays(now, dayOffset)
        for (const meal of MEAL_ORDER) {
            const pref = prefs.meals[meal]
            if (!pref.enabled) continue
            const fireAt = atTime(day, pref.hour, pref.minute)
            if (dayOffset === 0 && (loggedMeals[meal] || fireAt.getTime() <= now.getTime())) continue
            specs.push({ content: MEAL_CONTENT[meal], date: fireAt })
        }
    }
    return specs
}

// Build a tomorrow-morning streak nudge when the streak clears the minimum; empty otherwise.
export function buildStreakNudge(prefs: NotificationPrefs, streak: NutritionStreakState, now: Date): NotificationSpec[] {
    if (!prefs.streak.enabled) return []
    const n = streak.loggedToday ? streak.streakIncludingToday : streak.streakThroughYesterday
    if (n < STREAK_MIN) return []
    return [{
        content: { title: `${n}-day streak 🔥`, body: 'Log a meal today to keep it going.' },
        date: atTime(addDays(now, 1), 9, 0),
    }]
}

// Build a single re-engagement nudge 3 days out; sliding forward on every reschedule.
export function buildReengagement(prefs: NotificationPrefs, now: Date): NotificationSpec[] {
    if (!prefs.reengagement.enabled) return []
    return [{
        content: { title: 'Your progress is waiting', body: 'It’s been a few days — check in and keep your goals moving.' },
        date: atTime(addDays(now, REENGAGEMENT_DAYS), 17, 0),
    }]
}

// Assemble the full notification batch from prefs + local state, gated on master toggle and permission.
export function buildNotificationBatch(input: {
    prefs: NotificationPrefs
    permissionGranted: boolean
    entries: NutritionEntry[]
    streak: NutritionStreakState
    now: Date
}): NotificationSpec[] {
    const { prefs, permissionGranted, entries, streak, now } = input
    if (!prefs.enabled || !permissionGranted) return []
    const loggedMeals = getLoggedMealsForToday(entries, now)
    const specs = [
        ...buildMealReminders(prefs, loggedMeals, now),
        ...buildStreakNudge(prefs, streak, now),
        ...buildReengagement(prefs, now),
    ]
    return specs.slice(0, IOS_PENDING_LIMIT)
}
