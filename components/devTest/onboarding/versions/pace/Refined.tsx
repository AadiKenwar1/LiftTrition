import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import Slider from '@react-native-community/slider'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Gauge, Rabbit, Turtle } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import StepProgress from '../_shared/StepProgress'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/** Dev-only Refined Pace screen — restyled per RESTYLE_PLAN (theme tokens, dark + light). Inert. */
const getPaceLabel = (value: number) => {
    if (value < 0.5) return 'Very Slow'
    if (value < 1.0) return 'Slow'
    if (value < 1.5) return 'Moderate'
    if (value < 2.0) return 'Fast'
    if (value < 2.5) return 'Very Fast'
    return 'Extreme'
}

export default function PaceRefined() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.nutrition
    const router = useRouter()
    const topPad = useScreenTopPad()
    const [goalPace, setGoalPace] = useState(1.0)

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '14', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StepProgress current={7} total={12} accent={accent} />

                <View style={[styles.iconCircle, { borderColor: accent }]}>
                    <Gauge size={72} color={accent} strokeWidth={2} />
                </View>

                <Text style={styles.titleText}>How Fast Do You Want to Reach Your Body Weight Goal?</Text>
                <Text style={styles.subtitleText}>We use your goal pace to adjust your nutrition goals. {'\n'}(Pounds per week).</Text>

                <View style={styles.sliderContainer}>
                    <Animated.View entering={FadeInDown.duration(320)} style={styles.valueDisplay}>
                        <Text style={styles.valueText}>{goalPace.toFixed(1)}</Text>
                        <Text style={styles.valueLabelText}>{getPaceLabel(goalPace)}</Text>
                    </Animated.View>

                    <View style={styles.sliderRow}>
                        <Turtle size={24} color={colors.textMuted} strokeWidth={2} />
                        <Slider style={styles.slider} minimumValue={0.2} maximumValue={3.0} step={0.1} value={goalPace} onValueChange={setGoalPace} minimumTrackTintColor={accent} maximumTrackTintColor={colors.ringTrack} thumbTintColor={accent} />
                        <Rabbit size={24} color={colors.textMuted} strokeWidth={2} />
                    </View>

                    <View style={styles.rangeLabels}>
                        <Text style={styles.rangeLabelText}>0.2</Text>
                        <Text style={styles.rangeLabelText}>3.0</Text>
                    </View>
                </View>
            </ScrollView>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.85}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 25, paddingBottom: 50 },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
        scroll: { flex: 1 },
        scrollContent: { alignItems: 'center', width: '100%', paddingBottom: 16 },
        stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 28 },
        stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ringTrack },
        iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 12 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.text, letterSpacing: -0.5, marginBottom: 4, textAlign: 'center' },
        subtitleText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', letterSpacing: 0.2, marginBottom: 24, paddingHorizontal: 8, lineHeight: 22 },
        sliderContainer: { width: '100%', paddingHorizontal: 12, marginBottom: 24 },
        valueDisplay: { alignItems: 'center', marginBottom: 24 },
        valueText: { fontFamily: fonts.extrabold, color: colors.text, fontSize: 48, marginBottom: 6, letterSpacing: -0.5 },
        valueLabelText: { fontFamily: fonts.semibold, fontSize: 24, color: colors.textSecondary, letterSpacing: -0.5 },
        sliderRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 },
        slider: { flex: 1, height: 40 },
        rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
        rangeLabelText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, letterSpacing: 0.2 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff', letterSpacing: -0.5 },
    })
}
