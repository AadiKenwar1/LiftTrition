import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Activity } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function AdjustTrainingScreen() {
    const { settings, setSettings, calculateMacros, mode } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [selectedFrequency, setSelectedFrequency] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat'>(settings.activityLevel)

    const frequencies = [
        { id: 'sedentary', label: 'Sedentary', subtitle: 'Little to no exercise' },
        { id: 'light', label: 'Light', subtitle: 'Light exercise 1-3 days a week' },
        { id: 'moderate', label: 'Moderate', subtitle: 'Moderate exercise 4-5 days a week' },
        { id: 'active', label: 'Active', subtitle: 'Intensive exercise 3-4 days a week or Moderate exercise 6-7 days a week' },
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
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.topSection}>
                    <View style={styles.iconCircle}>
                        <Activity size={72} color={colors.workout} strokeWidth={2} />
                    </View>
                    <Text style={styles.titleText}>Update Your Activity Level</Text>
                    <Text style={styles.subtitleText}>Updates Nutrition Goals and Fatigue</Text>
                </View>

                <View style={styles.optionsContainer}>
                    {frequencies.map((freq) => (
                        <TouchableOpacity
                            key={freq.id}
                            style={[styles.optionButton, selectedFrequency === freq.id && { borderColor: colors.workout }]}
                            onPress={() => setSelectedFrequency(freq.id as 'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat')}
                            activeOpacity={0.5}
                        >
                            <Text style={[styles.optionLabel, selectedFrequency === freq.id && styles.optionLabelSelected]}>{freq.label}</Text>
                            <Text style={[styles.optionSubtitle, selectedFrequency === freq.id && styles.optionSubtitleSelected]}>{freq.subtitle}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButtonGradient}>
                        <Text style={styles.saveButtonText}>Save</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 20,
            paddingBottom: 20,
            alignItems: 'center',
        },
        scroll: {
            flex: 1,
            width: '100%',
        },
        scrollContent: {
            alignItems: 'center',
            width: '100%',
            paddingTop: 24,
            paddingBottom: 8,
        },
        topSection: {
            alignItems: 'center',
            marginBottom: 24,
        },
        iconCircle: {
            width: 144,
            height: 144,
            borderRadius: 72,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.workout,
            marginBottom: 12,
        },
        titleText: {
            fontSize: 24,
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 4,
            textAlign: 'center',
            fontFamily: fonts.semibold,
        },
        subtitleText: {
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            letterSpacing: 0.2,
            fontFamily: fonts.regular,
        },
        optionsContainer: {
            width: '100%',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 24,
        },
        optionButton: {
            width: '100%',
            height: 65,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.border,
            gap: 12,
        },
        optionLabel: {
            fontSize: 15,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
            width: 80,
        },
        optionLabelSelected: {
            color: colors.text,
        },
        optionSubtitle: {
            flex: 1,
            fontSize: 14,
            color: colors.textSecondary,
            letterSpacing: 0.1,
            lineHeight: 18,
            fontFamily: fonts.regular,
        },
        optionSubtitleSelected: {
            color: colors.textSecondary,
        },
        saveButton: {
            width: '100%',
            height: 60,
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.workout,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
        },
        saveButtonGradient: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
        },
        saveButtonText: {
            fontSize: 16,
            color: '#fff',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
    })
}
