import { useSettings } from '@/context/SettingsContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import Slider from '@react-native-community/slider'
import { router } from 'expo-router'
import { Rabbit, Turtle } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

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
            {/* Content */}
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Ionicons name="speedometer-sharp" size={72} color="#2f80ed" />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Whats Your Body {'\n'}Weight Goal Pace?</Text>
                <Text style={styles.subtitleText}>How fast do you want to reach your goal weight? {'\n'}(Pounds per week).</Text>

                {/* Slider Container */}
                <View style={styles.sliderContainer}>
                    {/* Current Value Display */}
                    <View style={styles.valueDisplay}>
                        <Text style={styles.valueText}>{goalPace.toFixed(1)}</Text>
                        <Text style={styles.valueLabelText}>{getPaceLabel(goalPace)}</Text>
                    </View>

                    {/* Slider with Icons */}
                    <View style={styles.sliderRow}>
                        <Turtle size={36} color="#666" strokeWidth={2} />
                        <Slider style={styles.slider} minimumValue={0.2} maximumValue={3.0} step={0.1} value={goalPace} onValueChange={setGoalPace} minimumTrackTintColor="#2f80ed" maximumTrackTintColor="#333" thumbTintColor="#2f80ed" />
                        <Rabbit size={36} color="#666" strokeWidth={2} />
                    </View>

                    {/* Min/Max Labels */}
                    <View style={styles.rangeLabels}>
                        <Text style={styles.rangeLabelText}>0.2</Text>
                        <Text style={styles.rangeLabelText}>3.0</Text>
                    </View>
                </View>
            </View>

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>Back</Text>
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
        lineHeight: 38,
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.2,
        marginBottom: 16,
        paddingHorizontal: 16,
        fontFamily: 'Poppins_400Regular',
    },
    sliderContainer: {
        width: '100%',
        paddingHorizontal: 12,
    },
    valueDisplay: {
        alignItems: 'center',
        marginBottom: 16,
    },
    valueText: {
        fontSize: 56,
        color: '#2f80ed',
        marginBottom: 0,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    valueLabelText: {
        fontSize: 20,
        color: '#888',
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
    closeButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#282A2C',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#242424',
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
    buttonText: {
        fontSize: 17,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    nextButtonText: {
        fontSize: 17,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
