import { useSettings } from '@/context/SettingsContext'
import Slider from '@react-native-community/slider'
import { router, useLocalSearchParams } from 'expo-router'
import { Gauge, Rabbit, Turtle } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const ACCENT = { workout: '#2f80ed', nutrition: '#22C922' }

export default function AdjustNutrition3Screen() {
    const { mode } = useSettings()
    const params = useLocalSearchParams<{ height: string; weight: string; unitSystem: string; goal: string; targetWeight: string }>()
    const accent = mode ? ACCENT.workout : ACCENT.nutrition
    const [goalPace, setGoalPace] = useState(0.5)

    const handleNext = () => {
        router.push({
            pathname: '/settingsScreens/adjustNutrition/adjustNutrition3',
            params: {
                height: params.height,
                weight: params.weight,
                unitSystem: params.unitSystem,
                goal: params.goal,
                targetWeight: params.targetWeight,
                goalPace: goalPace.toString(),
            },
        })
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
            {/* Icon */}
            <View style={[styles.iconCircle, { borderColor: accent }]}>
                <Gauge size={72} color={accent} strokeWidth={2} />
            </View>

            {/* Title */}
            <Text style={styles.titleText}>Goal Pace?</Text>

            {/* Subtitle */}
            <Text style={styles.subtitleText}>How fast do you want to reach your goal weight? {'\n'}(Pounds per week)</Text>

            {/* Slider Container */}
            <View style={styles.sliderContainer}>
                {/* Current Value Display */}
                <View style={styles.valueDisplay}>
                    <Text style={[styles.valueText, { color: accent }]}>{goalPace.toFixed(1)}</Text>
                    <Text style={styles.valueLabelText}>{getPaceLabel(goalPace)}</Text>
                </View>

                {/* Slider with Icons */}
                <View style={styles.sliderRow}>
                    <Turtle size={24} color="#666" strokeWidth={2} />
                    <Slider style={styles.slider} minimumValue={0.2} maximumValue={3.0} step={0.1} value={goalPace} onValueChange={setGoalPace} minimumTrackTintColor={accent} maximumTrackTintColor="#333" thumbTintColor={accent} />
                    <Rabbit size={24} color="#666" strokeWidth={2} />
                </View>

                {/* Min/Max Labels */}
                <View style={styles.rangeLabels}>
                    <Text style={styles.rangeLabelText}>0.2</Text>
                    <Text style={styles.rangeLabelText}>3.0</Text>
                </View>
            </View>

            {/* Next Button */}
            <TouchableOpacity style={[styles.nextButton, { backgroundColor: accent, shadowColor: accent }]} onPress={handleNext} activeOpacity={0.8}>
                <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 25,
        paddingTop: 36,
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
        fontSize: 48,
        marginBottom: 6,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    valueLabelText: {
        fontSize: 24,
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
    slider: { flex: 1, height: 40 },
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
