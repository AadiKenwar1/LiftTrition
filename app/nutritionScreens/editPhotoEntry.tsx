import { useNutrition } from '@/context/NutritionContext'
import { Ingredient, NutritionEntry } from '@/context/NutritionContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Camera, Plus, Trash2 } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const INGREDIENT_MACROS: (keyof Ingredient)[] = ['calories', 'fats', 'carbs', 'protein']

function calcTotals(ings: Ingredient[]) {
    let totalProtein = 0
    let totalCarbs = 0
    let totalFats = 0
    let totalCalories = 0
    for (const ing of ings) {
        const qty = ing.quantity || 1
        totalProtein += ing.protein * qty
        totalCarbs += ing.carbs * qty
        totalFats += ing.fats * qty
        totalCalories += ing.calories * qty
    }
    return {
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fats: Math.round(totalFats * 10) / 10,
        calories: Math.round(totalCalories),
    }
}

export default function EditPhotoEntry() {
    const router = useRouter()
    const { entry: entryParam } = useLocalSearchParams<{ entry: string }>()
    const { handleEditNutrition } = useNutrition()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    // Parse entry from route params and rehydrate dates
    const raw = JSON.parse(entryParam)
    const parsedEntry: NutritionEntry = {
        ...raw,
        date: new Date(raw.date),
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    }

    const [name, setName] = useState(parsedEntry.name)
    const [focusedField, setFocusedField] = useState<string | null>(null)
    const [ingredients, setIngredients] = useState<Ingredient[]>(parsedEntry.ingredients?.length ? parsedEntry.ingredients : [])

    const totals = calcTotals(ingredients)

    function updateIngredient(index: number, field: keyof Ingredient, value: string) {
        setIngredients((prev) =>
            prev.map((ing, i) => {
                if (i !== index) return ing
                return field === 'name' ? { ...ing, [field]: value } : { ...ing, [field]: parseFloat(value) || 0 }
            }),
        )
    }

    function addIngredient() {
        setIngredients((prev) => [...prev, { name: '', quantity: 1, protein: 0, carbs: 0, fats: 0, calories: 0 }])
    }

    function removeIngredient(index: number) {
        if (ingredients.length <= 1) {
            Alert.alert('Cannot Remove', 'At least one ingredient is required.')
            return
        }
        setIngredients((prev) => prev.filter((_, i) => i !== index))
    }

    function handleSave() {
        const t = calcTotals(ingredients)
        const updatedEntry: NutritionEntry = {
            ...parsedEntry,
            name: name.trim() || parsedEntry.name,
            ingredients,
            protein: t.protein,
            carbs: t.carbs,
            fats: t.fats,
            calories: t.calories,
        }
        handleEditNutrition(parsedEntry.id, updatedEntry)
        router.back()
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Camera size={36} color={colors.nutrition} strokeWidth={2.5} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Edit Photo Entry</Text>
                <Text style={styles.subtitle}>Adjust ingredients — totals update automatically</Text>

                {/* Meal Name */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Meal Name</Text>
                    <TextInput
                        style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                        value={name}
                        onChangeText={setName}
                        placeholder="Meal name"
                        placeholderTextColor={colors.placeholder}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                    />
                </View>

                {/* Ingredients */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Ingredients</Text>

                    {ingredients.map((ingredient, index) => (
                        <View key={index} style={styles.ingredientCard}>
                            {/* Name + delete */}
                            <View style={styles.ingredientHeaderRow}>
                                <TextInput
                                    style={[styles.ingredientNameInput, focusedField === `iname-${index}` && styles.inputFocused]}
                                    value={ingredient.name}
                                    onChangeText={(val) => updateIngredient(index, 'name', val)}
                                    placeholder="Ingredient name"
                                    placeholderTextColor={colors.placeholder}
                                    onFocus={() => setFocusedField(`iname-${index}`)}
                                    onBlur={() => setFocusedField(null)}
                                />
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeIngredient(index)} activeOpacity={0.5}>
                                    <Trash2 size={16} color={colors.destructive} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>

                            {/* Stacked macros */}
                            <View style={styles.macrosStack}>
                                {/* Macros */}
                                {INGREDIENT_MACROS.map((macro) => (
                                    <View key={macro} style={styles.macroRow}>
                                        <View style={styles.labelContainer}>
                                            <Text style={styles.macroRowLabel}>{macro.charAt(0).toUpperCase() + macro.slice(1)}</Text>
                                            <Text style={styles.macroRowUnit}>({macro === 'calories' ? 'kcal' : 'g'})</Text>
                                        </View>
                                        <TextInput
                                            style={[styles.macroRowInput, focusedField === `${macro}-${index}` && styles.inputFocused]}
                                            value={(ingredient[macro] as number).toString()}
                                            onChangeText={(val) => updateIngredient(index, macro, val)}
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField(`${macro}-${index}`)}
                                            onBlur={() => setFocusedField(null)}
                                            placeholderTextColor={colors.placeholder}
                                        />
                                    </View>
                                ))}
                            </View>

                            {/* Quantity selector */}
                            <View style={styles.quantitySection}>
                                <Text style={styles.quantitySectionLabel}>Servings</Text>
                                <View style={styles.quantityControls}>
                                    <TouchableOpacity
                                        style={styles.quantityButton}
                                        onPress={() => {
                                            const newQty = Math.max(0.1, ingredient.quantity - 1)
                                            updateIngredient(index, 'quantity', newQty.toString())
                                        }}
                                        activeOpacity={0.5}
                                    >
                                        <Text style={styles.quantityButtonText}>−</Text>
                                    </TouchableOpacity>

                                    <TextInput
                                        style={[styles.quantityInput, focusedField === `qty-${index}` && styles.quantityInputFocused]}
                                        value={ingredient.quantity.toString()}
                                        onChangeText={(val) => updateIngredient(index, 'quantity', val)}
                                        keyboardType="numeric"
                                        onFocus={() => setFocusedField(`qty-${index}`)}
                                        onBlur={() => setFocusedField(null)}
                                        placeholderTextColor={colors.placeholder}
                                    />

                                    <TouchableOpacity
                                        style={styles.quantityButton}
                                        onPress={() => {
                                            const newQty = ingredient.quantity + 1
                                            updateIngredient(index, 'quantity', newQty.toString())
                                        }}
                                        activeOpacity={0.5}
                                    >
                                        <Text style={styles.quantityButtonText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Individual ingredient totals */}
                            <View style={styles.ingredientTotals}>
                                <Text style={styles.ingredientTotalsTitle}>{ingredient.name || 'Ingredient'} Total</Text>
                                <View style={styles.ingredientTotalsGrid}>
                                    <View style={styles.ingredientTotalItem}>
                                        <Text style={styles.ingredientTotalValue}>{Math.round(ingredient.calories * ingredient.quantity)}</Text>
                                        <Text style={styles.ingredientTotalLabel}>Calories{'\n'}(kcal)</Text>
                                    </View>
                                    <View style={styles.ingredientTotalItem}>
                                        <Text style={styles.ingredientTotalValue}>{Math.round(ingredient.fats * ingredient.quantity * 10) / 10}</Text>
                                        <Text style={styles.ingredientTotalLabel}>Fats{'\n'}(g)</Text>
                                    </View>
                                    <View style={styles.ingredientTotalItem}>
                                        <Text style={styles.ingredientTotalValue}>{Math.round(ingredient.carbs * ingredient.quantity * 10) / 10}</Text>
                                        <Text style={styles.ingredientTotalLabel}>Carbs{'\n'}(g)</Text>
                                    </View>
                                    <View style={styles.ingredientTotalItem}>
                                        <Text style={styles.ingredientTotalValue}>{Math.round(ingredient.protein * ingredient.quantity * 10) / 10}</Text>
                                        <Text style={styles.ingredientTotalLabel}>Protein{'\n'}(g)</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}

                    <View style={styles.addIngredientBelowWrap}>
                        <TouchableOpacity style={styles.addIngredientBtn} onPress={addIngredient} activeOpacity={0.75}>
                            <View style={styles.addIngredientIconCircle}>
                                <Plus size={20} color={colors.nutrition} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.addIngredientBtnText}>Add ingredient</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Calculated totals */}
                    <View style={styles.totalsCard}>
                        <Text style={styles.totalsCardTitle}>Calculated Totals</Text>
                        <View style={styles.totalsRow}>
                            {[
                                { label: 'Calories', value: `${totals.calories}`, unit: 'kcal' },
                                { label: 'Fats', value: `${totals.fats}`, unit: 'g' },
                                { label: 'Carbs', value: `${totals.carbs}`, unit: 'g' },
                                { label: 'Protein', value: `${totals.protein}`, unit: 'g' },
                            ].map((item, idx, arr) => (
                                <View key={item.label} style={styles.totalCol}>
                                    <Text style={styles.totalValue}>{item.value}</Text>
                                    <Text style={styles.totalUnit}>{item.unit}</Text>
                                    <Text style={styles.totalLabel}>{item.label}</Text>
                                    {idx < arr.length - 1 && <View style={styles.totalDivider} />}
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity onPress={handleSave} activeOpacity={0.8} style={styles.saveButtonTouchable}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
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
        content: {
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 32,
        },
        iconContainer: {
            alignItems: 'center',
            marginBottom: 16,
            marginTop: 12,
        },
        iconCircle: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.nutrition,
        },
        title: {
            fontSize: 24,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 4,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        subtitle: {
            fontSize: 16,
            color: colors.labelMuted,
            textAlign: 'center',
            marginBottom: 20,
            fontFamily: fonts.regular,
            letterSpacing: 0.2,
        },
        section: {
            marginBottom: 24,
        },
        sectionLabel: {
            fontSize: 16,
            color: colors.text,
            marginBottom: 12,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        addIngredientBelowWrap: {
            width: '100%',
            marginBottom: 16,
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        inputFocused: {
            borderColor: colors.nutrition,
        },
        addIngredientBtn: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            paddingVertical: 16,
            paddingHorizontal: 18,
            borderRadius: 12,
            backgroundColor: colors.nutrition + '14',
            borderWidth: 1,
            borderColor: colors.nutrition + '66',
        },
        addIngredientIconCircle: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.nutrition + '22',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.nutrition + '66',
        },
        addIngredientBtnText: {
            fontSize: 15,
            color: colors.text,
            letterSpacing: -0.4,
            fontFamily: fonts.semibold,
        },
        ingredientCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            padding: 16,
            marginBottom: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        ingredientHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
        },
        ingredientNameInput: {
            flex: 1,
            backgroundColor: colors.surfaceInset,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.hairline,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        deleteBtn: {
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: colors.surfaceInset,
            justifyContent: 'center',
            alignItems: 'center',
        },
        quantitySection: {
            marginTop: 12,
            marginBottom: 12,
            paddingTop: 12,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
        },
        quantitySectionLabel: {
            fontSize: 11,
            color: colors.nutrition,
            textAlign: 'center',
            marginBottom: 8,
            letterSpacing: -0.5,
            textTransform: 'uppercase',
            fontFamily: fonts.semibold,
        },
        quantityControls: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
        },
        quantityButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surfaceInset,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.nutrition,
        },
        quantityButtonText: {
            fontSize: 20,
            color: colors.nutrition,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        quantityInput: {
            width: 70,
            backgroundColor: colors.surfaceInset,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 18,
            color: colors.text,
            borderWidth: 1.5,
            borderColor: colors.nutrition,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        quantityInputFocused: {
            borderColor: colors.nutrition,
            backgroundColor: colors.surfaceInset,
        },
        macrosStack: {
            gap: 8,
        },
        macroRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        labelContainer: {
            flexDirection: 'column',
        },
        macroRowLabel: {
            fontSize: 16,
            color: colors.labelMuted,
            width: 70,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        macroRowInput: {
            flex: 1,
            backgroundColor: colors.surfaceInset,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        macroRowUnit: {
            fontSize: 14,
            color: colors.labelMuted,
            width: 70,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        ingredientTotals: {
            marginTop: 14,
            paddingTop: 14,
            paddingHorizontal: 10,
            paddingBottom: 8,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            backgroundColor: colors.nutrition + '14',
            borderRadius: 8,
        },
        ingredientTotalsTitle: {
            fontSize: 12,
            color: colors.nutrition,
            marginBottom: 10,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        ingredientTotalsGrid: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 6,
        },
        ingredientTotalItem: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 6,
        },
        ingredientTotalValue: {
            fontSize: 20,
            color: colors.text,
            marginBottom: 2,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        ingredientTotalLabel: {
            fontSize: 12,
            color: colors.textMuted,
            textAlign: 'center',
            fontFamily: fonts.regular,
        },
        compactMacrosRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        compactMacroCell: {
            flex: 1,
            alignItems: 'center',
        },
        compactMacroLabel: {
            fontSize: 11,
            color: colors.textMuted,
            marginBottom: 6,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        compactMacroInput: {
            width: '100%',
            backgroundColor: colors.surfaceInset,
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 8,
            fontSize: 15,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.hairline,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        qtyRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.hairline,
        },
        ingredientFieldLabel: {
            fontSize: 13,
            color: colors.textMuted,
            width: 70,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        qtyInput: {
            flex: 1,
            backgroundColor: colors.surfaceInset,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.hairline,
            textAlign: 'center',
            fontFamily: fonts.regular,
        },
        unitLabel: {
            fontSize: 13,
            color: colors.placeholder,
            width: 70,
            fontFamily: fonts.regular,
        },
        macroGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        macroGridCell: {
            width: '48%',
            backgroundColor: colors.surfaceInset,
            borderRadius: 8,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.hairline,
        },
        macroGridLabel: {
            fontSize: 12,
            color: colors.textMuted,
            marginBottom: 6,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        macroGridInput: {
            fontSize: 18,
            color: colors.text,
            paddingVertical: 4,
            borderBottomWidth: 1,
            borderBottomColor: colors.hairline,
            marginBottom: 4,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        macroGridUnit: {
            fontSize: 11,
            color: colors.placeholder,
            fontFamily: fonts.regular,
        },
        totalsCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            padding: 18,
            marginTop: 6,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.nutrition,
        },
        totalsCardTitle: {
            fontSize: 12,
            color: colors.nutrition,
            letterSpacing: -0.5,
            textTransform: 'uppercase',
            marginBottom: 14,
            textAlign: 'center',
            fontFamily: fonts.semibold,
        },
        totalsRow: {
            flexDirection: 'row',
            justifyContent: 'space-around',
        },
        totalCol: {
            alignItems: 'center',
            flex: 1,
            position: 'relative',
        },
        totalValue: {
            fontSize: 20,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        totalUnit: {
            fontSize: 11,
            color: colors.nutrition,
            marginTop: 2,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        totalLabel: {
            fontSize: 11,
            color: colors.textMuted,
            marginTop: 3,
            letterSpacing: 0.2,
            fontFamily: fonts.regular,
        },
        totalDivider: {
            position: 'absolute',
            right: 0,
            top: '10%',
            height: '80%',
            width: 1,
            backgroundColor: colors.hairline,
        },
        saveButtonTouchable: {
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
            marginTop: 8,
        },
        saveButton: {
            borderRadius: 12,
            paddingVertical: 17,
            alignItems: 'center',
            justifyContent: 'center',
        },
        saveButtonText: {
            fontSize: 17,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
    })
}
