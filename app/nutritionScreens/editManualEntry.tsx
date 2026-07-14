import { useNutrition } from '@/context/NutritionContext'
import { NutritionEntry } from '@/context/NutritionContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { parseNumericInput } from '@/lib/utils/number'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function EditManualEntry() {
    const router = useRouter()
    const { entry: entryParam } = useLocalSearchParams<{ entry: string }>()
    const { handleEditNutrition } = useNutrition()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()

    // Normalize param (Expo Router can return string | string[] | undefined)
    const entryStr = typeof entryParam === 'string' ? entryParam : entryParam?.[0]
    if (!entryStr) {
        router.back()
        return null
    }

    // Parse entry from route params and rehydrate dates
    const raw = JSON.parse(entryStr)
    const parsedEntry: NutritionEntry = {
        ...raw,
        date: new Date(raw.date),
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    }

    const [name, setName] = useState(parsedEntry.name)
    const [focusedField, setFocusedField] = useState<string | null>(null)
    const [calories, setCalories] = useState(parsedEntry.calories.toString())
    const [protein, setProtein] = useState(parsedEntry.protein.toString())
    const [carbs, setCarbs] = useState(parsedEntry.carbs.toString())
    const [fats, setFats] = useState(parsedEntry.fats.toString())

    // Empty (cleared) fields mean 0; a typed value must parse, else the CTA stays disabled
    const parsedProtein = protein.trim() ? parseNumericInput(protein) : 0
    const parsedCarbs = carbs.trim() ? parseNumericInput(carbs) : 0
    const parsedFats = fats.trim() ? parseNumericInput(fats) : 0
    const parsedCalories = calories.trim() ? parseNumericInput(calories) : 0
    const macrosValid = parsedProtein !== null && parsedCarbs !== null && parsedFats !== null && parsedCalories !== null

    function handleSave() {
        if (parsedProtein === null || parsedCarbs === null || parsedFats === null || parsedCalories === null) return
        const updatedEntry: NutritionEntry = {
            ...parsedEntry,
            name: name.trim() || parsedEntry.name,
            protein: parsedProtein,
            carbs: parsedCarbs,
            fats: parsedFats,
            calories: parsedCalories,
        }
        handleEditNutrition(parsedEntry.id, updatedEntry)
        router.back()
    }

    return (
        <View style={styles.container}>
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.heroTitle}>Edit Entry</Text>
                <Text style={styles.heroSub}>Adjust your meal and macros</Text>

                <Text style={styles.fieldLabel}>Meal</Text>
                <TextInput
                    style={[styles.nameInput, focusedField === 'name' && styles.inputFocused]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Meal name"
                    placeholderTextColor={colors.placeholder}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                />

                <Text style={styles.fieldLabel}>Macros</Text>
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
                                ['protein', 'Protein', protein, setProtein],
                                ['carbs', 'Carbs', carbs, setCarbs],
                                ['fats', 'Fats', fats, setFats],
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
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity activeOpacity={0.8} disabled={!macrosValid} onPress={handleSave} style={[styles.ctaTouchable, !macrosValid && styles.ctaDisabled]}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                        <Text style={styles.ctaText}>Save changes</Text>
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
        fieldLabel: {
            fontSize: 13,
            color: colors.labelMuted,
            fontFamily: fonts.semibold,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            marginTop: 16,
            marginBottom: 8,
        },
        nameInput: {
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 13,
            fontSize: 16,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        inputFocused: {
            borderColor: colors.nutrition,
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
