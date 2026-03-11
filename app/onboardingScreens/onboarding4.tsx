import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { router } from 'expo-router'
import { useState } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

export default function Onboarding4Screen() {
    const { settings, setSettings, handleUpdateBw } = useSettings()
    const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial')
    const [height, setHeight] = useState('')
    const [weight, setWeight] = useState('')

    function handleNext() {
        if (!validateHeightWeight(Number(height), Number(weight), unitSystem)) {
            return
        } else {
            setSettings({
                ...settings,
                height: Number(height),
                bodyWeight: Number(weight),
                unitSystem: unitSystem,
            })
            handleUpdateBw(Number(weight))
            router.push('/onboardingScreens/onboarding5')
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.content}>
                    {/* Icon */}
                    <View style={styles.iconCircle}>
                        <FontAwesome5 name="pencil-ruler" size={65} color="#2f80ed" />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>What's your Measurements?</Text>
                    <Text style={styles.subtitleText}>We need this to calculate your BMR to adjust your nutrition goals.</Text>

                    {/* Unit System Toggle */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity style={[styles.toggleButton, unitSystem === 'imperial' && styles.toggleButtonActive]} onPress={() => setUnitSystem('imperial')} activeOpacity={0.7}>
                            <Text style={[styles.toggleText, unitSystem === 'imperial' && styles.toggleTextActive]}>Imperial</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleButton, unitSystem === 'metric' && styles.toggleButtonActive]} onPress={() => setUnitSystem('metric')} activeOpacity={0.7}>
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
        paddingTop: 50,
        paddingBottom: 50,
    },
    content: {
        alignItems: 'center',
        paddingTop: 40,
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
        fontSize: 22,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.2,
        marginBottom: 16,
        paddingHorizontal: 16,
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
    toggleButtonActive: {
        backgroundColor: 'rgba(45, 156, 255, 0.15)',
        borderColor: '#2f80ed',
    },
    toggleText: {
        fontSize: 18,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    toggleTextActive: {
        color: '#fff',
    },
    inputContainer: {
        width: '100%',
        gap: 20,
        marginBottom: 32,
    },
    inputGroup: {
        width: '100%',
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
        borderColor: '#242424',
        paddingHorizontal: 16,
        height: 60,
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
