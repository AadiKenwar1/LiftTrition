import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/**
 * Dev-only redesign of the Summary step → the "goal projection" value moment before the paywall
 * (Fitbod/Noom pattern, onboardingresearch.md line 32). This is the flow's SIGNATURE screen: the data
 * IS the hero (big projected number + an animated line-draw chart), not a generic icon. Themed; inert.
 */
const CURRENT_WEIGHT = 75
const GOAL_WEIGHT = 70
const GOAL_PACE = 0.5
const UNIT = 'kg'
const LINE_LEN = 340

const weeks = Math.max(1, Math.round(Math.abs(CURRENT_WEIGHT - GOAL_WEIGHT) / GOAL_PACE))
const targetDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + weeks * 7)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})()

const AnimatedPath = Animated.createAnimatedComponent(Path)

export default function GoalProjectionRefined() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.nutrition
    const router = useRouter()
    const topPad = useScreenTopPad()
    const reduced = useReducedMotion()

    const draw = useSharedValue(reduced ? 1 : 0)
    useEffect(() => {
        if (!reduced) draw.value = withTiming(1, { duration: 1000 })
    }, [reduced, draw])
    const lineProps = useAnimatedProps(() => ({ strokeDashoffset: LINE_LEN * (1 - draw.value) }))

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '1F', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.eyebrow}>Your projection</Text>
                <View style={styles.heroRow}>
                    <Text style={styles.heroNumber}>{GOAL_WEIGHT}</Text>
                    <Text style={styles.heroUnit}>{UNIT}</Text>
                    <Text style={styles.heroBy}>by {targetDate}</Text>
                </View>
                <Text style={styles.subtitleText}>At your current pace, that's about {weeks} weeks. Your plan is ready.</Text>

                <View style={styles.chartCard}>
                    <Svg width="100%" height={190} viewBox="0 0 320 190">
                        <Defs>
                            <SvgGradient id="areaFillRefined" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={accent} stopOpacity={0.35} />
                                <Stop offset="1" stopColor={accent} stopOpacity={0} />
                            </SvgGradient>
                        </Defs>

                        <Path d="M24 46 C 120 60, 200 122, 296 132 L296 160 L24 160 Z" fill="url(#areaFillRefined)" />
                        <AnimatedPath d="M24 46 C 120 60, 200 122, 296 132" stroke={accent} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={LINE_LEN} animatedProps={lineProps} />

                        <Circle cx={24} cy={46} r={4.5} fill={accent} />
                        <Circle cx={296} cy={132} r={9} fill={accent} opacity={0.22} />
                        <Circle cx={296} cy={132} r={5} fill={accent} />

                        <SvgText x={24} y={32} fill={colors.text} fontSize={13} fontFamily={fonts.semibold} textAnchor="start">
                            {CURRENT_WEIGHT} {UNIT}
                        </SvgText>
                        <SvgText x={296} y={120} fill={accent} fontSize={13} fontFamily={fonts.semibold} textAnchor="end">
                            {GOAL_WEIGHT} {UNIT}
                        </SvgText>
                        <SvgText x={24} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="start">
                            Today
                        </SvgText>
                        <SvgText x={296} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="end">
                            {targetDate}
                        </SvgText>
                    </Svg>
                </View>

                <Animated.View entering={reduced ? undefined : FadeInDown.delay(400).duration(300)} style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: accent }]}>−{Math.abs(CURRENT_WEIGHT - GOAL_WEIGHT)} {UNIT}</Text>
                        <Text style={styles.statLabel}>to goal</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: accent }]}>{weeks} wk</Text>
                        <Text style={styles.statLabel}>estimated</Text>
                    </View>
                </Animated.View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.85}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
                        <Text style={styles.nextButtonText}>Continue</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 25, paddingBottom: 50 },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
        scroll: { flex: 1 },
        scrollContent: { paddingBottom: 16 },
        eyebrow: { fontFamily: fonts.semibold, fontSize: 13, color: colors.nutrition, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
        heroRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
        heroNumber: { fontFamily: fonts.extrabold, fontSize: 64, color: colors.text, letterSpacing: -2 },
        heroUnit: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.text, letterSpacing: -1, marginLeft: 4 },
        heroBy: { fontFamily: fonts.semibold, fontSize: 20, color: colors.textSecondary, letterSpacing: -0.5, marginLeft: 10 },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, letterSpacing: 0.2, marginTop: 6, marginBottom: 20, lineHeight: 21 },
        chartCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 12, paddingHorizontal: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 12 },
        statsRow: { flexDirection: 'row', width: '100%', gap: 12 },
        statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 16, alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        statValue: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.5 },
        statLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.2 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12, paddingTop: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.5 },
    })
}
