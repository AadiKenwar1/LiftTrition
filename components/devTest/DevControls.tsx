import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useMemo, type ReactNode } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Tiny control primitives for the dev test harness (components/devTest/*).
 * Not shipped to production — loaded only behind the __DEV__-guarded route.
 */

export function Field({ label, children }: { label: string; children: ReactNode }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.fieldRow}>{children}</View>
        </View>
    )
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <>
            {options.map((o) => {
                const selected = o.value === value
                return (
                    <TouchableOpacity
                        key={String(o.value)}
                        onPress={() => onChange(o.value)}
                        activeOpacity={0.7}
                        style={[styles.chip, selected ? { backgroundColor: colors.workout, borderColor: colors.workout } : { borderColor: colors.hairline }]}
                    >
                        <Text style={[styles.chipText, { color: selected ? '#fff' : colors.textSecondary }]}>{o.label}</Text>
                    </TouchableOpacity>
                )
            })}
        </>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        field: {
            marginBottom: 12,
        },
        fieldLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 6,
        },
        fieldRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        chip: {
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            backgroundColor: colors.surface,
        },
        chipText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
        },
    })
}
