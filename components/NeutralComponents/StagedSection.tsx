import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import React, { useMemo } from 'react'
import { StyleSheet, Switch, Text, View } from 'react-native'

interface StagedSectionProps {
    label: string
    count: number
    color: string
    children: React.ReactNode
    combineItems?: boolean
    onCombineItemsChange?: (value: boolean) => void
}

export default function StagedSection({ label, count, color, children, combineItems, onCombineItemsChange }: StagedSectionProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const showCombineToggle = count >= 2 && onCombineItemsChange != null

    return (
        <View style={[styles.container, { backgroundColor: `${color}12`, borderColor: `${color}40` }]}>
            <View style={styles.header}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[styles.title, { color }]}>{label}</Text>
                <View style={[styles.badge, { backgroundColor: color }]}>
                    <Text style={styles.badgeText}>{count}</Text>
                </View>
            </View>
            {showCombineToggle && (
                <View style={styles.combineRow}>
                    <Text style={styles.combineLabel}>Combine items</Text>
                    <Switch
                        value={combineItems ?? false}
                        onValueChange={onCombineItemsChange}
                        trackColor={{ false: colors.disabled, true: `${color}88` }}
                        thumbColor={combineItems ? color : colors.textMuted}
                    />
                </View>
            )}
            {children}
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            borderRadius: 16,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 14,
            marginBottom: 14,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
            gap: 6,
        },
        dot: {
            width: 7,
            height: 7,
            borderRadius: 4,
        },
        title: {
            fontSize: 12,
            fontFamily: fonts.semibold,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        badge: {
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 6,
            justifyContent: 'center',
            alignItems: 'center',
        },
        badgeText: {
            fontSize: 11,
            color: '#fff',
            fontFamily: fonts.semibold,
            lineHeight: 14,
        },
        combineRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingVertical: 4,
        },
        combineLabel: {
            fontSize: 14,
            color: colors.textSecondary,
            fontFamily: fonts.medium,
            letterSpacing: -0.2,
        },
    })
}
