import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { router } from 'expo-router'
import { useState } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

const ACCENT = { workout: '#2f80ed', nutrition: '#22C922' }
const ACCENT_RGBA = { workout: 'rgba(45, 156, 255, 0.15)', nutrition: 'rgba(34, 201, 34, 0.15)' }

export default function AdjustNutrition1Screen() {
    const { settings, setSettings, handleUpdateBw, calculateMacros, mode } = useSettings()
    const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>(settings.unitSystem)
    const [height, setHeight] = useState(settings.height.toString())
    const [weight, setWeight] = useState(settings.bodyWeight.toString())
    const accent = mode ? ACCENT.workout : ACCENT.nutrition
    const accentRgba = mode ? ACCENT_RGBA.workout : ACCENT_RGBA.nutrition

    function handleSave() {
        if (!validateHeightWeight(Number(height), Number(weight), unitSystem)) return

        const updatedSettings = {
            ...settings,
            height: Number(height),
            bodyWeight: Number(weight),
            unitSystem,
        }
        const macros = calculateMacros(updatedSettings, unitSystem === 'imperial')

        setSettings({
            ...updatedSettings,
            calorieGoal: macros.calResult,
            proteinGoal: macros.proteinGrams,
            carbsGoal: macros.carbGrams,
            fatsGoal: macros.fatGrams,
        })
        handleUpdateBw(Number(weight)) // Updates bwProgress; it also calls setSettings - see note below
        router.back()
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                {/* Icon */}
                <View style={[styles.iconCircle, { borderColor: accent }]}>
                    <FontAwesome5 name="pencil-ruler" size={65} color={accent} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Update Your Measurements</Text>

                {/* Subtitle */}
                <Text style={styles.subtitleText}>Nutrition calculations will be updated</Text>

                {/* Unit System Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity style={[styles.toggleButton, unitSystem === 'imperial' && { backgroundColor: accentRgba, borderColor: accent }]} onPress={() => setUnitSystem('imperial')} activeOpacity={0.7}>
                        <Text style={[styles.toggleText, unitSystem === 'imperial' && styles.toggleTextActive]}>Imperial</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleButton, unitSystem === 'metric' && { backgroundColor: accentRgba, borderColor: accent }]} onPress={() => setUnitSystem('metric')} activeOpacity={0.7}>
                        <Text style={[styles.toggleText, unitSystem === 'metric' && styles.toggleTextActive]}>Metric</Text>
                    </TouchableOpacity>
                </View>

                {/* Input Fields */}
                <View style={styles.inputContainer}>
                    {/* Height Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Height</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '70' : '178'} placeholderTextColor="#555" keyboardType="numeric" value={height} onChangeText={setHeight} />
                            <Text style={styles.unitText}>{unitSystem === 'imperial' ? 'in' : 'cm'}</Text>
                        </View>
                    </View>

                    {/* Weight Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Weight</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor="#555" keyboardType="numeric" value={weight} onChangeText={setWeight} />
                            <Text style={styles.unitText}>{unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                        </View>
                    </View>
                </View>

                {/* Next Button */}
                <TouchableOpacity style={[styles.nextButton, { backgroundColor: accent, shadowColor: accent }]} onPress={handleSave} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>Save</Text>
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 25,
        paddingTop: 20,
        paddingBottom: 40,
        alignItems: 'center',
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#242424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 12,
    },
    titleText: {
        fontSize: 22,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.2,
        marginBottom: 24,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    toggleContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginBottom: 24,
    },
    toggleButton: {
        flex: 1,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#242424',
    },
    toggleText: {
        fontSize: 16,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    toggleTextActive: { color: '#fff' },
    inputContainer: {
        width: '100%',
        gap: 16,
        marginBottom: 32,
    },
    inputGroup: { width: '100%' },
    inputLabel: {
        fontSize: 16,
        color: '#aaa',
        marginBottom: 8,
        paddingLeft: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#242424',
        paddingHorizontal: 16,
        height: 60,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    unitText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    nextButton: {
        width: '100%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
