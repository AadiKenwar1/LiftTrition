import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import { feetInchesToInches } from '@/lib/utils/unitConversions'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

const AMBER = '#FBBF24'

export default function Onboarding4Screen() {
    const { settings, setSettings, handleUpdateBw } = useSettings()
    const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial')
    const [heightFt, setHeightFt] = useState('')
    const [heightIn, setHeightIn] = useState('')
    const [height, setHeight] = useState('')
    const [weight, setWeight] = useState('')

    function handleNext() {
        const totalHeight = unitSystem === 'imperial'
            ? feetInchesToInches(Number(heightFt), Number(heightIn))
            : Number(height)

        if (!validateHeightWeight(totalHeight, Number(weight), unitSystem)) {
            return
        } else {
            setSettings({
                ...settings,
                height: totalHeight,
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
                <LinearGradient colors={['rgba(251, 191, 36, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Step Indicator */}
                    <View style={styles.stepIndicator}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <View key={i} style={[styles.stepDot, i === 2 && styles.stepDotActive]} />
                        ))}
                    </View>

                    {/* Icon */}
                    <View style={[styles.iconCircle, { borderColor: AMBER }]}>
                        <FontAwesome5 name="pencil-ruler" size={65} color={AMBER} />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>What's your Measurements?</Text>
                    <Text style={styles.subtitleText}>We use your height and weight for BMR and nutrition goal calculations.</Text>

                    {/* Unit System Toggle */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity style={[styles.toggleButton, unitSystem === 'imperial' && { borderColor: AMBER }]} onPress={() => setUnitSystem('imperial')} activeOpacity={0.5}>
                            <Text style={[styles.toggleText, unitSystem === 'imperial' && styles.toggleTextActive]}>Imperial</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleButton, unitSystem === 'metric' && { borderColor: AMBER }]} onPress={() => setUnitSystem('metric')} activeOpacity={0.5}>
                            <Text style={[styles.toggleText, unitSystem === 'metric' && styles.toggleTextActive]}>Metric</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input Fields */}
                    <View style={styles.inputContainer}>
                        {/* Height Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Height</Text>
                            {unitSystem === 'imperial' ? (
                                <View style={styles.ftInRow}>
                                    <View style={[styles.inputWrapper, styles.ftInBox]}>
                                        <TextInput style={styles.input} placeholder="5" placeholderTextColor="#555" keyboardType="numeric" value={heightFt} onChangeText={setHeightFt} />
                                        <Text style={styles.unitText}>ft</Text>
                                    </View>
                                    <View style={[styles.inputWrapper, styles.ftInBox]}>
                                        <TextInput style={styles.input} placeholder="11" placeholderTextColor="#555" keyboardType="numeric" value={heightIn} onChangeText={setHeightIn} />
                                        <Text style={styles.unitText}>in</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.inputWrapper}>
                                    <TextInput style={styles.input} placeholder="178" placeholderTextColor="#555" keyboardType="numeric" value={height} onChangeText={setHeight} />
                                    <Text style={styles.unitText}>cm</Text>
                                </View>
                            )}
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
                </ScrollView>

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
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 16,
    },
    stepIndicator: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 28,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#333',
    },
    stepDotActive: {
        width: 24,
        backgroundColor: '#FBBF24',
        borderRadius: 4,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#282A2C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
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
        lineHeight: 22,
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
    toggleTextActive: {
        color: '#fff',
    },
    inputContainer: {
        width: '100%',
        gap: 16,
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
    ftInRow: {
        flexDirection: 'row',
        gap: 12,
    },
    ftInBox: {
        flex: 1,
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
        backgroundColor: '#FFF1CC',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: AMBER,
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
