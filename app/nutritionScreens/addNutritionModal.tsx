import { useAuth } from '@/context/AuthContext'
import { useBilling } from '@/context/BillingContext'
import { useNutrition } from '@/context/NutritionContext'
import { analyzeText } from '@/context/NutritionContext/functions/aiFunctions'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { parseNumericInput } from '@/lib/utils/number'
import { useSubmitOnce } from '@/lib/hooks/useSubmitOnce'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Lock, Sparkles } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import uuid from 'react-native-uuid'

export default function AddNutritionModal() {
    const { handleAddNutrition, selectedDate } = useNutrition()
    const router = useRouter()
    const { userID } = useAuth()
    const { hasPremium } = useBilling()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()

    const [mealName, setMealName] = useState('')
    const [calories, setCalories] = useState('')
    const [protein, setProtein] = useState('')
    const [carbs, setCarbs] = useState('')
    const [fats, setFats] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)
    const [generating, setGenerating] = useState(false)
    const [aiFilled, setAiFilled] = useState(false)
    const [guardSubmit, submitting] = useSubmitOnce()

    const hasContent = mealName.trim().length > 0 || [calories, protein, carbs, fats].some((v) => v.trim().length > 0)

    // Empty optional fields mean 0; a typed value must parse, else the CTA stays disabled
    const parsedProtein = protein.trim() ? parseNumericInput(protein) : 0
    const parsedCarbs = carbs.trim() ? parseNumericInput(carbs) : 0
    const parsedFats = fats.trim() ? parseNumericInput(fats) : 0
    const parsedCalories = calories.trim() ? parseNumericInput(calories) : 0
    const macrosValid = parsedProtein !== null && parsedCarbs !== null && parsedFats !== null && parsedCalories !== null

    const handleAddEntry = () => {
        if (parsedProtein === null || parsedCarbs === null || parsedFats === null || parsedCalories === null) return
        const newEntry = {
            id: uuid.v4() as string,
            userId: userID,
            name: mealName.trim() || 'Unnamed Entry',
            date: new Date(selectedDate),
            time: Date.now(),
            protein: parsedProtein,
            carbs: parsedCarbs,
            fats: parsedFats,
            calories: parsedCalories,
            isPhoto: false,
            ingredients: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        handleAddNutrition(newEntry)
        router.back()
    }

    // Generates all macros at once, filling only the fields the user hasn't already entered.
    const handleGenerateAllMacros = async () => {
        if (!mealName.trim()) {
            Alert.alert('Missing Food Name', 'Please enter a food name before generating macros.')
            return
        }
        setGenerating(true)
        try {
            const macros = await analyzeText(mealName.trim())
            if (!calories.trim()) setCalories(macros.calories.toString())
            if (!protein.trim()) setProtein(macros.protein.toString())
            if (!carbs.trim()) setCarbs(macros.carbs.toString())
            if (!fats.trim()) setFats(macros.fats.toString())
            setAiFilled(true)
        } catch (error: unknown) {
            const message = (error instanceof Error ? error.message : null) ?? 'Unable to generate macros.'
            Alert.alert('Generation Failed', message, [{ text: 'OK' }])
        } finally {
            setGenerating(false)
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces>
                <Text style={styles.heroTitle}>Enter Nutrition</Text>
                <Text style={styles.heroSub}>Describe your meal — AI fills in the macros</Text>

                <TextInput
                    style={[styles.heroInput, focusedField === 'mealName' && styles.inputFocused]}
                    placeholder="e.g. Two eggs on toast with butter, a black coffee"
                    placeholderTextColor={colors.placeholder}
                    value={mealName}
                    onChangeText={setMealName}
                    onFocus={() => setFocusedField('mealName')}
                    onBlur={() => setFocusedField(null)}
                    multiline
                    textAlignVertical="top"
                />

                {hasPremium ?
                    <TouchableOpacity activeOpacity={0.8} disabled={generating} style={styles.generatePrimaryTouchable} onPress={handleGenerateAllMacros}>
                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.generatePrimary}>
                            {generating ?
                                <ActivityIndicator size="small" color="#FFF" />
                            :   <>
                                    <Sparkles size={17} color="#FFF" strokeWidth={2.2} />
                                    <Text style={styles.generatePrimaryText}>Generate macros</Text>
                                </>
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                :   <TouchableOpacity activeOpacity={0.8} style={styles.generateLocked} onPress={() => router.replace('/settingsScreens/subscription')}>
                        <Lock size={15} color={colors.textMuted} strokeWidth={2.2} />
                        <Text style={styles.generateLockedText}>Generate macros — Premium</Text>
                    </TouchableOpacity>
                }

                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or enter manually</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.insetPanel}>
                    <View style={[styles.panelCalorieCell, focusedField === 'calories' && styles.inputFocused]}>
                        <View>
                            <Text style={styles.calorieLabel}>Calories</Text>
                            <Text style={styles.cellUnit}>kcal</Text>
                        </View>
                        <TextInput
                            style={styles.calorieInput}
                            placeholder="0"
                            placeholderTextColor={colors.placeholder}
                            value={calories}
                            onChangeText={setCalories}
                            onFocus={() => setFocusedField('calories')}
                            onBlur={() => setFocusedField(null)}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.panelCellRow}>
                        {(
                            [
                                ['fats', 'Fats', fats, setFats],
                                ['carbs', 'Carbs', carbs, setCarbs],
                                ['protein', 'Protein', protein, setProtein],
                            ] as const
                        ).map(([key, label, value, setter]) => (
                            <View key={key} style={[styles.panelMacroCell, focusedField === key && styles.inputFocused]}>
                                <Text style={styles.cellLabel}>{label}</Text>
                                <TextInput
                                    style={styles.panelMacroCellInput}
                                    placeholder="0"
                                    placeholderTextColor={colors.placeholder}
                                    value={value}
                                    onChangeText={setter}
                                    onFocus={() => setFocusedField(key)}
                                    onBlur={() => setFocusedField(null)}
                                    keyboardType="numeric"
                                />
                                <Text style={styles.cellUnit}>g</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {aiFilled && <Text style={styles.aiEstimateNote}>AI estimate — tap any value to adjust</Text>}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity activeOpacity={0.8} disabled={!hasContent || !macrosValid || submitting} onPress={guardSubmit(handleAddEntry)} style={[styles.ctaTouchable, (!hasContent || !macrosValid) && styles.ctaDisabled]}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                        <Text style={styles.ctaText}>Add meal</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
        },
        handleContainer: {
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 8,
        },
        handle: {
            width: 40,
            height: 5,
            backgroundColor: colors.border,
            borderRadius: 3,
        },
        scrollView: {
            flex: 1,
        },
        scrollContent: {
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 24,
        },
        heroTitle: {
            fontSize: 24,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
            marginTop: 8,
            marginBottom: 4,
        },
        heroSub: {
            fontSize: 14,
            color: colors.labelMuted,
            fontFamily: fonts.regular,
            letterSpacing: 0.1,
            marginBottom: 16,
        },
        heroInput: {
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
            lineHeight: 22,
            minHeight: 110,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
            marginBottom: 12,
        },
        inputFocused: {
            borderColor: colors.nutrition,
        },
        generatePrimaryTouchable: {
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        },
        generatePrimary: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: radius.cardLg,
            minHeight: 50,
            paddingHorizontal: 20,
        },
        generatePrimaryText: {
            fontSize: 16,
            color: '#FFF',
            fontFamily: fonts.semibold,
            letterSpacing: -0.3,
        },
        generateLocked: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: radius.cardLg,
            minHeight: 50,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.hairline,
        },
        generateLockedText: {
            fontSize: 15,
            color: colors.textMuted,
            fontFamily: fonts.semibold,
            letterSpacing: -0.3,
        },
        dividerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginVertical: 18,
        },
        dividerLine: {
            flex: 1,
            height: 1,
            backgroundColor: colors.divider,
        },
        dividerText: {
            fontSize: 12,
            color: colors.textMuted,
            fontFamily: fonts.medium,
        },
        insetPanel: {
            backgroundColor: colors.surfaceInset,
            borderRadius: 14,
            padding: 10,
        },
        panelCalorieCell: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 10,
        },
        calorieLabel: {
            fontSize: 15,
            color: colors.labelMuted,
            fontFamily: fonts.semibold,
            letterSpacing: -0.3,
        },
        calorieInput: {
            flex: 1,
            fontSize: 24,
            color: colors.text,
            fontFamily: fonts.bold,
            textAlign: 'right',
            paddingVertical: 4,
            paddingLeft: 12,
        },
        panelCellRow: {
            flexDirection: 'row',
            gap: 10,
        },
        panelMacroCell: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingVertical: 10,
        },
        panelMacroCellInput: {
            alignSelf: 'stretch',
            fontSize: 20,
            color: colors.text,
            fontFamily: fonts.bold,
            textAlign: 'center',
            paddingVertical: 2,
        },
        cellLabel: {
            fontSize: 12,
            color: colors.labelMuted,
            fontFamily: fonts.medium,
        },
        cellUnit: {
            fontSize: 11,
            color: colors.textMuted,
            fontFamily: fonts.medium,
        },
        aiEstimateNote: {
            fontSize: 12,
            color: colors.nutritionInk,
            fontFamily: fonts.medium,
            marginTop: 10,
        },
        footer: {
            paddingHorizontal: 20,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            backgroundColor: colors.background,
        },
        ctaTouchable: {
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
        },
        ctaDisabled: {
            opacity: 0.4,
        },
        cta: {
            borderRadius: radius.cardLg,
            paddingVertical: 15,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ctaText: {
            fontSize: 16,
            color: '#FFF',
            fontFamily: fonts.semibold,
            letterSpacing: -0.3,
        },
    })
}
