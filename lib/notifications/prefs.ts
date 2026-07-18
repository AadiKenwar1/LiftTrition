import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_NOTIFICATION_PREFS, type MealKey, type NotificationPrefs } from './types'

const STORAGE_KEY = '@notificationPrefs'
const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner']

// Load prefs, merging any stored partial shape over defaults; any error falls back to defaults.
export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULT_NOTIFICATION_PREFS
        const parsed = JSON.parse(raw)
        const meals = {} as NotificationPrefs['meals']
        for (const key of MEAL_KEYS) {
            meals[key] = { ...DEFAULT_NOTIFICATION_PREFS.meals[key], ...parsed.meals?.[key] }
        }
        return {
            enabled: parsed.enabled ?? DEFAULT_NOTIFICATION_PREFS.enabled,
            meals,
            streak: { ...DEFAULT_NOTIFICATION_PREFS.streak, ...parsed.streak },
            reengagement: { ...DEFAULT_NOTIFICATION_PREFS.reengagement, ...parsed.reengagement },
        }
    } catch {
        return DEFAULT_NOTIFICATION_PREFS
    }
}

// Persist prefs best-effort; a failed write only costs the user one settings change.
export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
        // best-effort
    }
}
