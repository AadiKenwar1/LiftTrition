import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import Slider from '@react-native-community/slider'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { Gauge, Rabbit, Turtle } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function AdjustNutrition3Screen() {
    const { mode } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const params = useLocalSearchParams<{ height: string; weight: string; unitSystem: string; goal: string; targetWeight: string }>()
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
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Gauge size={72} color={colors.nutrition} strokeWidth={2} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Goal Pace?</Text>

                {/* Subtitle */}
                <Text style={styles.subtitleText}>How fast do you want to reach your bodyweight goal? {'\n'}(Pounds per week)</Text>

                {/* Slider Container */}
                <View style={styles.sliderContainer}>
                    {/* Current Value Display */}
                    <View style={styles.valueDisplay}>
                        <Text style={[styles.valueText]}>{goalPace.toFixed(1)}</Text>
                        <Text style={styles.valueLabelText}>{getPaceLabel(goalPace)}</Text>
                    </View>

                    {/* Slider with Icons */}
                    <View style={styles.sliderRow}>
                        <Turtle size={24} color={colors.textFaint} strokeWidth={2} />
                        <Slider style={styles.slider} minimumValue={0.2} maximumValue={3.0} step={0.1} value={goalPace} onValueChange={setGoalPace} minimumTrackTintColor={colors.nutrition} maximumTrackTintColor={colors.ringTrack} thumbTintColor={colors.nutrition} />
                        <Rabbit size={24} color={colors.textFaint} strokeWidth={2} />
                    </View>

                    {/* Min/Max Labels */}
                    <View style={styles.rangeLabels}>
                        <Text style={styles.rangeLabelText}>0.2</Text>
                        <Text style={styles.rangeLabelText}>3.0</Text>
                    </View>
                </View>

                {/* Next Button */}
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextButtonGradient}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scroll: {
            flex: 1,
            width: '100%',
        },
        scrollContent: {
            flexGrow: 1,
            alignItems: 'center',
            width: '100%',
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 40,
        },
        iconCircle: {
            width: 144,
            height: 144,
            borderRadius: 72,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.nutrition,
            marginBottom: 12,
        },
        titleText: {
            fontSize: 28,
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 4,
            textAlign: 'center',
            fontFamily: fonts.semibold,
        },
        subtitleText: {
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            letterSpacing: 0.2,
            marginBottom: 24,
            paddingHorizontal: 8,
            fontFamily: fonts.regular,
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
            color: colors.text,
            fontSize: 48,
            marginBottom: 6,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        valueLabelText: {
            fontSize: 24,
            color: colors.textSecondary,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
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
            color: colors.textFaint,
            letterSpacing: 0.2,
            fontFamily: fonts.medium,
        },
        nextButton: {
            width: '100%',
            height: 60,
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
        },
        nextButtonGradient: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
        },
        nextButtonText: {
            fontSize: 16,
            color: '#fff',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
    })
}
