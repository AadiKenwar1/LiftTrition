import type { NutritionEntry, NutritionStreakState } from '@/lib/nutrition/types'
import * as Sentry from '@sentry/react-native'
import * as Notifications from 'expo-notifications'
import { buildNotificationBatch } from './builders'
import { isPermissionGranted } from './permissions'
import { loadNotificationPrefs } from './prefs'
import type { NotificationSpec } from './types'

// Suppress banners/sound while the app is foregrounded — reminders to open the app are noise if it's already open.
export function initNotificationHandler(): void {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: false,
            shouldShowList: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    })
}

// Serializes reschedules: each batch's cancel+schedule runs to completion before the next starts, so overlapping callers can't interleave and double-book.
let scheduleQueue: Promise<void> = Promise.resolve()

// Clear all pending notifications, then schedule the given batch as one-shot DATE triggers; serialized via scheduleQueue so concurrent calls never interleave.
export function scheduleBatch(specs: NotificationSpec[]): Promise<void> {
    const run = scheduleQueue.then(async () => {
        await Notifications.cancelAllScheduledNotificationsAsync()
        for (const spec of specs) {
            await Notifications.scheduleNotificationAsync({
                content: spec.content,
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: spec.date },
            })
        }
    })
    // Chain the next batch off this one but swallow rejections here so one failed batch doesn't poison the queue; the caller still sees `run` reject.
    scheduleQueue = run.catch(() => {})
    return run
}

// Full reschedule pipeline: read prefs + permission, rebuild the batch, and reschedule; never throws.
export async function runNotificationReschedule(entries: NutritionEntry[], streak: NutritionStreakState, now: Date = new Date()): Promise<void> {
    try {
        const prefs = await loadNotificationPrefs()
        const permissionGranted = await isPermissionGranted()
        const batch = buildNotificationBatch({ prefs, permissionGranted, entries, streak, now })
        await scheduleBatch(batch)
    } catch (e) {
        Sentry.captureException(e)
    }
}
