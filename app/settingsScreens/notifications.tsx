import { useNutrition } from '@/context/NutritionContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { requestPermission } from '@/lib/notifications/permissions'
import { loadNotificationPrefs, saveNotificationPrefs } from '@/lib/notifications/prefs'
import { runNotificationReschedule } from '@/lib/notifications/scheduler'
import { type MealKey, type NotificationPrefs } from '@/lib/notifications/types'
import { nextPermissionAction, openAppSettings } from '@/lib/utils/permissions'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as Notifications from 'expo-notifications'
import { useEffect, useMemo, useState } from 'react'
import { AppState, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'

const MEAL_LABELS: Record<MealKey, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
}
const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner']

// Live OS permission read: granted plus whether the in-app prompt can still be shown, vs. a hard
// denial that requires the Settings app. isPermissionGranted/requestPermission in lib/notifications/permissions.ts
// stay untouched (scheduler.ts and the Dev Hub page only need the simpler granted-only check).
async function getPermissionState(): Promise<{ granted: boolean; canAskAgain: boolean }> {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync()
    return { granted, canAskAgain }
}

// Notification preferences screen: master toggle, per-meal reminder times, and motivation toggles.
export default function NotificationsScreen() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { nutritionData, nutritionStreak } = useNutrition()
    const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
    const [granted, setGranted] = useState(true)
    const [canAskAgain, setCanAskAgain] = useState(true)

    // Load stored prefs and current permission state on mount, then refresh permission state on every
    // foreground transition so a grant/revoke made in iOS Settings self-corrects the switch/hint on return
    // (mirrors the AppState refresh pattern in components/GuardComponents/SyncWatchdog.tsx).
    useEffect(() => {
        void loadNotificationPrefs().then(setPrefs)

        // Pull a live permission read into state; shared by the mount fetch and every foreground refresh.
        const refreshPermissionState = () =>
            void getPermissionState().then((s) => {
                setGranted(s.granted)
                setCanAskAgain(s.canAskAgain)
            })
        refreshPermissionState()

        const sub = AppState.addEventListener('change', (next) => {
            if (next !== 'active') return
            refreshPermissionState()
        })
        return () => sub.remove()
    }, [])

    // Persist a pref change and immediately reschedule to reflect it.
    const update = (next: NotificationPrefs) => {
        setPrefs(next)
        void saveNotificationPrefs(next).then(() => runNotificationReschedule(nutritionData, nutritionStreak))
    }

    // Enabling the master toggle re-checks OS permission live -- so a grant made in iOS Settings and
    // returned-to is honored immediately -- then requests or deep-links to Settings as needed;
    // disabling just clears the flag without touching permission APIs.
    const toggleMaster = async (value: boolean) => {
        if (!prefs) return
        if (value) {
            const live = await getPermissionState()
            setGranted(live.granted)
            setCanAskAgain(live.canAskAgain)
            if (!live.granted) {
                if (nextPermissionAction(live) === 'settings') {
                    openAppSettings()
                    return
                }
                const ok = await requestPermission()
                setGranted(ok)
                if (!ok) {
                    setCanAskAgain(false)
                    return
                }
            }
        }
        update({ ...prefs, enabled: value })
    }

    if (!prefs) return <View style={styles.screen} />

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <NotificationMasterCard
                enabled={prefs.enabled}
                granted={granted}
                canAskAgain={canAskAgain}
                onToggle={(v) => void toggleMaster(v)}
                onSettingsPress={openAppSettings}
            />

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

// Master notifications switch + conditional Settings-deep-link hint. Driven only by props (no context
// reads) so the Dev Hub can render this exact shipped component with simulated permission states
// instead of a hand-duplicated copy.
export function NotificationMasterCard({
    enabled,
    granted,
    canAskAgain,
    onToggle,
    onSettingsPress,
}: {
    enabled: boolean
    granted: boolean
    canAskAgain: boolean
    onToggle: (value: boolean) => void
    onSettingsPress: () => void
}) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const showDenied = !granted && !canAskAgain

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.rowLabel}>Enable notifications</Text>
                <Switch value={enabled && granted} onValueChange={onToggle} />
            </View>
            {showDenied && (
                <Text style={styles.deniedText} onPress={onSettingsPress}>
                    Notifications are turned off for PLATES in iOS Settings. Tap here to open Settings and allow them.
                </Text>
            )}
        </View>
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
