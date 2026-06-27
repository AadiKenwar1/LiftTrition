import EditMacroGoalModal, { type MacroGoalKind } from '@/components/NutritionComponents/EditMacroGoalModal'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { Beef, Droplet, Flame, Pencil, Wheat } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

function macroInitialValue(kind: MacroGoalKind, m: { calorieGoal: number; proteinGoal: number; carbsGoal: number; fatsGoal: number }) {
    switch (kind) {
        case 'calories':
            return m.calorieGoal
        case 'protein':
            return m.proteinGoal
        case 'carbs':
            return m.carbsGoal
        case 'fats':
            return m.fatsGoal
    }
}

export default function AdjustNutrition4Screen() {
    const { settings, setSettings, calculateMacros } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [editingKind, setEditingKind] = useState<MacroGoalKind | null>(null)
    const params = useLocalSearchParams<{
        height: string
        weight: string
        unitSystem: string
        goal: string
        targetWeight: string
        goalPace?: string
    }>()

    // Calculate macros based on the collected parameters
    const calculatedMacros = useMemo(() => {
        // Build a temporary settings object with the new values
        const tempSettings = {
            ...settings,
            height: Number(params.height),
            bodyWeight: Number(params.weight),
            unitSystem: params.unitSystem as 'imperial' | 'metric',
            goalType: params.goal as 'lose' | 'gain' | 'maintain',
            goalWeight: Number(params.targetWeight),
            goalPace: params.goalPace ? Number(params.goalPace) : 0,
        }

        // Calculate macros with the temporary settings
        return calculateMacros(tempSettings, params.unitSystem === 'imperial')
    }, [params, settings, calculateMacros])

    const [macroGoals, setMacroGoals] = useState(() => ({
        calorieGoal: Math.round(calculatedMacros.calResult),
        proteinGoal: Math.round(calculatedMacros.proteinGrams),
        carbsGoal: Math.round(calculatedMacros.carbGrams),
        fatsGoal: Math.round(calculatedMacros.fatGrams),
    }))

    useEffect(() => {
        setMacroGoals({
            calorieGoal: Math.round(calculatedMacros.calResult),
            proteinGoal: Math.round(calculatedMacros.proteinGrams),
            carbsGoal: Math.round(calculatedMacros.carbGrams),
            fatsGoal: Math.round(calculatedMacros.fatGrams),
        })
    }, [calculatedMacros.calResult, calculatedMacros.proteinGrams, calculatedMacros.carbGrams, calculatedMacros.fatGrams])

    const handleSaveMacro = (value: number) => {
        if (!editingKind) return
        if (editingKind === 'calories') setMacroGoals((prev) => ({ ...prev, calorieGoal: value }))
        else if (editingKind === 'protein') setMacroGoals((prev) => ({ ...prev, proteinGoal: value }))
        else if (editingKind === 'carbs') setMacroGoals((prev) => ({ ...prev, carbsGoal: value }))
        else setMacroGoals((prev) => ({ ...prev, fatsGoal: value }))
    }

    const handleSave = () => {
        // Save the new settings with updated macros
        setSettings({
            ...settings,
            height: Number(params.height),
            bodyWeight: Number(params.weight),
            unitSystem: params.unitSystem as 'imperial' | 'metric',
            goalType: params.goal as 'lose' | 'gain' | 'maintain',
            goalWeight: Number(params.targetWeight),
            goalPace: params.goalPace ? Number(params.goalPace) : 0,
            calorieGoal: macroGoals.calorieGoal,
            proteinGoal: macroGoals.proteinGoal,
            carbsGoal: macroGoals.carbsGoal,
            fatsGoal: macroGoals.fatsGoal,
        })
        router.push('/(tabs)/settings')
    }

    const handleCancel = () => {
        router.push('/(tabs)/settings')
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <FontAwesome name="list-alt" size={72} color={colors.nutrition} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Your Updated Plan</Text>

                {/* Subtitle */}
                <Text style={styles.subtitleText}>Here are your new daily nutrition goals</Text>

                {/* Macros Display */}
                <View style={styles.macrosContainer}>
                    {/* First Row */}
                    <View style={styles.macrosRow}>
                        {/* Calories */}
                        <TouchableOpacity style={styles.macroCard} onPress={() => setEditingKind('calories')} activeOpacity={0.75}>
                            <Pencil size={16} color={colors.textMuted} strokeWidth={2} style={styles.pencilCorner} />
                            <Flame size={18} color="#FF6B6B" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Calories</Text>
                            <Text style={styles.macroValue}>{macroGoals.calorieGoal}</Text>
                        </TouchableOpacity>

                        {/* Protein */}
                        <TouchableOpacity style={styles.macroCard} onPress={() => setEditingKind('protein')} activeOpacity={0.75}>
                            <Pencil size={16} color={colors.textMuted} strokeWidth={2} style={styles.pencilCorner} />
                            <Beef size={18} color="red" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Protein</Text>
                            <Text style={styles.macroValue}>{macroGoals.proteinGoal}g</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Second Row */}
                    <View style={styles.macrosRow}>
                        {/* Carbs */}
                        <TouchableOpacity style={styles.macroCard} onPress={() => setEditingKind('carbs')} activeOpacity={0.75}>
                            <Pencil size={16} color={colors.textMuted} strokeWidth={2} style={styles.pencilCorner} />
                            <Wheat size={18} color="#FFD93D" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Carbs</Text>
                            <Text style={styles.macroValue}>{macroGoals.carbsGoal}g</Text>
                        </TouchableOpacity>

                        {/* Fats */}
                        <TouchableOpacity style={styles.macroCard} onPress={() => setEditingKind('fats')} activeOpacity={0.75}>
                            <Pencil size={16} color={colors.textMuted} strokeWidth={2} style={styles.pencilCorner} />
                            <Droplet size={18} color="#22C922" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Fats</Text>
                            <Text style={styles.macroValue}>{macroGoals.fatsGoal}g</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Note */}
                <Text style={styles.noteText}>Updating body weight will automatically update nutrition goals.</Text>

                {/* Button Container */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.5}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButtonGradient}>
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <EditMacroGoalModal visible={editingKind != null} kind={editingKind} initialValue={editingKind != null ? macroInitialValue(editingKind, macroGoals) : 0} onDismiss={() => setEditingKind(null)} onSave={handleSaveMacro} />
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 20,
            paddingTop: 0,
            paddingBottom: 40,
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
        iconCircle: {
            width: 144,
            height: 144,
            borderRadius: 72,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.nutrition,
            marginBottom: 12,
        },
        titleText: {
            fontSize: 28,
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
            marginBottom: 24,
            paddingHorizontal: 8,
            fontFamily: fonts.regular,
        },
        macrosContainer: {
            width: '100%',
            gap: 10,
            marginBottom: 8,
        },
        macrosRow: {
            flexDirection: 'row',
            width: '100%',
            gap: 10,
        },
        macroCard: {
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            padding: 14,
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            gap: 6,
        },
        pencilCorner: {
            position: 'absolute',
            top: 10,
            right: 10,
        },
        macroLabel: {
            fontSize: 13,
            color: colors.textSecondary,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        macroValue: {
            fontSize: 24,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        noteText: {
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: 24,
            letterSpacing: 0.2,
            fontFamily: fonts.medium,
        },
        buttonContainer: {
            flexDirection: 'row',
            width: '100%',
            gap: 12,
        },
        cancelButton: {
            flex: 1,
            height: 60,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        cancelButtonText: {
            fontSize: 16,
            color: colors.textSecondary,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        saveButton: {
            flex: 1,
            height: 60,
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
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
