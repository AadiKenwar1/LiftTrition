import type { NutritionEntry, NutritionStreakState } from '@/context/NutritionContext/types'
import {
    buildMealReminders,
    buildNotificationBatch,
    buildReengagement,
    buildStreakNudge,
    getLoggedMealsForToday,
    mealForHour,
} from '../builders'
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '../types'

const enabledPrefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true }

function makeEntry(overrides: Partial<NutritionEntry>): NutritionEntry {
    return {
        id: 'e1', userId: 'u1', name: 'Meal', date: new Date(2026, 6, 17), time: 0,
        protein: 0, carbs: 0, fats: 0, calories: 0, isPhoto: false, items: [],
        createdAt: new Date(2026, 6, 17), updatedAt: new Date(2026, 6, 17),
        ...overrides,
    }
}

function entryAt(hour: number, date = new Date(2026, 6, 17)): NutritionEntry {
    return makeEntry({ date, time: new Date(2026, 6, 17, hour, 0).getTime() })
}

const noMeals = { breakfast: false, lunch: false, dinner: false }

describe('mealForHour', () => {
    it('maps hours to meal windows', () => {
        expect(mealForHour(8)).toBe('breakfast')
        expect(mealForHour(10)).toBe('breakfast')
        expect(mealForHour(11)).toBe('lunch')
        expect(mealForHour(15)).toBe('lunch')
        expect(mealForHour(16)).toBe('dinner')
        expect(mealForHour(23)).toBe('dinner')
    })
})

describe('getLoggedMealsForToday', () => {
    const now = new Date(2026, 6, 17, 10, 0)

    it('detects meals by entry time window, today only', () => {
        const entries = [entryAt(8), entryAt(20, new Date(2026, 6, 16))]
        expect(getLoggedMealsForToday(entries, now)).toEqual({ breakfast: true, lunch: false, dinner: false })
    })

    it('ignores legacy entries with time 0', () => {
        expect(getLoggedMealsForToday([makeEntry({ time: 0 })], now)).toEqual(noMeals)
    })
})

describe('buildMealReminders', () => {
    it('schedules 7 days x 3 meals when nothing logged and all times upcoming', () => {
        const now = new Date(2026, 6, 17, 7, 0)
        const specs = buildMealReminders(enabledPrefs, noMeals, now)
        expect(specs).toHaveLength(21)
        // Fire times come from DEFAULT_NOTIFICATION_PREFS.meals: breakfast 8:00, dinner 17:30.
        expect(specs[0].date).toEqual(new Date(2026, 6, 17, 8, 0))
        expect(specs[specs.length - 1].date).toEqual(new Date(2026, 6, 23, 17, 30))
    })

    it('skips today\'s logged meal', () => {
        const now = new Date(2026, 6, 17, 7, 0)
        const specs = buildMealReminders(enabledPrefs, { ...noMeals, lunch: true }, now)
        expect(specs).toHaveLength(20)
        // Lunch default is 12:00 (DEFAULT_NOTIFICATION_PREFS.meals.lunch); confirm no spec fires then today.
        expect(specs.some((s) => s.date.getTime() === new Date(2026, 6, 17, 12, 0).getTime())).toBe(false)
    })

    it('skips today\'s already-past meal times', () => {
        const now = new Date(2026, 6, 17, 13, 0)
        const specs = buildMealReminders(enabledPrefs, noMeals, now)
        expect(specs).toHaveLength(19)
    })

    it('omits disabled meals entirely', () => {
        const prefs = { ...enabledPrefs, meals: { ...enabledPrefs.meals, breakfast: { ...enabledPrefs.meals.breakfast, enabled: false } } }
        const specs = buildMealReminders(prefs, noMeals, new Date(2026, 6, 17, 7, 0))
        expect(specs).toHaveLength(14)
    })
})

describe('buildStreakNudge', () => {
    const now = new Date(2026, 6, 17, 10, 0)

    it('schedules tomorrow 9am with streakIncludingToday when logged today', () => {
        const specs = buildStreakNudge(enabledPrefs, { loggedToday: true, streakIncludingToday: 5, streakThroughYesterday: 4 }, now)
        expect(specs).toHaveLength(1)
        expect(specs[0].date).toEqual(new Date(2026, 6, 18, 9, 0))
        expect(specs[0].content.title).toContain('5')
    })

    it('uses streakThroughYesterday when not logged today', () => {
        const specs = buildStreakNudge(enabledPrefs, { loggedToday: false, streakIncludingToday: 0, streakThroughYesterday: 3 }, now)
        expect(specs[0].content.title).toContain('3')
    })

    it('returns nothing below the minimum streak', () => {
        expect(buildStreakNudge(enabledPrefs, { loggedToday: true, streakIncludingToday: 2, streakThroughYesterday: 1 }, now)).toEqual([])
    })

    it('returns nothing when disabled', () => {
        const prefs = { ...enabledPrefs, streak: { enabled: false } }
        expect(buildStreakNudge(prefs, { loggedToday: true, streakIncludingToday: 9, streakThroughYesterday: 8 }, now)).toEqual([])
    })
})

describe('buildReengagement', () => {
    it('schedules 3 days out at 17:00', () => {
        const specs = buildReengagement(enabledPrefs, new Date(2026, 6, 17, 2, 30))
        expect(specs).toHaveLength(1)
        expect(specs[0].date).toEqual(new Date(2026, 6, 20, 17, 0))
    })

    it('returns nothing when disabled', () => {
        expect(buildReengagement({ ...enabledPrefs, reengagement: { enabled: false } }, new Date())).toEqual([])
    })
})

describe('buildNotificationBatch', () => {
    const now = new Date(2026, 6, 17, 7, 0)
    const bigStreak: NutritionStreakState = { loggedToday: true, streakIncludingToday: 10, streakThroughYesterday: 9 }

    it('returns empty when master toggle is off', () => {
        expect(buildNotificationBatch({ prefs: DEFAULT_NOTIFICATION_PREFS, permissionGranted: true, entries: [], streak: bigStreak, now })).toEqual([])
    })

    it('returns empty without permission', () => {
        expect(buildNotificationBatch({ prefs: enabledPrefs, permissionGranted: false, entries: [], streak: bigStreak, now })).toEqual([])
    })

    it('worst case stays far under the iOS 64 pending cap', () => {
        const batch = buildNotificationBatch({ prefs: enabledPrefs, permissionGranted: true, entries: [], streak: bigStreak, now })
        expect(batch).toHaveLength(23)
        expect(batch.length).toBeLessThanOrEqual(64)
    })
})
