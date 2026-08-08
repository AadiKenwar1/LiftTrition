import LowCalorieWarning from '@/components/NutritionComponents/LowCalorieWarning'
import PaceCalorieReadout from '@/components/NutritionComponents/PaceCalorieReadout'
import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import { useSettings } from '@/context/SettingsContext'
import { calculateCalorieTarget, PACE_CEILING } from '@/context/SettingsContext/functions/macroCalculation'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { kgToLbs } from '@/lib/utils/unitConversions'
import { onboardingStep } from '@/lib/utils/onboardingSteps'
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
// max is PACE_CEILING in each unit system (kg side floored to its own 0.1 step, 2 lb → 0.9 kg).
const RANGES = {
    metric: { min: 0.1, max: 0.9, def: 0.5, unit: 'kg' },
    imperial: { min: 0.1, max: PACE_CEILING, def: 1, unit: 'lbs' },
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

    // Live cost of the pace under the thumb. Everything maintenanceCalories needs is already saved by
    // the time this screen renders — activity.tsx, goal.tsx and aboutYou.tsx each setSettings before
    // navigating — so only goalPace is stale, and the slider value overrides it. Same function the
    // plan screen runs, so the number quoted here is the number committed there.
    const { maintenance, target } = calculateCalorieTarget({ ...settings, goalPace: metric ? kgToLbs(pace) : pace }, !metric)

    function handleNext() {
        setSettings({ ...settings, goalPace: metric ? kgToLbs(pace) : pace })
        router.push('/onboardingScreens/plan')
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

            <PaceCalorieReadout target={target} maintenance={maintenance} goalType={settings.goalType} style={styles.readout} />
            <LowCalorieWarning calories={target} gender={settings.gender} align="center" style={styles.warning} />
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
        readout: { marginTop: 22 },
        warning: { marginTop: 12 },
    })
}
