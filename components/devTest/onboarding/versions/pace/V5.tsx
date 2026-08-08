import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import Slider from '@react-native-community/slider'
import { useRouter } from 'expo-router'
import { Rabbit, Turtle } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useOnboardingFlow } from '../_shared/flowContext'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V5 Pace — V4's slider, now WIRED. V4 collected a pace and never wrote it anywhere, so the very
 * next screen estimated weeks from a hardcoded rate while its subtitle said "at your pace". Here the value
 * goes into the flow's data bag (on release, not on every frame) and the default is seeded on mount so a
 * user who never drags the slider still gets an honest downstream estimate. Green slider; rest neutral.
 * Step 6 of 8, skipped entirely on the maintain path. Inert.
 *
 * Range is still V4's fixed 0.1–2 (imperial) / 0.1–0.9 (metric) — the flat PACE_CEILING, same as shipped.
 * Landing after About You means every input the calorie math needs now exists by the time this renders, so the
 * max COULD be narrowed further to whatever the user's maintenance burn supports — a pace steeper than that
 * drives the target under the 1,500 kcal (male) / 1,200 (female) daily minimum. Shipped does not narrow it:
 * nothing clamps the target, the honest number is stated and LowCalorieWarning says so. That per-body cap is
 * left out here on purpose — it lives only in the paceWizard prototype's devMaxPace, and V5 is the reorder only.
 */
// max is the shipped PACE_CEILING in each unit system (kg side floored to its own 0.1 step, 2 lb → 0.9 kg).
const RANGES = {
    metric: { min: 0.1, max: 0.9, step: 0.1, def: 0.5 },
    imperial: { min: 0.1, max: 2, step: 0.1, def: 1 },
} as const

const paceLabel = (v: number, max: number) => {
    const f = v / max
    return f < 0.33 ? 'Slow' : f < 0.66 ? 'Moderate' : f < 0.9 ? 'Fast' : 'Very fast'
}

export default function PaceV5() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.text
    const unitSystem = flow?.data.unit === 'metric' ? 'metric' : 'imperial'
    const r = RANGES[unitSystem]
    const unit = weightUnitLabel(unitSystem)
    const [pace, setPace] = useState<number>(r.def)

    // Seed the default so the projection is honest even if the slider is never touched. `flow` is rebuilt on
    // every FlowRunner render, so listing it here would re-fire this effect forever.
    useEffect(() => {
        flow?.setData('pace', String(r.def))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <V4Screen step={5} totalSteps={8} eyebrow="Step 6 of 8" title="How fast do you want to get there?" subtitle="A faster pace means a bigger daily calorie change. You can adjust this later." accent={accent} onBack={() => router.back()} onNext={() => {}}>
            <Animated.View entering={FadeInDown.duration(320)} style={styles.valueBlock}>
                <Text style={styles.value}>{pace.toFixed(1)}</Text>
                <Text style={styles.valueLabel}>{unit} / week · {paceLabel(pace, r.max)}</Text>
            </Animated.View>

            <View style={styles.sliderRow}>
                <Turtle size={24} color={colors.textMuted} strokeWidth={2} />
                <Slider style={styles.slider} minimumValue={r.min} maximumValue={r.max} step={r.step} value={pace} onValueChange={setPace} onSlidingComplete={(v) => flow?.setData('pace', String(v))} minimumTrackTintColor={colors.nutrition} maximumTrackTintColor={colors.ringTrack} thumbTintColor={colors.nutrition} />
                <Rabbit size={24} color={colors.textMuted} strokeWidth={2} />
            </View>
            <View style={styles.range}>
                <Text style={styles.rangeText}>{r.min} {unit}</Text>
                <Text style={styles.rangeText}>{r.max} {unit}</Text>
            </View>
        </V4Screen>
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
