import { useSettings } from '@/context/SettingsContext'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { router, useLocalSearchParams } from 'expo-router'
import { Beef, Droplet, Flame, Wheat } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function AdjustNutrition4Screen() {
    const { settings, setSettings, calculateMacros } = useSettings()
    const accent = '#22C922'
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
            calorieGoal: calculatedMacros.calResult,
            proteinGoal: calculatedMacros.proteinGrams,
            carbsGoal: calculatedMacros.carbGrams,
            fatsGoal: calculatedMacros.fatGrams,
        })
        router.push('/(tabs)/settings')
    }

    const handleCancel = () => {
        router.push('/(tabs)/settings')
    }

    return (
        <View style={styles.container}>
            {/* Icon */}
            <View style={[styles.iconCircle, { borderColor: accent }]}>
                <FontAwesome name="list-alt" size={72} color={accent} strokeWidth={2} />
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
                    <View style={styles.macroCard}>
                        <Flame size={18} color="#FF6B6B" strokeWidth={2} />
                        <Text style={styles.macroLabel}>Calories</Text>
                        <Text style={styles.macroValue}>{calculatedMacros.calResult}</Text>
                    </View>

                    {/* Protein */}
                    <View style={styles.macroCard}>
                        <Beef size={18} color="red" strokeWidth={2} />
                        <Text style={styles.macroLabel}>Protein</Text>
                        <Text style={styles.macroValue}>{calculatedMacros.proteinGrams}g</Text>
                    </View>
                </View>

                {/* Second Row */}
                <View style={styles.macrosRow}>
                    {/* Carbs */}
                    <View style={styles.macroCard}>
                        <Wheat size={18} color="#FFD93D" strokeWidth={2} />
                        <Text style={styles.macroLabel}>Carbs</Text>
                        <Text style={styles.macroValue}>{calculatedMacros.carbGrams}g</Text>
                    </View>

                    {/* Fats */}
                    <View style={styles.macroCard}>
                        <Droplet size={18} color="#22C922" strokeWidth={2} />
                        <Text style={styles.macroLabel}>Fats</Text>
                        <Text style={styles.macroValue}>{calculatedMacros.fatGrams}g</Text>
                    </View>
                </View>
            </View>

            {/* Note */}
            <Text style={styles.noteText}>You can adjust these goals anytime in settings {'\n'} *Note that updating body weight will automatically update nutrition goals</Text>

            {/* Button Container */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.7}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.saveButton]} onPress={handleSave} activeOpacity={0.8}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 25,
        paddingTop: 24,
        alignItems: 'center',
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#282A2C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 12,
    },
    titleText: {
        fontSize: 28,
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
        marginBottom: 12,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
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
        backgroundColor: '#242424',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#242424',
        gap: 6,
    },
    macroLabel: {
        fontSize: 13,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    macroValue: {
        fontSize: 24,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    noteText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#242424',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#242424',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    saveButton: {
        flex: 1,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        backgroundColor: 'white',
        shadowColor: '#22C922',
    },
    saveButtonText: {
        fontSize: 16,
        color: 'black',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
