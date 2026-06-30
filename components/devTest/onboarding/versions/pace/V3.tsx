import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import Slider from '@react-native-community/slider'
import { useRouter } from 'expo-router'
import { Rabbit, Turtle } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import V3Screen from '../_shared/V3Screen'

/** Dev-only V3 (black & white) Pace — green accent. Fixes the hardcoded "pounds per week" unit. Inert. */
const UNIT = 'kg'
const getPaceLabel = (v: number) => (v < 0.5 ? 'Very slow' : v < 1.0 ? 'Slow' : v < 1.5 ? 'Moderate' : v < 2.0 ? 'Fast' : v < 2.5 ? 'Very fast' : 'Extreme')

export default function PaceV3() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const accent = colors.text
    const [pace, setPace] = useState(0.5)

    return (
        <V3Screen step={7} eyebrow="Step 8 of 12" title="How fast do you want to get there?" subtitle="A faster pace means a bigger daily calorie change. You can adjust this later." accent={accent} onBack={() => router.back()} onNext={() => {}}>
            <Animated.View entering={FadeInDown.duration(320)} style={styles.valueBlock}>
                <Text style={styles.value}>{pace.toFixed(1)}</Text>
                <Text style={styles.valueLabel}>{UNIT} / week · {getPaceLabel(pace)}</Text>
            </Animated.View>

            <View style={styles.sliderRow}>
                <Turtle size={24} color={colors.textMuted} strokeWidth={2} />
                <Slider style={styles.slider} minimumValue={0.1} maximumValue={1.5} step={0.1} value={pace} onValueChange={setPace} minimumTrackTintColor={accent} maximumTrackTintColor={colors.ringTrack} thumbTintColor={accent} />
                <Rabbit size={24} color={colors.textMuted} strokeWidth={2} />
            </View>
            <View style={styles.range}>
                <Text style={styles.rangeText}>0.1 {UNIT}</Text>
                <Text style={styles.rangeText}>1.5 {UNIT}</Text>
            </View>
        </V3Screen>
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
