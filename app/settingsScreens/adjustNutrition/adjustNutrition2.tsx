import StepProgress from '@/components/NeutralComponents/StepProgress'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { kgToLbs, lbsToKg } from '@/lib/utils/unitConversions'
import Slider from '@react-native-community/slider'
import { router, useLocalSearchParams } from 'expo-router'
import { Rabbit, Turtle } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

/**
 * Pace is DISPLAYED in the user's unit system but STORED in lb/week — macroCalculation.tsx assumes lbs
 * ((goalPace * 3500) / 7), so metric values are converted with kgToLbs before leaving this screen.
 */
const RANGES = {
    metric: { min: 0.1, max: 1.5, def: 0.5, unit: 'kg' },
    imperial: { min: 0.1, max: 3, def: 1, unit: 'lb' },
} as const

const paceLabel = (v: number, max: number) => {
    const f = v / max
    return f < 0.33 ? 'Slow' : f < 0.66 ? 'Moderate' : f < 0.9 ? 'Fast' : 'Very fast'
}

export default function AdjustNutrition2Screen() {
    const { settings } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const params = useLocalSearchParams<{ height: string; weight: string; unitSystem: string; goal: string; targetWeight: string }>()

    const metric = params.unitSystem === 'metric'
    const r = metric ? RANGES.metric : RANGES.imperial
    const [goalPace, setGoalPace] = useState<number>(() => {
        const displayPace = metric ? lbsToKg(settings.goalPace) : settings.goalPace
        return displayPace >= r.min && displayPace <= r.max ? displayPace : r.def
    })

    const handleNext = () => {
        router.push({
            pathname: '/settingsScreens/adjustNutrition/adjustNutrition3',
            params: {
                height: params.height,
                weight: params.weight,
                unitSystem: params.unitSystem,
                goal: params.goal,
                targetWeight: params.targetWeight,
                goalPace: (metric ? kgToLbs(goalPace) : goalPace).toString(),
            },
        })
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StepProgress current={1} total={4} accent={colors.text} />
                <Text style={styles.titleText}>How fast do you want to get there?</Text>
                <Text style={styles.subtitleText}>A faster pace means a bigger daily calorie change. You can adjust this later.</Text>

                <Animated.View entering={FadeInDown.duration(320)} style={styles.valueBlock}>
                    <Text style={styles.value}>{goalPace.toFixed(1)}</Text>
                    <Text style={styles.valueLabel}>{r.unit} / week · {paceLabel(goalPace, r.max)}</Text>
                </Animated.View>

                <View style={styles.sliderRow}>
                    <Turtle size={24} color={colors.textMuted} strokeWidth={2} />
                    <Slider style={styles.slider} minimumValue={r.min} maximumValue={r.max} step={0.1} value={goalPace} onValueChange={setGoalPace} minimumTrackTintColor={colors.nutrition} maximumTrackTintColor={colors.ringTrack} thumbTintColor={colors.nutrition} />
                    <Rabbit size={24} color={colors.textMuted} strokeWidth={2} />
                </View>
                <View style={styles.range}>
                    <Text style={styles.rangeText}>{r.min} {r.unit}</Text>
                    <Text style={styles.rangeText}>{r.max} {r.unit}</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        scroll: { flex: 1 },
        scrollContent: { paddingTop: 16, paddingBottom: 16 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 22, letterSpacing: 0.1, marginBottom: 26 },
        valueBlock: { alignItems: 'center', marginTop: 8, marginBottom: 28 },
        value: { fontFamily: fonts.extrabold, fontSize: 64, color: colors.text, letterSpacing: -2 },
        valueLabel: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3, marginTop: 2 },
        sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        slider: { flex: 1, height: 40 },
        range: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
        rangeText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, letterSpacing: 0.2 },
        footer: { paddingTop: 12 },
        nextButton: { width: '100%', height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        nextText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
