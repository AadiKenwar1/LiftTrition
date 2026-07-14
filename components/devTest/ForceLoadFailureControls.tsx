import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { isLoadFailureArmed, LOAD_SCOPES, setLoadFailureArmed, type LoadScope } from '@/lib/devtools/forceLoadFailure'
import { useEffect, useMemo, useState } from 'react'
import { Alert, StyleSheet, Switch, Text, View } from 'react-native'

/**
 * Dev-only Dev Hub controls that arm a one-shot load failure per scope, so the
 * load-failure retry UI can be exercised on a real device without editing code.
 * Rendered only inside the __DEV__-guarded Dev Hub.
 */

const LABELS: Record<LoadScope, string> = {
    settings: 'Settings',
    nutrition: 'Nutrition',
    workout: 'Workout',
    powersync: 'PowerSync sync',
}

const EMPTY: Record<LoadScope, boolean> = { settings: false, nutrition: false, workout: false, powersync: false }

export function ForceLoadFailureControls() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [armed, setArmed] = useState<Record<LoadScope, boolean>>(EMPTY)

    useEffect(() => {
        let cancelled = false
        Promise.all(LOAD_SCOPES.map((scope) => isLoadFailureArmed(scope))).then((values) => {
            if (cancelled) return
            const next = { ...EMPTY }
            LOAD_SCOPES.forEach((scope, i) => {
                next[scope] = values[i]
            })
            setArmed(next)
        })
        return () => {
            cancelled = true
        }
    }, [])

    const toggle = async (scope: LoadScope, value: boolean) => {
        setArmed((prev) => ({ ...prev, [scope]: value }))
        await setLoadFailureArmed(scope, value)
        if (value) {
            Alert.alert('Armed', `${LABELS[scope]} will fail once on its next load. Relaunch the app (or sign out and back in) to trigger it, then tap "Tap to retry" to recover.`)
        }
    }

    return (
        <View style={styles.group}>
            <Text style={styles.groupTitle}>Force load failure (fails once, dev only)</Text>
            {LOAD_SCOPES.map((scope) => (
                <View key={scope} style={styles.row}>
                    <Text style={styles.rowLabel}>{LABELS[scope]}</Text>
                    <Switch value={armed[scope]} onValueChange={(v) => toggle(scope, v)} />
                </View>
            ))}
        </View>
    )
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
    })
}
