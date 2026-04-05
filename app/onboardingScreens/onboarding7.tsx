import { useSettings } from '@/context/SettingsContext'
import Slider from '@react-native-community/slider'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Gauge, Rabbit, Turtle } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const ACCENT = '#22C922'

export default function Onboarding7Screen() {
    const { settings, setSettings } = useSettings()
    const [goalPace, setGoalPace] = useState(1.0)

    const handleNext = () => {
        if (goalPace < 0.2 || goalPace > 3.0) {
            Alert.alert('Goal Pace Required', 'Please enter a goal pace between 0.2 and 3.0.', [{ text: 'OK' }])
        } else {
            setSettings({ ...settings, goalPace: goalPace })
            router.push('/onboardingScreens/onboarding8')
        }
    }

    const getPaceLabel = (value: number) => {
        if (value < 0.5) return 'Very Slow'
        if (value < 1.0) return 'Slow'
        if (value < 1.5) return 'Moderate'
        if (value < 2.0) return 'Fast'
        if (value < 2.5) return 'Very Fast'
        return 'Extreme'
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(34, 201, 34, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Icon */}
                <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                    <Gauge size={72} color={ACCENT} strokeWidth={2} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>How Fast Do You Want to Reach Your Body Weight Goal?</Text>
                <Text style={styles.subtitleText}>We use your goal pace to adjust your nutrition goals. {'\n'}(Pounds per week).</Text>

                {/* Slider Container */}
                <View style={styles.sliderContainer}>
                    {/* Current Value Display */}
                    <View style={styles.valueDisplay}>
                        <Text style={styles.valueText}>{goalPace.toFixed(1)}</Text>
                        <Text style={styles.valueLabelText}>{getPaceLabel(goalPace)}</Text>
                    </View>

                    {/* Slider with Icons */}
                    <View style={styles.sliderRow}>
                        <Turtle size={24} color="#666" strokeWidth={2} />
                        <Slider style={styles.slider} minimumValue={0.2} maximumValue={3.0} step={0.1} value={goalPace} onValueChange={setGoalPace} minimumTrackTintColor={ACCENT} maximumTrackTintColor="#333" thumbTintColor={ACCENT} />
                        <Rabbit size={24} color="#666" strokeWidth={2} />
                    </View>

                    {/* Min/Max Labels */}
                    <View style={styles.rangeLabels}>
                        <Text style={styles.rangeLabelText}>0.2</Text>
                        <Text style={styles.rangeLabelText}>3.0</Text>
                    </View>
                </View>
            </ScrollView>
            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>Next</Text>
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
        width: '100%',
        paddingTop: 90,
        paddingBottom: 16,
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
        fontSize: 24,
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
    sliderContainer: {
        width: '100%',
        paddingHorizontal: 12,
        marginBottom: 24,
    },
    valueDisplay: {
        alignItems: 'center',
        marginBottom: 24,
    },
    valueText: {
        color: '#fff',
        fontSize: 48,
        marginBottom: 6,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    valueLabelText: {
        fontSize: 24,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: 12,
    },
    slider: {
        flex: 1,
        height: 40,
    },
    rangeLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    rangeLabelText: {
        fontSize: 14,
        color: '#666',
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
