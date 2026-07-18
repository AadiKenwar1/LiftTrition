import { useNutrition } from '@/context/NutritionContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { buildNotificationBatch } from '@/lib/notifications/builders'
import { isPermissionGranted, requestPermission } from '@/lib/notifications/permissions'
import { loadNotificationPrefs } from '@/lib/notifications/prefs'
import { runNotificationReschedule } from '@/lib/notifications/scheduler'
import * as Notifications from 'expo-notifications'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'

// Dev-only harness for exercising local notifications without waiting on real timers.
export default function NotificationsTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { nutritionData, nutritionStreak } = useNutrition()
    const [output, setOutput] = useState('Tap an action')

    const actions: { label: string; run: () => Promise<string> }[] = [
        {
            label: 'Check / request permission',
            run: async () => {
                const had = await isPermissionGranted()
                if (had) return 'Permission: granted'
                const ok = await requestPermission()
                return `Permission after request: ${ok ? 'granted' : 'denied'}`
            },
        },
        {
            label: 'Preview batch (live data)',
            run: async () => {
                const prefs = await loadNotificationPrefs()
                const batch = buildNotificationBatch({
                    prefs: { ...prefs, enabled: true },
                    permissionGranted: true,
                    entries: nutritionData,
                    streak: nutritionStreak,
                    now: new Date(),
                })
                return batch.map((s) => `${s.date.toLocaleString()} — ${s.content.title}`).join('\n') || 'Empty batch'
            },
        },
        {
            label: 'Reschedule now (respects prefs)',
            run: async () => {
                await runNotificationReschedule(nutritionData, nutritionStreak)
                const pending = await Notifications.getAllScheduledNotificationsAsync()
                return `Rescheduled. ${pending.length} pending.`
            },
        },
        {
            label: 'Fire test notification in 10s (background the app!)',
            run: async () => {
                await Notifications.scheduleNotificationAsync({
                    content: { title: 'PLATES test', body: 'Local notifications are working.' },
                    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 },
                })
                return 'Scheduled for 10 seconds from now — background the app to see it.'
            },
        },
        {
            label: 'List pending',
            run: async () => {
                const pending = await Notifications.getAllScheduledNotificationsAsync()
                return pending.map((p) => `${JSON.stringify(p.trigger)} — ${p.content.title}`).join('\n') || 'Nothing pending'
            },
        },
        {
            label: 'Cancel all',
            run: async () => {
                await Notifications.cancelAllScheduledNotificationsAsync()
                return 'All pending notifications cancelled'
            },
        },
    ]

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {actions.map((a) => (
                <TouchableOpacity key={a.label} style={styles.button} activeOpacity={0.6} onPress={() => void a.run().then(setOutput).catch((e) => setOutput(String(e)))}>
                    <Text style={styles.buttonLabel}>{a.label}</Text>
                </TouchableOpacity>
            ))}
            <Text style={styles.output}>{output}</Text>
        </ScrollView>
    )
}

// Theme-reactive styles for the Dev Hub notifications page.
function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 20,
            paddingBottom: 40,
        },
        button: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 8,
        },
        buttonLabel: {
            fontSize: 15,
            color: colors.text,
            fontFamily: fonts.semibold,
        },
        output: {
            fontSize: 13,
            color: colors.labelMuted,
            fontFamily: fonts.regular,
            marginTop: 16,
            lineHeight: 18,
        },
    })
}
