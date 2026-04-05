import { useSettings } from '@/context/SettingsContext'
import { validateTargetWeight } from '@/context/SettingsContext/functions/validator'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Target } from 'lucide-react-native'
import { useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

const ACCENT = '#22C922'

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
            <View style={styles.outerContainer}>
                <LinearGradient colors={['rgba(34, 201, 34, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Icon */}
                    <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                        <Target size={86} color={ACCENT} strokeWidth={2} />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>What's Your {'\n'}Body Weight Goal?</Text>
                    <Text style={styles.subtitleText}>We use your body weight goal to adjust your nutrition goals</Text>

                    {/* Goal Options */}
                    <View style={styles.goalContainer}>
                        <TouchableOpacity style={[styles.goalButton, goal === 'lose' && { borderColor: ACCENT }]} onPress={() => setGoal('lose')} activeOpacity={0.7}>
                            <Text style={[styles.goalText, goal === 'lose' && styles.goalTextSelected]}>Lose</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.goalButton, goal === 'maintain' && { borderColor: ACCENT }]} onPress={() => setGoal('maintain')} activeOpacity={0.7}>
                            <Text style={[styles.goalText, goal === 'maintain' && styles.goalTextSelected]}>Maintain</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.goalButton, goal === 'gain' && { borderColor: ACCENT }]} onPress={() => setGoal('gain')} activeOpacity={0.7}>
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
                </ScrollView>
                {/* Navigation Buttons */}
                <View style={styles.navFooter}>
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
            </View>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#121212',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 220,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
        alignItems: 'center',
        paddingTop: 90,
        paddingBottom: 24,
    },
    navFooter: {
        paddingHorizontal: 25,
        paddingBottom: 50,
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
        lineHeight: 22,
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
        backgroundColor: '#242424',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#242424',
    },
    goalText: {
        fontSize: 16,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_500Medium',
    },
    goalTextSelected: {
        color: '#fff',
    },
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
        backgroundColor: '#242424',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#242424',
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
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
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
        backgroundColor: '#D4F5D4',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: ACCENT,
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
