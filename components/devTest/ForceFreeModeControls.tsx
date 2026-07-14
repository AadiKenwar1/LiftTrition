import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { setForceFreeMode, useForceFreeMode } from '@/lib/devtools/forceFreeMode'
import { useMemo } from 'react'
import { StyleSheet, Switch, Text, View } from 'react-native'

/**
 * Dev-only Dev Hub switch that overrides hasPremium to false app-wide (there is
 * no way to deactivate a real subscription from the app). Persists across
 * restarts, so the on-state indicator is deliberately loud.
 */

export function ForceFreeModeControls() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const forceFree = useForceFreeMode()

    return (
        <View style={styles.group}>
            <Text style={styles.groupTitle}>Force free mode (persists, dev only)</Text>
            <View style={[styles.row, forceFree && styles.rowActive]}>
                <View style={styles.labels}>
                    <Text style={styles.rowLabel}>Treat me as a free user</Text>
                    {forceFree && <Text style={styles.warning}>ON — hasPremium is forced false app-wide</Text>}
                </View>
                <Switch value={forceFree} onValueChange={(v) => void setForceFreeMode(v)} />
            </View>
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
        rowActive: {
            borderColor: colors.warning,
            borderWidth: 1,
        },
        labels: {
            flex: 1,
            paddingRight: 12,
        },
        rowLabel: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.text,
        },
        warning: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.warning,
            marginTop: 2,
        },
    })
}
