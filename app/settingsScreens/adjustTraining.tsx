import { useSettings } from '@/context/SettingsContext'
import { router } from 'expo-router'
import { Dumbbell } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const ACCENT = { workout: '#2f80ed', nutrition: '#22C922' }
const ACCENT_RGBA = { workout: 'rgba(45, 156, 255, 0.15)', nutrition: 'rgba(34, 201, 34, 0.15)' }

export default function AdjustTrainingScreen() {
    const { settings, setSettings, calculateMacros, mode } = useSettings()
    const [selectedFrequency, setSelectedFrequency] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat'>(settings.activityLevel)
    const accent = mode ? ACCENT.workout : ACCENT.nutrition
    const accentRgba = mode ? ACCENT_RGBA.workout : ACCENT_RGBA.nutrition

    const frequencies = [
        { id: 'sedentary', label: 'Sedentary', subtitle: 'Little to no exercise' },
        { id: 'light', label: 'Light', subtitle: 'Light exercise 1-3 days a week' },
        { id: 'moderate', label: 'Moderate', subtitle: 'Moderate exercise 4-5 days a week' },
        { id: 'active', label: 'Active', subtitle: 'Daily intensive exercise 3-4 days a week' },
        { id: 'gymrat', label: 'Gym Rat', subtitle: 'Intensive exercise 6-7 days a week' },
    ]

    function handleSave() {
        const updatedSettings = { ...settings, activityLevel: selectedFrequency }
        const macros = calculateMacros(updatedSettings, updatedSettings.unitSystem === 'imperial')

        setSettings({
            ...updatedSettings,
            calorieGoal: macros.calResult,
            proteinGoal: macros.proteinGrams,
            carbsGoal: macros.carbGrams,
            fatsGoal: macros.fatGrams,
        })
        router.back()
    }

    return (
        <View style={styles.container}>
            <View style={styles.topSection}>
                <View style={[styles.iconCircle, { borderColor: accent }]}>
                    <Dumbbell size={48} color={accent} strokeWidth={2} />
                </View>
                <Text style={styles.titleText}>Update Your Activity Level</Text>
                <Text style={styles.subtitleText}>Nutrition and Fatigue calculations will be updated</Text>
            </View>

            <View style={styles.optionsContainer}>
                {frequencies.map((freq) => (
                    <TouchableOpacity
                        key={freq.id}
                        style={[styles.optionButton, selectedFrequency === freq.id && { backgroundColor: accentRgba, borderColor: accent }]}
                        onPress={() => setSelectedFrequency(freq.id as 'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.optionLabel, selectedFrequency === freq.id && styles.optionLabelSelected]} numberOfLines={1}>
                            {freq.label}
                        </Text>
                        <Text style={[styles.optionSubtitle, selectedFrequency === freq.id && styles.optionSubtitleSelected]} numberOfLines={1}>
                            {freq.subtitle}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: accent, shadowColor: accent }]} onPress={handleSave} activeOpacity={0.8}>
                <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 20,
        alignItems: 'center',
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 12,
    },
    iconCircle: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 12,
    },
    titleText: {
        fontSize: 24,
        color: '#FFF',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    optionsContainer: {
        width: '100%',
        gap: 6,
        justifyContent: 'center',
        marginBottom: 12,
    },
    optionButton: {
        width: '100%',
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#2a2a2a',
        gap: 2,
    },
    optionLabel: {
        fontSize: 15,
        color: '#FFF',
        letterSpacing: -0.5,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    optionLabelSelected: {
        color: '#fff',
    },
    optionSubtitle: {
        fontSize: 13,
        color: '#aaa',
        letterSpacing: 0.2,
        textAlign: 'center',
        fontFamily: 'Poppins_500Medium',
    },
    optionSubtitleSelected: {
        color: '#fff',
    },
    noteContainer: {
        width: '100%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#282A2C',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        flexShrink: 0,
        marginBottom: 12,
    },
    noteText: {
        fontSize: 12,
        color: '#888',
        lineHeight: 15,
        textAlign: 'center',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
    saveButton: {
        width: '100%',
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    saveButtonText: {
        fontSize: 16,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
