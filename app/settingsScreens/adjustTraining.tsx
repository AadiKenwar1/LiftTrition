import OptionCard from '@/components/NeutralComponents/OptionCard'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat'

const FREQUENCIES = [
    { id: 'sedentary' as const, label: 'Sedentary', sub: 'Little to no exercise' },
    { id: 'light' as const, label: 'Light', sub: 'Light exercise 1-3 days a week' },
    { id: 'moderate' as const, label: 'Moderate', sub: 'Moderate exercise 4-5 days a week' },
    { id: 'active' as const, label: 'Active', sub: 'Hard exercise 3-4 days, or moderate 6-7 days a week' },
    { id: 'gymrat' as const, label: 'Gym Rat', sub: 'Intensive exercise 6-7 days a week' },
]

export default function AdjustTrainingScreen() {
    const { settings, setSettings, calculateMacros } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [selectedFrequency, setSelectedFrequency] = useState<ActivityLevel>(settings.activityLevel)

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
                <Text style={styles.titleText}>How active are you?</Text>
                <Text style={styles.subtitleText}>This sets your daily calorie burn — saving updates your nutrition goals and fatigue budget.</Text>

                <View style={styles.options}>
                    {FREQUENCIES.map((f, i) => (
                        <OptionCard key={f.id} index={i} label={f.label} sublabel={f.sub} accent={colors.workout} selected={selectedFrequency === f.id} onPress={() => setSelectedFrequency(f.id)} />
                    ))}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveGradient}>
                        <Text style={styles.saveText}>Save</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        scroll: { flex: 1 },
        scrollContent: { paddingTop: 24, paddingBottom: 16 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 22, letterSpacing: 0.1, marginBottom: 26 },
        options: { gap: 10 },
        footer: { paddingTop: 12 },
        saveButton: { width: '100%', height: 58, borderRadius: radius.cardLg, overflow: 'hidden' },
        saveGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        saveText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
    })
}
