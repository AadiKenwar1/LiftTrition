import { useSettings } from '@/context/SettingsContext'
import { validateTargetWeight } from '@/context/SettingsContext/functions/validator'
import Octicons from '@expo/vector-icons/Octicons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

export default function Onboarding6Screen() {
    const { settings, setSettings } = useSettings()
    const [goal, setGoal] = useState<'lose' | 'gain' | 'maintain' | null>('maintain')
    const [targetWeight, setTargetWeight] = useState('')

    function handleNext() {
        if (goal === 'maintain') {
            setSettings({
                ...settings,
                goalType: 'maintain',
                goalWeight: settings.bodyWeight,
            })
            router.push('/onboardingScreens/onboarding8')
        } else {
            if (!validateTargetWeight(Number(targetWeight), settings.bodyWeight, goal, settings.unitSystem)) return
            setSettings({
                ...settings,
                goalType: goal as 'lose' | 'gain',
                goalWeight: Number(targetWeight),
            })
            router.push('/onboardingScreens/onboarding7')
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.content}>
                    {/* Icon */}
                    <View style={styles.iconCircle}>
                        <Octicons name="goal" size={72} color="#2f80ed" />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>What's Your {'\n'}Body Weight Goal?</Text>
                    <Text style={styles.subtitleText}>We use this adjust your nutrition goals.</Text>

                    {/* Goal Options */}
                    <View style={styles.goalContainer}>
                        <TouchableOpacity style={[styles.goalButton, goal === 'lose' && styles.goalButtonSelected]} onPress={() => setGoal('lose')} activeOpacity={0.7}>
                            <Text style={[styles.goalText, goal === 'lose' && styles.goalTextSelected]}>Lose</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.goalButton, goal === 'maintain' && styles.goalButtonSelected]} onPress={() => setGoal('maintain')} activeOpacity={0.7}>
                            <Text style={[styles.goalText, goal === 'maintain' && styles.goalTextSelected]}>Maintain</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.goalButton, goal === 'gain' && styles.goalButtonSelected]} onPress={() => setGoal('gain')} activeOpacity={0.7}>
                            <Text style={[styles.goalText, goal === 'gain' && styles.goalTextSelected]}>Gain</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Target Weight Input or Maintain Message */}
                    {goal && goal !== 'maintain' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Target Weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} placeholder={settings.unitSystem === 'imperial' ? '150' : '68'} placeholderTextColor="#555" keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} />
                                <Text style={styles.unitText}>{settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                            </View>
                        </View>
                    )}

                    {goal === 'maintain' && (
                        <View style={styles.maintainMessageContainer}>
                            <Text style={styles.maintainMessageText}>Maintaining body weight, so no target weight needed</Text>
                        </View>
                    )}
                </View>

                {/* Navigation Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            router.back()
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 25,
        paddingTop: 60,
        paddingBottom: 50,
    },
    content: {
        alignItems: 'center',
        paddingTop: 40,
        marginBottom: 32,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#242424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2f80ed',
        marginBottom: 12,
    },
    titleText: {
        fontSize: 32,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.2,
        marginBottom: 32,
        paddingHorizontal: 16,
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
        borderColor: '#242424',
    },
    goalButtonSelected: {
        backgroundColor: 'rgba(45, 156, 255, 0.15)',
        borderColor: '#2f80ed',
    },
    goalText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#888',
        letterSpacing: -0.3,
    },
    goalTextSelected: {
        color: '#fff',
    },
    inputGroup: {
        width: '100%',
    },
    inputLabel: {
        fontSize: 16,
        color: '#aaa',
        marginBottom: 10,
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
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 18,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    unitText: {
        fontSize: 16,
        color: '#666',
        marginLeft: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    maintainMessageContainer: {
        width: '100%',
        paddingVertical: 20,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(45, 156, 255, 0.1)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(45, 156, 255, 0.3)',
    },
    maintainMessageText: {
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        gap: 12,
    },
    backButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#282A2C',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#242424',
    },
    backButtonText: {
        fontSize: 17,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    nextButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#2f80ed',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonText: {
        fontSize: 17,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
