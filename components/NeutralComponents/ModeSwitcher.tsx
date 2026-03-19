import { useSettings } from '@/context/SettingsContext'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Mode button colors
const LIFT_GRADIENT = ['#1F6FD8', '#2F80ED', '#4A95F3'] as const
const NUTRITION_GRADIENT = ['#179F17', '#22C922', '#3BE63B'] as const

export default function CustomHeader() {
    const { mode, setMode } = useSettings()

    const renderModeButton = (isLift: boolean) => {
        const isActive = mode === isLift
        const label = isLift ? 'LIFT' : 'NUTRITION'
        const gradientColors = isLift ? LIFT_GRADIENT : NUTRITION_GRADIENT

        if (isActive) {
            return (
                <Pressable style={[styles.modeButton, styles.activeModeButton]} onPress={() => setMode(isLift)}>
                    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradientButton}>
                        <Text style={styles.activeModeText}>{label}</Text>
                    </LinearGradient>
                </Pressable>
            )
        }

        return (
            <TouchableOpacity style={[styles.modeButton, styles.inactiveModeButton]} onPress={() => setMode(isLift)} activeOpacity={0.7}>
                <Text style={styles.modeButtonText}>{label}</Text>
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

const styles = StyleSheet.create({
    header: {
        height: 100,
        backgroundColor: '#121212',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingTop: 10,
        marginBottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 100,
    },
    modeSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        backgroundColor: '#1F1F1F',
        borderRadius: 10,
        gap: 8,
        padding: 2,
        shadowColor: '#121212',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 4,
    },
    modeButton: {
        flex: 1,
        borderRadius: 8,
        overflow: 'hidden',
        minHeight: 42,
    },
    activeModeButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
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
    modeButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#aaa',
        letterSpacing: 0.3,
    },
    activeModeText: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
})
