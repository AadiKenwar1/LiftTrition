import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface StagedSectionProps {
    label: string
    count: number
    color: string
    children: React.ReactNode
}

export default function StagedSection({ label, count, color, children }: StagedSectionProps) {
    return (
        <View style={[styles.container, { backgroundColor: `${color}12`, borderColor: `${color}40` }]}>
            <View style={styles.header}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[styles.title, { color }]}>{label}</Text>
                <View style={[styles.badge, { backgroundColor: color }]}>
                    <Text style={styles.badgeText}>{count}</Text>
                </View>
            </View>
            {children}
        </View>
    )
}

const styles = StyleSheet.create({
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
        fontFamily: 'Poppins_600SemiBold',
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
        fontFamily: 'Poppins_600SemiBold',
        lineHeight: 14,
    },
})
