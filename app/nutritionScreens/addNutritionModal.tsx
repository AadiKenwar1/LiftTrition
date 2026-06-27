import { useAuth } from '@/context/AuthContext'
import { useBilling } from '@/context/BillingContext'
import { useNutrition } from '@/context/NutritionContext'
import { analyzeText } from '@/context/NutritionContext/functions/aiFunctions'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Utensils } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import uuid from 'react-native-uuid'

export default function AddNutritionModal() {
    const { handleAddNutrition, selectedDate } = useNutrition()
    const router = useRouter()
    const { userID } = useAuth()
    const { hasPremium } = useBilling()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    //State for the input fields
    const [mealName, setMealName] = useState('')
    const [calories, setCalories] = useState('')
    const [protein, setProtein] = useState('')
    const [carbs, setCarbs] = useState('')
    const [fats, setFats] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)

    // AI generation state
    const [generating, setGenerating] = useState(false)
    const insets = useSafeAreaInsets()
    const scrollBottomPad = Math.max(insets.bottom, 20) + 120

    //Adds a new entry to the nutrition context
    const handleAddEntry = () => {
        const newEntry = {
            id: uuid.v4() as string,
            userId: userID,
            name: mealName.trim() || 'Unnamed Entry',
            date: new Date(selectedDate),
            time: Date.now(),
            protein: protein.trim() ? parseFloat(protein) : 0,
            carbs: carbs.trim() ? parseFloat(carbs) : 0,
            fats: fats.trim() ? parseFloat(fats) : 0,
            calories: calories.trim() ? parseFloat(calories) : 0,
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
        } catch (error: unknown) {
            const message = (error instanceof Error ? error.message : null) ?? 'Unable to generate macros.'
            Alert.alert('Generation Failed', message, [{ text: 'OK' }])
        } finally {
            setGenerating(false)
        }
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces>
                {/* Icon Section */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Utensils size={50} color={colors.nutrition} strokeWidth={2.5} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                    Add Nutrition
                </Text>
                <Text style={styles.subtitle} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={3}>
                    Log your nutrition with AI assistance
                </Text>

                {/* Meal Name Input */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}>
                        Describe meal
                    </Text>
                    <View style={styles.inputContainer}>
                        <TextInput style={[styles.input, focusedField === 'mealName' && styles.inputFocused]} placeholder="e.g., Grilled Chicken Salad" placeholderTextColor={colors.placeholder} value={mealName} onChangeText={setMealName} onFocus={() => setFocusedField('mealName')} onBlur={() => setFocusedField(null)} multiline numberOfLines={2} textAlignVertical="top" />
                    </View>

                    {/* Generate all macros with AI */}
                    <TouchableOpacity style={[styles.generateButton, !hasPremium && styles.generateButtonUnavailable]} activeOpacity={0.8} disabled={generating} onPress={() => (hasPremium ? handleGenerateAllMacros() : router.replace('/settingsScreens/subscription'))}>
                        {generating ?
                            <ActivityIndicator size="small" color={colors.nutrition} />
                        :   <View style={styles.generateButtonContent}>
                                <Ionicons name="sparkles-outline" size={20} color={hasPremium ? colors.nutrition : colors.placeholder} />
                                <Text style={[styles.generateButtonText, !hasPremium && styles.generateButtonTextUnavailable]}>{hasPremium ? 'Generate Macros with AI' : 'Generate Macros (Premium)'}</Text>
                            </View>
                        }
                    </TouchableOpacity>
                </View>

                {/* Macros Section */}
                <View style={styles.macrosSection}>
                    <Text style={styles.sectionTitle} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}>
                        Macronutrients
                    </Text>

                    {/* Calories */}
                    <View style={styles.macroInputRow}>
                        <View style={styles.macroLabelColumn}>
                            <Text style={styles.macroLabel} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={2}>
                                Calories
                            </Text>
                            <Text style={styles.macroUnit} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                                (kcal)
                            </Text>
                        </View>
                        <TextInput style={[styles.macroInput, focusedField === 'calories' && styles.inputFocused]} placeholder="0" placeholderTextColor={colors.placeholder} value={calories} onChangeText={setCalories} onFocus={() => setFocusedField('calories')} onBlur={() => setFocusedField(null)} keyboardType="numeric" />
                    </View>

                    {/* Fats */}
                    <View style={styles.macroInputRow}>
                        <View style={styles.macroLabelColumn}>
                            <Text style={styles.macroLabel} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={2}>
                                Fats
                            </Text>
                            <Text style={styles.macroUnit} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                                (g)
                            </Text>
                        </View>
                        <TextInput style={[styles.macroInput, focusedField === 'fats' && styles.inputFocused]} placeholder="0" placeholderTextColor={colors.placeholder} value={fats} onChangeText={setFats} onFocus={() => setFocusedField('fats')} onBlur={() => setFocusedField(null)} keyboardType="numeric" />
                    </View>

                    {/* Carbs */}
                    <View style={styles.macroInputRow}>
                        <View style={styles.macroLabelColumn}>
                            <Text style={styles.macroLabel} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={2}>
                                Carbs
                            </Text>
                            <Text style={styles.macroUnit} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                                (g)
                            </Text>
                        </View>
                        <TextInput style={[styles.macroInput, focusedField === 'carbs' && styles.inputFocused]} placeholder="0" placeholderTextColor={colors.placeholder} value={carbs} onChangeText={setCarbs} onFocus={() => setFocusedField('carbs')} onBlur={() => setFocusedField(null)} keyboardType="numeric" />
                    </View>

                    {/* Protein */}
                    <View style={styles.macroInputRow}>
                        <View style={styles.macroLabelColumn}>
                            <Text style={styles.macroLabel} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={2}>
                                Protein
                            </Text>
                            <Text style={styles.macroUnit} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                                (g)
                            </Text>
                        </View>
                        <TextInput style={[styles.macroInput, focusedField === 'protein' && styles.inputFocused]} placeholder="0" placeholderTextColor={colors.placeholder} value={protein} onChangeText={setProtein} onFocus={() => setFocusedField('protein')} onBlur={() => setFocusedField(null)} keyboardType="numeric" />
                    </View>
                </View>

                {/* Add Button */}
                <TouchableOpacity onPress={handleAddEntry} activeOpacity={0.8} style={styles.addButtonTouchable}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                        <Text style={styles.addButtonText} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1}>
                            Add Meal
                        </Text>
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
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 12,
        },
        iconContainer: {
            alignItems: 'center',
            marginBottom: 16,
            marginTop: 12,
        },
        iconCircle: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.nutrition,
        },
        title: {
            width: '100%',
            fontSize: 24,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 4,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        subtitle: {
            width: '100%',
            fontSize: 16,
            color: colors.labelMuted,
            textAlign: 'center',
            marginBottom: 20,
            fontFamily: fonts.regular,
            letterSpacing: 0.2,
        },
        inputSection: {
            marginBottom: 20,
        },
        inputContainer: {
            marginBottom: 0,
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            lineHeight: 20,
            minHeight: 68,
            textAlignVertical: 'top',
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        inputFocused: {
            borderColor: colors.nutrition,
        },
        macrosSection: {
            marginBottom: 20,
        },
        sectionTitle: {
            width: '100%',
            fontSize: 16,
            color: colors.text,
            marginBottom: 12,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        macroInputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
        },
        macroLabelColumn: {
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 72,
            maxWidth: 112,
            flexShrink: 1,
        },
        macroLabel: {
            width: '100%',
            fontSize: 16,
            color: colors.labelMuted,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        macroInput: {
            flex: 1,
            minWidth: 0,
            backgroundColor: colors.surface,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        macroUnit: {
            width: '100%',
            fontSize: 12,
            color: colors.textMuted,
            fontFamily: fonts.medium,
        },
        generateButton: {
            marginTop: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 48,
            paddingHorizontal: 16,
            backgroundColor: colors.nutrition + '22',
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.nutrition + '66',
        },
        generateButtonUnavailable: {
            backgroundColor: colors.textMuted + '40',
            borderColor: colors.textMuted + '80',
        },
        generateButtonContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        generateButtonText: {
            fontSize: 15,
            color: colors.nutrition,
            letterSpacing: -0.3,
            fontFamily: fonts.semibold,
        },
        generateButtonTextUnavailable: {
            color: colors.placeholder,
        },

        addButtonTouchable: {
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
            marginTop: 0,
        },
        addButton: {
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        addButtonText: {
            maxWidth: '100%',
            fontSize: 17,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
            textAlign: 'center',
        },
    })
}
