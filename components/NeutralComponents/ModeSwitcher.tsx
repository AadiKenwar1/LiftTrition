import { radius, useColors, type Colors } from '@/context/ThemeContext'
import { useSettings } from '@/context/SettingsContext'
import { LinearGradient } from 'expo-linear-gradient'
import { Dumbbell, Nut } from 'lucide-react-native'
import React, { useMemo } from 'react'
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native'

const ICON_SIZE = 25
const ICON_STROKE = 2.0

export default function CustomHeader() {
    const { mode, setMode } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const renderModeButton = (isLift: boolean) => {
        const isActive = mode === isLift
        const gradientColors = isLift ? colors.workoutGradient : colors.nutritionGradient
        const Icon = isLift ? Dumbbell : Nut
        const iconColor = isActive ? '#FFFFFF' : colors.tabInactive

        const labelContent = (
            <View style={styles.modeLabelRow}>
                <Icon size={ICON_SIZE} color={iconColor} strokeWidth={ICON_STROKE} style={isLift ? styles.dumbbellIcon : undefined} />
            </View>
        )

        if (isActive) {
            return (
                <Pressable style={[styles.modeButton, styles.activeModeButton]} onPress={() => setMode(isLift)}>
                    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientButton}>
                        {labelContent}
                    </LinearGradient>
                </Pressable>
            )
        }

        return (
            <TouchableOpacity style={[styles.modeButton, styles.inactiveModeButton]} onPress={() => setMode(isLift)} activeOpacity={0.5}>
                {labelContent}
            </TouchableOpacity>
        )
    }

    return (
        <View style={styles.header}>
            <View style={styles.modeSelectorContainer}>
                {renderModeButton(true)}
                {renderModeButton(false)}
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        header: {
            height: 100,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            paddingHorizontal: 10,
            paddingTop: 10,
            zIndex: 100,
        },
        modeSelectorContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 30,
            backgroundColor: colors.toggleTrack,
            borderRadius: radius.toggle,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            gap: 4,
            padding: 4,
        },
        modeButton: {
            flex: 1,
            borderRadius: radius.toggleInner,
            overflow: 'hidden',
            minHeight: 42,
        },
        activeModeButton: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 9,
            elevation: 4,
        },
        inactiveModeButton: {
            backgroundColor: 'transparent',
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        gradientButton: {
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        modeLabelRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        },
        dumbbellIcon: {
            transform: [{ rotate: '45deg' }],
        },
    })
}
