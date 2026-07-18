import { useNutrition } from '@/context/NutritionContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { isPermissionGranted, requestPermission } from '@/lib/notifications/permissions'
import { loadNotificationPrefs, saveNotificationPrefs } from '@/lib/notifications/prefs'
import { runNotificationReschedule } from '@/lib/notifications/scheduler'
import { type MealKey, type NotificationPrefs } from '@/lib/notifications/types'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useEffect, useMemo, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'

const MEAL_LABELS: Record<MealKey, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
}
const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner']

// Notification preferences screen: master toggle, per-meal reminder times, and motivation toggles.
export default function NotificationsScreen() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { nutritionData, nutritionStreak } = useNutrition()
    const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
    const [granted, setGranted] = useState(true)

    // Load stored prefs and current permission state on mount.
    useEffect(() => {
        void loadNotificationPrefs().then(setPrefs)
        void isPermissionGranted().then(setGranted)
    }, [])

    // Persist a pref change and immediately reschedule to reflect it.
    const update = (next: NotificationPrefs) => {
        setPrefs(next)
        void saveNotificationPrefs(next).then(() => runNotificationReschedule(nutritionData, nutritionStreak))
    }

    // Enabling the master toggle first ensures OS permission; disabling just clears the flag.
    const toggleMaster = async (value: boolean) => {
        if (!prefs) return
        if (value) {
            const ok = (await isPermissionGranted()) || (await requestPermission())
            setGranted(ok)
            if (!ok) return
        }
        update({ ...prefs, enabled: value })
    }

    if (!prefs) return <View style={styles.screen} />

    const showDenied = prefs.enabled === false && !granted

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Enable notifications</Text>
                    <Switch value={prefs.enabled && granted} onValueChange={(v) => void toggleMaster(v)} />
                </View>
                {showDenied && (
                    <Text style={styles.deniedText} onPress={() => void Linking.openSettings()}>
                        Notifications are turned off for PLATES in iOS Settings. Tap here to open Settings and allow them.
                    </Text>
                )}
            </View>

            <Text style={styles.sectionTitle}>Meal reminders</Text>
            <View style={styles.card}>
                {MEAL_KEYS.map((meal) => {
                    const pref = prefs.meals[meal]
                    const pickerValue = new Date(2000, 0, 1, pref.hour, pref.minute)
                    return (
                        <View key={meal} style={styles.row}>
                            <Text style={styles.rowLabel}>{MEAL_LABELS[meal]}</Text>
                            <View style={styles.rowRight}>
                                {pref.enabled && (
                                    <DateTimePicker
                                        value={pickerValue}
                                        mode="time"
                                        display="compact"
                                        onChange={(_, date) => {
                                            if (!date) return
                                            update({ ...prefs, meals: { ...prefs.meals, [meal]: { ...pref, hour: date.getHours(), minute: date.getMinutes() } } })
                                        }}
                                    />
                                )}
                                <Switch
                                    value={pref.enabled}
                                    onValueChange={(v) => update({ ...prefs, meals: { ...prefs.meals, [meal]: { ...pref, enabled: v } } })}
                                />
                            </View>
                        </View>
                    )
                })}
                <Text style={styles.helpText}>Reminders skip meals you’ve already logged that day.</Text>
            </View>

            <Text style={styles.sectionTitle}>Motivation</Text>
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={styles.rowTextBlock}>
                        <Text style={styles.rowLabel}>Streak reminders</Text>
                        <Text style={styles.helpText}>A morning nudge when you’re on a logging streak</Text>
                    </View>
                    <Switch value={prefs.streak.enabled} onValueChange={(v) => update({ ...prefs, streak: { enabled: v } })} />
                </View>
                <View style={styles.row}>
                    <View style={styles.rowTextBlock}>
                        <Text style={styles.rowLabel}>Check-in reminders</Text>
                        <Text style={styles.helpText}>A gentle reminder if you haven’t opened the app in a few days</Text>
                    </View>
                    <Switch value={prefs.reengagement.enabled} onValueChange={(v) => update({ ...prefs, reengagement: { enabled: v } })} />
                </View>
            </View>
        </ScrollView>
    )
}

// Theme-reactive styles for the notifications settings screen.
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
        sectionTitle: {
            fontSize: 13,
            color: colors.labelMuted,
            letterSpacing: 0.2,
            marginBottom: 10,
            marginLeft: 4,
            marginTop: 24,
            fontFamily: fonts.semibold,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: 16,
            paddingVertical: 4,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
        },
        rowRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        rowTextBlock: {
            flex: 1,
            marginRight: 12,
        },
        rowLabel: {
            fontSize: 16,
            color: colors.text,
            fontFamily: fonts.semibold,
        },
        helpText: {
            fontSize: 13,
            color: colors.labelMuted,
            lineHeight: 17,
            fontFamily: fonts.regular,
            paddingBottom: 10,
            marginTop: 2,
        },
        deniedText: {
            fontSize: 13,
            color: colors.labelMuted,
            lineHeight: 18,
            fontFamily: fonts.regular,
            paddingBottom: 12,
        },
    })
}
