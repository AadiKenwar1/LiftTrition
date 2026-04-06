import { useNutrition } from '@/context/NutritionContext'
import { Ingredient, NutritionEntry } from '@/context/NutritionContext/types'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Camera, Plus, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const INGREDIENT_MACROS: (keyof Ingredient)[] = ['calories', 'protein', 'carbs', 'fats']

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
                        <Camera size={36} color="#22C922" strokeWidth={2.5} />
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
                        placeholderTextColor="#555"
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
                                    placeholderTextColor="#555"
                                    onFocus={() => setFocusedField(`iname-${index}`)}
                                    onBlur={() => setFocusedField(null)}
                                />
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeIngredient(index)} activeOpacity={0.5}>
                                    <Trash2 size={16} color="#FF453A" strokeWidth={2} />
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
                                            placeholderTextColor="#555"
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
                                        placeholderTextColor="#555"
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
                                        <Text style={styles.ingredientTotalValue}>{Math.round(ingredient.protein * ingredient.quantity * 10) / 10}</Text>
                                        <Text style={styles.ingredientTotalLabel}>Protein{'\n'}(g)</Text>
                                    </View>
                                    <View style={styles.ingredientTotalItem}>
                                        <Text style={styles.ingredientTotalValue}>{Math.round(ingredient.carbs * ingredient.quantity * 10) / 10}</Text>
                                        <Text style={styles.ingredientTotalLabel}>Carbs{'\n'}(g)</Text>
                                    </View>
                                    <View style={styles.ingredientTotalItem}>
                                        <Text style={styles.ingredientTotalValue}>{Math.round(ingredient.fats * ingredient.quantity * 10) / 10}</Text>
                                        <Text style={styles.ingredientTotalLabel}>Fats{'\n'}(g)</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}

                    <View style={styles.addIngredientBelowWrap}>
                        <TouchableOpacity style={styles.addIngredientBtn} onPress={addIngredient} activeOpacity={0.75}>
                            <View style={styles.addIngredientIconCircle}>
                                <Plus size={20} color="#5CE073" strokeWidth={2.5} />
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
                                { label: 'Protein', value: `${totals.protein}`, unit: 'g' },
                                { label: 'Carbs', value: `${totals.carbs}`, unit: 'g' },
                                { label: 'Fats', value: `${totals.fats}`, unit: 'g' },
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
                    <LinearGradient colors={['#3CB855', '#22C922', '#5CE073']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
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
        backgroundColor: '#333',
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
        backgroundColor: '#282A2C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#22C922',
    },
    title: {
        fontSize: 24,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    section: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 16,
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    addIngredientBelowWrap: {
        width: '100%',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#282A2C',
        fontFamily: 'Poppins_400Regular',
    },
    inputFocused: {
        borderColor: '#22C922',
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
        backgroundColor: 'rgba(34, 201, 34, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(34, 201, 34, 0.28)',
    },
    addIngredientIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(34, 201, 34, 0.14)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(34, 201, 34, 0.35)',
    },
    addIngredientBtnText: {
        fontSize: 15,
        color: '#F0F0F0',
        letterSpacing: -0.4,
        fontFamily: 'Poppins_600SemiBold',
    },
    ingredientCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    ingredientHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    ingredientNameInput: {
        flex: 1,
        backgroundColor: '#282A2C',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#FFF',
        borderWidth: 1,
        borderColor: '#333',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantitySection: {
        marginTop: 12,
        marginBottom: 12,
        paddingTop: 12,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
    },
    quantitySectionLabel: {
        fontSize: 11,
        color: '#22C922',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
        textTransform: 'uppercase',
        fontFamily: 'Poppins_600SemiBold',
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
        backgroundColor: '#242424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#22C922',
    },
    quantityButtonText: {
        fontSize: 20,
        color: '#22C922',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    quantityInput: {
        width: 70,
        backgroundColor: '#242424',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 18,
        color: '#FFF',
        borderWidth: 1.5,
        borderColor: '#22C922',
        textAlign: 'center',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    quantityInputFocused: {
        borderColor: '#5CE073',
        backgroundColor: '#1a1a1a',
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
        color: '#AAA',
        width: 70,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    macroRowInput: {
        flex: 1,
        backgroundColor: '#282A2C',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#282A2C',
        fontFamily: 'Poppins_400Regular',
    },
    macroRowUnit: {
        fontSize: 14,
        color: 'grey',
        width: 70,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    ingredientTotals: {
        marginTop: 14,
        paddingTop: 14,
        paddingHorizontal: 10,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        backgroundColor: 'rgba(76, 217, 100, 0.05)',
        borderRadius: 8,
    },
    ingredientTotalsTitle: {
        fontSize: 12,
        color: '#22C922',
        marginBottom: 10,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
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
        color: '#FFF',
        marginBottom: 2,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    ingredientTotalLabel: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
        fontFamily: 'Poppins_400Regular',
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
        color: '#888',
        marginBottom: 6,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    compactMacroInput: {
        width: '100%',
        backgroundColor: '#242424',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 8,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 1,
        borderColor: '#333',
        textAlign: 'center',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#252525',
    },
    ingredientFieldLabel: {
        fontSize: 13,
        color: '#888',
        width: 70,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    qtyInput: {
        flex: 1,
        backgroundColor: '#242424',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#FFF',
        borderWidth: 1,
        borderColor: '#333',
        textAlign: 'center',
        fontFamily: 'Poppins_400Regular',
    },
    unitLabel: {
        fontSize: 13,
        color: '#666',
        width: 70,
        fontFamily: 'Poppins_400Regular',
    },
    macroGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    macroGridCell: {
        width: '48%',
        backgroundColor: '#242424',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    macroGridLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 6,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    macroGridInput: {
        fontSize: 18,
        color: '#FFF',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        marginBottom: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    macroGridUnit: {
        fontSize: 11,
        color: '#666',
        fontFamily: 'Poppins_400Regular',
    },
    totalsCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 18,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#22C922',
    },
    totalsCardTitle: {
        fontSize: 12,
        color: '#22C922',
        letterSpacing: -0.5,
        textTransform: 'uppercase',
        marginBottom: 14,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
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
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    totalUnit: {
        fontSize: 11,
        color: '#22C922',
        marginTop: 2,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    totalLabel: {
        fontSize: 11,
        color: '#888',
        marginTop: 3,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    totalDivider: {
        position: 'absolute',
        right: 0,
        top: '10%',
        height: '80%',
        width: 1,
        backgroundColor: '#2a2a2a',
    },
    saveButtonTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#22C922',
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
        fontFamily: 'Poppins_600SemiBold',
    },
})
