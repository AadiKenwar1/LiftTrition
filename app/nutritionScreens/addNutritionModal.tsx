import { useAuth } from '@/context/AuthContext'
import { useBilling } from '@/context/BillingContext'
import { useNutrition } from '@/context/NutritionContext'
import { analyzeText } from '@/context/NutritionContext/functions/aiFunctions'
import Ionicons from '@expo/vector-icons/Ionicons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Utensils } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import uuid from 'react-native-uuid'

export default function AddNutritionModal() {
    const { handleAddNutrition, selectedDate } = useNutrition()
    const router = useRouter()
    const { userID } = useAuth()
    const { hasPremium } = useBilling()
    //State for the input fields
    const [mealName, setMealName] = useState('')
    const [calories, setCalories] = useState('')
    const [protein, setProtein] = useState('')
    const [carbs, setCarbs] = useState('')
    const [fats, setFats] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)

    // AI generation state
    const [generating, setGenerating] = useState(false)
    const [lastGeneratedFood, setLastGeneratedFood] = useState('')
    const [cachedMacros, setCachedMacros] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null)
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

    //Generates macros for a given field
    const handleGenerateMacros = async (field: 'calories' | 'protein' | 'carbs' | 'fats') => {
        if (!mealName.trim()) {
            Alert.alert('Missing Food Name', 'Please enter a food name before generating macros.')
            return
        }
        const currentFoodName = mealName.trim()
        // Field setter mapping
        const macroSetters = { calories: setCalories, protein: setProtein, carbs: setCarbs, fats: setFats }
        // Check if we have cached macros for this food
        if (currentFoodName === lastGeneratedFood && cachedMacros) {
            macroSetters[field](cachedMacros[field].toString())
            return
        }
        setGenerating(true)
        try {
            const macros = await analyzeText(currentFoodName)
            // Update only the requested field
            macroSetters[field](macros[field].toString())
            // Cache all results for future use
            setLastGeneratedFood(currentFoodName)
            setCachedMacros(macros)
        } catch (error: any) {
            Alert.alert('Generation Failed', error.message + '. Please check internet connection and try again.' || 'Unable to generate macros. Please check internet connection and try again.', [{ text: 'OK' }])
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
                        <Utensils size={50} color="#22C922" strokeWidth={2.5} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                    Add Nutrition
                </Text>
                <Text style={styles.subtitle} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={3}>
                    Log your meal and macros
                </Text>

                {/* Meal Name Input */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}>
                        Meal Name
                    </Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, focusedField === 'mealName' && styles.inputFocused]}
                            placeholder="e.g., Grilled Chicken Salad"
                            placeholderTextColor="#666"
                            value={mealName}
                            onChangeText={setMealName}
                            onFocus={() => setFocusedField('mealName')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>
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
                        <TextInput
                            style={[styles.macroInput, focusedField === 'calories' && styles.inputFocused]}
                            placeholder="0"
                            placeholderTextColor="#666"
                            value={calories}
                            onChangeText={setCalories}
                            onFocus={() => setFocusedField('calories')}
                            onBlur={() => setFocusedField(null)}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            style={hasPremium ? styles.aiButton : styles.aiButtonUnavailable}
                            activeOpacity={0.5}
                            onPress={() => (hasPremium ? handleGenerateMacros('calories') : router.replace('/settingsScreens/subscription'))}
                            disabled={generating}
                        >
                            {generating ?
                                <ActivityIndicator size="small" color="#22C922" />
                            :   <Ionicons name="sparkles-outline" size={25} color={hasPremium ? '#22C922' : '#666'} />}
                        </TouchableOpacity>
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
                        <TextInput
                            style={[styles.macroInput, focusedField === 'protein' && styles.inputFocused]}
                            placeholder="0"
                            placeholderTextColor="#666"
                            value={protein}
                            onChangeText={setProtein}
                            onFocus={() => setFocusedField('protein')}
                            onBlur={() => setFocusedField(null)}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            style={hasPremium ? styles.aiButton : styles.aiButtonUnavailable}
                            activeOpacity={0.75}
                            onPress={() => (hasPremium ? handleGenerateMacros('protein') : router.replace('/settingsScreens/subscription'))}
                            disabled={generating}
                        >
                            {generating ?
                                <ActivityIndicator size="small" color="#22C922" />
                            :   <Ionicons name="sparkles-outline" size={25} color={hasPremium ? '#22C922' : '#666'} />}
                        </TouchableOpacity>
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
                        <TextInput
                            style={[styles.macroInput, focusedField === 'carbs' && styles.inputFocused]}
                            placeholder="0"
                            placeholderTextColor="#666"
                            value={carbs}
                            onChangeText={setCarbs}
                            onFocus={() => setFocusedField('carbs')}
                            onBlur={() => setFocusedField(null)}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            style={hasPremium ? styles.aiButton : styles.aiButtonUnavailable}
                            activeOpacity={0.75}
                            onPress={() => (hasPremium ? handleGenerateMacros('carbs') : router.replace('/settingsScreens/subscription'))}
                            disabled={generating}
                        >
                            {generating ?
                                <ActivityIndicator size="small" color="#22C922" />
                            :   <Ionicons name="sparkles-outline" size={25} color={hasPremium ? '#22C922' : '#666'} />}
                        </TouchableOpacity>
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
                        <TextInput
                            style={[styles.macroInput, focusedField === 'fats' && styles.inputFocused]}
                            placeholder="0"
                            placeholderTextColor="#666"
                            value={fats}
                            onChangeText={setFats}
                            onFocus={() => setFocusedField('fats')}
                            onBlur={() => setFocusedField(null)}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            style={hasPremium ? styles.aiButton : styles.aiButtonUnavailable}
                            activeOpacity={0.75}
                            onPress={() => (hasPremium ? handleGenerateMacros('fats') : router.replace('/settingsScreens/subscription'))}
                            disabled={generating}
                        >
                            {generating ?
                                <ActivityIndicator size="small" color="#22C922" />
                            :   <Ionicons name="sparkles-outline" size={25} color={hasPremium ? '#22C922' : '#666'} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Add Button */}
                <TouchableOpacity onPress={handleAddEntry} activeOpacity={0.8} style={styles.addButtonTouchable}>
                    <LinearGradient colors={['#179F17', '#22C922', '#3BE63B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                        <Text style={styles.addButtonText} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1}>
                            Add Meal
                        </Text>
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
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#22C922',
    },
    title: {
        width: '100%',
        fontSize: 24,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitle: {
        width: '100%',
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    inputSection: {
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 0,
    },
    input: {
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#1e1e1e',
        fontFamily: 'Poppins_400Regular',
    },
    inputFocused: {
        borderColor: '#22C922',
    },
    macrosSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        width: '100%',
        fontSize: 16,
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
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
        color: '#AAA',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    macroInput: {
        flex: 1,
        minWidth: 0,
        backgroundColor: '#1e1e1e',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#1e1e1e',
        fontFamily: 'Poppins_400Regular',
    },
    macroUnit: {
        width: '100%',
        fontSize: 12,
        color: '#888',
        fontFamily: 'Poppins_500Medium',
    },
    aiButton: {
        paddingHorizontal: 9,
        paddingVertical: 9,
        backgroundColor: 'rgba(34, 201, 34, 0.12)',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(34, 201, 34, 0.25)',
    },
    aiButtonUnavailable: {
        paddingHorizontal: 9,
        paddingVertical: 9,
        backgroundColor: 'rgba(136, 136, 136, 0.25)',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(136, 136, 136, 0.5)',
    },

    addButtonTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#22C922',
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
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
})
