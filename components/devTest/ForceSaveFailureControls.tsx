import { useNutrition } from '@/context/NutritionContext'
import type { NutritionEntry } from '@/context/NutritionContext/types'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { useAuth } from '@/context/AuthContext'
import { isSaveFailureArmed, SAVE_SCOPES, setSaveFailureArmed, type SaveScope } from '@/lib/devtools/forceSaveFailure'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import uuid from 'react-native-uuid'

/**
 * Dev-only Dev Hub controls that arm a one-shot save (local write) failure per
 * scope, then let you fire that write right here — no need to leave the hub and
 * log a real meal/workout to trigger it. The trigger is gated on the scope being
 * armed, so the write always fails and rolls back (settings re-saves the same
 * row; nutrition/workout roll their optimistic entry back), leaving no junk data.
 * Rendered only inside the __DEV__-guarded Dev Hub.
 */

const LABELS: Record<SaveScope, string> = {
    settings: 'Settings',
    nutrition: 'Nutrition',
    workout: 'Workout',
}

const EMPTY: Record<SaveScope, boolean> = { settings: false, nutrition: false, workout: false }

export function ForceSaveFailureControls() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [armed, setArmed] = useState<Record<SaveScope, boolean>>(EMPTY)

    const { userID } = useAuth()
    const { setSettings } = useSettings()
    const { handleAddNutrition } = useNutrition()
    const { handleAddWorkout } = useWorkout()

    useEffect(() => {
        let cancelled = false
        Promise.all(SAVE_SCOPES.map((scope) => isSaveFailureArmed(scope))).then((values) => {
            if (cancelled) return
            const next = { ...EMPTY }
            SAVE_SCOPES.forEach((scope, i) => {
                next[scope] = values[i]
            })
            setArmed(next)
        })
        return () => {
            cancelled = true
        }
    }, [])

    const toggle = async (scope: SaveScope, value: boolean) => {
        setArmed((prev) => ({ ...prev, [scope]: value }))
        await setSaveFailureArmed(scope, value)
    }

    const trigger = (scope: SaveScope) => {
        // The armed one-shot is consumed by this write, so reflect that locally.
        setArmed((prev) => ({ ...prev, [scope]: false }))
        if (scope === 'settings') {
            setSettings((prev) => ({ ...prev }))
        } else if (scope === 'nutrition') {
            handleAddNutrition(makeDevNutritionEntry(userID))
        } else {
            handleAddWorkout('Dev save test', userID ?? '')
        }
    }

    return (
        <View style={styles.group}>
            <Text style={styles.groupTitle}>Force save failure (fails once, dev only)</Text>
            {SAVE_SCOPES.map((scope) => (
                <View key={scope} style={styles.row}>
                    <Text style={styles.rowLabel}>{LABELS[scope]}</Text>
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={[styles.triggerButton, !armed[scope] && styles.triggerDisabled]}
                            onPress={() => trigger(scope)}
                            disabled={!armed[scope]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.triggerText, !armed[scope] && styles.triggerTextDisabled]}>Trigger</Text>
                        </TouchableOpacity>
                        <Switch value={armed[scope]} onValueChange={(v) => toggle(scope, v)} />
                    </View>
                </View>
            ))}
        </View>
    )
}

function makeDevNutritionEntry(userID?: string): NutritionEntry {
    const now = new Date()
    return {
        id: uuid.v4() as string,
        userId: userID ?? '',
        name: 'Dev save test',
        date: now,
        time: now.getTime(),
        protein: 0,
        carbs: 0,
        fats: 0,
        calories: 0,
        isPhoto: false,
        ingredients: [],
        createdAt: now,
        updatedAt: now,
    }
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        group: {
            marginTop: 20,
        },
        groupTitle: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 8,
            marginLeft: 2,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 10,
            paddingHorizontal: 16,
            marginBottom: 8,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        rowLabel: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.text,
        },
        controls: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        triggerButton: {
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: radius.chip,
            borderWidth: 1,
            borderColor: colors.workout,
        },
        triggerDisabled: {
            borderColor: colors.hairline,
        },
        triggerText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.workout,
        },
        triggerTextDisabled: {
            color: colors.textMuted,
        },
    })
}
