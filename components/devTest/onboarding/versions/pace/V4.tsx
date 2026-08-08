import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import Slider from '@react-native-community/slider'
import { useRouter } from 'expo-router'
import { Rabbit, Turtle } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useOnboardingFlow } from '../_shared/flowContext'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V4 Pace — the slider (track + thumb) is nutrition-green, continuing the green thread from the
 * eating-phase choice; the rest of the screen stays neutral. Unit + range follow the user's About You
 * choice, and the label buckets are derived from the actual slider range so every label (Slow→Very fast)
 * is reachable — no dead "Extreme". Inert.
 */
// max is the shipped PACE_CEILING in each unit system (kg side floored to its own 0.1 step, 2 lb → 0.9 kg).
const RANGES = {
    metric: { min: 0.1, max: 0.9, step: 0.1, def: 0.5, unit: 'kg' },
    imperial: { min: 0.1, max: 2, step: 0.1, def: 1, unit: 'lb' },
} as const

const paceLabel = (v: number, max: number) => {
    const f = v / max
    return f < 0.33 ? 'Slow' : f < 0.66 ? 'Moderate' : f < 0.9 ? 'Fast' : 'Very fast'
}

export default function PaceV4() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.text
    const r = flow?.data.unit === 'metric' ? RANGES.metric : RANGES.imperial
    const [pace, setPace] = useState<number>(r.def)

    return (
        <V4Screen step={5} totalSteps={9} eyebrow="Step 6 of 9" title="How fast do you want to get there?" subtitle="A faster pace means a bigger daily calorie change. You can adjust this later." accent={accent} onBack={() => router.back()} onNext={() => {}}>
            <Animated.View entering={FadeInDown.duration(320)} style={styles.valueBlock}>
                <Text style={styles.value}>{pace.toFixed(1)}</Text>
                <Text style={styles.valueLabel}>{r.unit} / week · {paceLabel(pace, r.max)}</Text>
            </Animated.View>

            <View style={styles.sliderRow}>
                <Turtle size={24} color={colors.textMuted} strokeWidth={2} />
                <Slider style={styles.slider} minimumValue={r.min} maximumValue={r.max} step={r.step} value={pace} onValueChange={setPace} minimumTrackTintColor={colors.nutrition} maximumTrackTintColor={colors.ringTrack} thumbTintColor={colors.nutrition} />
                <Rabbit size={24} color={colors.textMuted} strokeWidth={2} />
            </View>
            <View style={styles.range}>
                <Text style={styles.rangeText}>{r.min} {r.unit}</Text>
                <Text style={styles.rangeText}>{r.max} {r.unit}</Text>
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
