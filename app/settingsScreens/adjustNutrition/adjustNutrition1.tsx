import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight, validateTargetWeight } from '@/context/SettingsContext/functions/validator'
import { router } from 'expo-router'
import { Target } from 'lucide-react-native'
import { useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

export default function AdjustNutrition2Screen() {
    const { settings, mode } = useSettings()
    const accent = '#22C922'

    const [goal, setGoal] = useState<'lose' | 'gain' | 'maintain' | null>(settings.goalType)
    const [targetWeight, setTargetWeight] = useState(settings.goalWeight.toString())

    function handleNext() {
        if (!validateHeightWeight(Number(settings.height), Number(settings.bodyWeight), settings.unitSystem as 'imperial' | 'metric')) return
        if (!validateTargetWeight(Number(targetWeight), Number(settings.bodyWeight), goal, settings.unitSystem as 'imperial' | 'metric')) return
        const commonParams = {
            height: settings.height.toString(),
            weight: settings.bodyWeight.toString(),
            unitSystem: settings.unitSystem,
            goal: goal as string,
            targetWeight: goal === 'maintain' ? settings.bodyWeight.toString() : targetWeight,
        }
        if (goal === 'maintain') {
            router.push({
                pathname: '/settingsScreens/adjustNutrition/adjustNutrition3',
                params: { ...commonParams, goalPace: '0' },
            })
        } else {
            router.push({ pathname: '/settingsScreens/adjustNutrition/adjustNutrition2', params: commonParams })
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="never">
                {/* Icon */}
                <View style={[styles.iconCircle, { borderColor: accent }]}>
                    <Target size={96} color={accent} strokeWidth={2} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>What's Your {'\n'}Bodyweight Goal?</Text>

                {/* Subtitle */}
                <Text style={styles.subtitleText}>Needed for nutrition calculation adjustments</Text>

                {/* Goal Options */}
                <View style={styles.goalContainer}>
                    <TouchableOpacity style={[styles.goalButton, goal === 'lose' && { borderColor: accent }]} onPress={() => setGoal('lose')} activeOpacity={0.7}>
                        <Text style={[styles.goalText, goal === 'lose' && styles.goalTextSelected]}>Lose</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.goalButton, goal === 'maintain' && { borderColor: accent }]} onPress={() => setGoal('maintain')} activeOpacity={0.7}>
                        <Text style={[styles.goalText, goal === 'maintain' && styles.goalTextSelected]}>Maintain</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.goalButton, goal === 'gain' && { borderColor: accent }]} onPress={() => setGoal('gain')} activeOpacity={0.7}>
                        <Text style={[styles.goalText, goal === 'gain' && styles.goalTextSelected]}>Gain</Text>
                    </TouchableOpacity>
                </View>

                {/* Target Weight Input or Maintain Message */}
                {goal && goal !== 'maintain' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Target Weight</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder="150" placeholderTextColor="#555" keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} />
                            <Text style={styles.unitText}>{settings.unitSystem === 'metric' ? 'kg' : 'lbs'}</Text>
                        </View>
                    </View>
                )}

                {goal === 'maintain' && (
                    <View style={[styles.maintainMessageContainer]}>
                        <Text style={styles.maintainMessageText}>Maintaining body weight, so no target weight needed</Text>
                    </View>
                )}

                {/* Next Button */}
                <TouchableOpacity style={[styles.nextButton]} onPress={handleNext} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
            </ScrollView>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 36,
    },
    scrollContent: {
        paddingHorizontal: 25,
        alignItems: 'center',
        paddingBottom: 200,
        flexGrow: 1,
        justifyContent: 'center',
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
        marginBottom: 24,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    goalContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
        marginBottom: 24,
    },
    goalButton: {
        flex: 1,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#282A2C',
    },
    goalText: {
        fontSize: 16,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_500Medium',
    },
    goalTextSelected: { color: '#fff' },
    inputGroup: {
        width: '100%',
        marginBottom: 24,
    },
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
        borderColor: '#282A2C',
        paddingHorizontal: 16,
        height: 60,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    unitText: {
        fontSize: 16,
        color: '#aaa',
        marginLeft: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    maintainMessageContainer: {
        width: '100%',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 24,
        backgroundColor: '#282A2C',
        borderColor: '#282A2C',
    },
    maintainMessageText: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
    nextButton: {
        width: '100%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        backgroundColor: '#D4F5D4',
        shadowColor: '#22C922',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#000',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
