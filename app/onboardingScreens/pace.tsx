import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import { useSettings } from '@/context/SettingsContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { kgToLbs } from '@/lib/utils/unitConversions'
import { onboardingStep } from '@/lib/onboarding/steps'
import Slider from '@react-native-community/slider'
import { router } from 'expo-router'
import { Rabbit, Turtle } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

/**
 * Onboarding — pace (green slider). Displayed in the user's unit but STORED as lb/week (macroCalculation
 * assumes lbs); metric converts via kgToLbs before persisting goalPace. Only reached on lose/gain.
 */
const RANGES = {
    metric: { min: 0.1, max: 1.5, def: 0.5, unit: 'kg' },
    imperial: { min: 0.1, max: 3, def: 1, unit: 'lbs' },
} as const

const paceLabel = (v: number, max: number) => {
    const f = v / max
    return f < 0.33 ? 'Slow' : f < 0.66 ? 'Moderate' : f < 0.9 ? 'Fast' : 'Very fast'
}

export default function OnboardingPace() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { settings, setSettings } = useSettings()
    const metric = settings.unitSystem === 'metric'
    const r = metric ? RANGES.metric : RANGES.imperial
    const [pace, setPace] = useState<number>(r.def)
    const { current, total } = onboardingStep('pace', settings.goalType)

    function handleNext() {
        setSettings({ ...settings, goalPace: metric ? kgToLbs(pace) : pace })
        router.push('/onboardingScreens/timeline')
    }

    return (
        <OnboardingScaffold step={current} total={total} title="How fast do you want to get there?" subtitle="A faster pace means a bigger daily calorie change. You can adjust this later." accent={colors.text} onBack={() => router.back()} onNext={handleNext}>
            <Animated.View entering={FadeInDown.duration(320)} style={styles.valueBlock}>
                <Text style={styles.value}>{pace.toFixed(1)}</Text>
                <Text style={styles.valueLabel}>{r.unit} / week · {paceLabel(pace, r.max)}</Text>
            </Animated.View>

            <View style={styles.sliderRow}>
                <Turtle size={24} color={colors.textMuted} strokeWidth={2} />
                <Slider style={styles.slider} minimumValue={r.min} maximumValue={r.max} step={0.1} value={pace} onValueChange={setPace} minimumTrackTintColor={colors.nutrition} maximumTrackTintColor={colors.ringTrack} thumbTintColor={colors.nutrition} />
                <Rabbit size={24} color={colors.textMuted} strokeWidth={2} />
            </View>
            <View style={styles.range}>
                <Text style={styles.rangeText}>{r.min} {r.unit}</Text>
                <Text style={styles.rangeText}>{r.max} {r.unit}</Text>
            </View>
        </OnboardingScaffold>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        valueBlock: { alignItems: 'center', marginTop: 8, marginBottom: 28 },
        value: { fontFamily: fonts.extrabold, fontSize: 64, color: colors.text, letterSpacing: -2 },
        valueLabel: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3, marginTop: 2 },
        sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        slider: { flex: 1, height: 40 },
        range: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
        rangeText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, letterSpacing: 0.2 },
    })
}
