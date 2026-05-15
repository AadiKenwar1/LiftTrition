import { useNutrition } from '@/context/NutritionContext'
import { NutritionEntry } from '@/context/NutritionContext/types'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pencil } from 'lucide-react-native'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function EditManualEntry() {
    const router = useRouter()
    const { entry: entryParam } = useLocalSearchParams<{ entry: string }>()
    const { handleEditNutrition } = useNutrition()

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

    const macroFields = [
        { label: 'Calories', value: calories, setter: setCalories, key: 'calories', unit: 'kcal' },
        { label: 'Protein', value: protein, setter: setProtein, key: 'protein', unit: 'g' },
        { label: 'Carbs', value: carbs, setter: setCarbs, key: 'carbs', unit: 'g' },
        { label: 'Fats', value: fats, setter: setFats, key: 'fats', unit: 'g' },
    ] as const

    function handleSave() {
        const updatedEntry: NutritionEntry = {
            ...parsedEntry,
            name: name.trim() || parsedEntry.name,
            protein: parseFloat(protein) || 0,
            carbs: parseFloat(carbs) || 0,
            fats: parseFloat(fats) || 0,
            calories: parseFloat(calories) || 0,
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
                        <Pencil size={36} color="#22C922" strokeWidth={2.5} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Edit Entry</Text>
                <Text style={styles.subtitle}>Edit your meal macros</Text>

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

                {/* Macronutrients */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Macronutrients</Text>
                    {macroFields.map(({ label, value, setter, key, unit }) => (
                        <View key={key} style={styles.macroInputRow}>
                            <View style={styles.labelContainer}>
                                <Text style={styles.macroLabel}>{label}</Text>
                                <Text style={styles.macroUnit}>({unit === 'kcal' ? 'kcal' : 'g'})</Text>
                            </View>
                            <TextInput
                                style={[styles.macroInput, focusedField === key && styles.inputFocused]}
                                value={value}
                                onChangeText={setter}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#666"
                                onFocus={() => setFocusedField(key)}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    ))}
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
        backgroundColor: '#1e1e1e',
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
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
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
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 16,
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: 0.3,
        fontFamily: 'Poppins_600SemiBold',
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
    macroInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    labelContainer: {
        flexDirection: 'column',
    },
    macroLabel: {
        fontSize: 16,
        color: '#AAA',
        width: 70,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_600SemiBold',
    },
    macroInput: {
        flex: 1,
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
        fontSize: 12,
        color: '#888',
        width: 40,
        fontFamily: 'Poppins_500Medium',
    },
    saveButtonTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#22C922',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        marginTop: 0,
    },
    saveButton: {
        borderRadius: 12,
        paddingVertical: 16,
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
