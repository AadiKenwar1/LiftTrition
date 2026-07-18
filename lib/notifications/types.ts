export type MealKey = 'breakfast' | 'lunch' | 'dinner'

export interface MealReminderPref {
    enabled: boolean
    hour: number
    minute: number
}

export interface NotificationPrefs {
    enabled: boolean
    meals: Record<MealKey, MealReminderPref>
    streak: { enabled: boolean }
    reengagement: { enabled: boolean }
}

export interface NotificationSpec {
    content: { title: string; body: string }
    date: Date
}

// Baseline prefs: master off until permission is granted; sensible default meal times, motivation on.
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
    enabled: false,
    meals: {
        breakfast: { enabled: true, hour: 8, minute: 0 },
        lunch: { enabled: true, hour: 12, minute: 0 },
        dinner: { enabled: true, hour: 17, minute: 30 },
    },
    streak: { enabled: true },
    reengagement: { enabled: true },
}
