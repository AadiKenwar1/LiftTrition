import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg'
import V3Screen from '../_shared/V3Screen'

/** Dev-only V3 (black & white) Goal Projection — the SIGNATURE screen: data is the hero, animated line. Green accent. Inert. */
const CURRENT = 75
const GOAL = 70
const PACE = 0.5
const UNIT = 'kg'
const LINE_LEN = 340
const weeks = Math.max(1, Math.round(Math.abs(CURRENT - GOAL) / PACE))
const targetDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + weeks * 7)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})()

const AnimatedPath = Animated.createAnimatedComponent(Path)

export default function GoalProjectionV3() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const accent = colors.text
    const reduced = useReducedMotion()

    const draw = useSharedValue(reduced ? 1 : 0)
    useEffect(() => {
        if (!reduced) draw.value = withTiming(1, { duration: 1000 })
    }, [reduced, draw])
    const lineProps = useAnimatedProps(() => ({ strokeDashoffset: LINE_LEN * (1 - draw.value) }))

    return (
        <V3Screen step={10} eyebrow="Your projection" title={`You'll reach ${GOAL} ${UNIT}`} subtitle={`by ${targetDate} — about ${weeks} weeks at your pace.`} accent={accent} onBack={() => router.back()} onNext={() => {}} nextLabel="Continue">
            <View style={styles.chartCard}>
                <Svg width="100%" height={190} viewBox="0 0 320 190">
                    <Defs>
                        <SvgGradient id="areaFillV3" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={accent} stopOpacity={0.3} />
                            <Stop offset="1" stopColor={accent} stopOpacity={0} />
                        </SvgGradient>
                    </Defs>
                    <Path d="M24 46 C 120 60, 200 122, 296 132 L296 160 L24 160 Z" fill="url(#areaFillV3)" />
                    <AnimatedPath d="M24 46 C 120 60, 200 122, 296 132" stroke={accent} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={LINE_LEN} animatedProps={lineProps} />
                    <Circle cx={24} cy={46} r={4.5} fill={accent} />
                    <Circle cx={296} cy={132} r={9} fill={accent} opacity={0.22} />
                    <Circle cx={296} cy={132} r={5} fill={accent} />
                    <SvgText x={24} y={32} fill={colors.text} fontSize={13} fontFamily={fonts.semibold} textAnchor="start">{CURRENT} {UNIT}</SvgText>
                    <SvgText x={296} y={120} fill={accent} fontSize={13} fontFamily={fonts.semibold} textAnchor="end">{GOAL} {UNIT}</SvgText>
                    <SvgText x={24} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="start">Today</SvgText>
                    <SvgText x={296} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="end">{targetDate}</SvgText>
                </Svg>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: accent }]}>−{Math.abs(CURRENT - GOAL)} {UNIT}</Text>
                    <Text style={styles.statLabel}>to goal</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: accent }]}>{weeks} wk</Text>
                    <Text style={styles.statLabel}>estimated</Text>
                </View>
            </View>
        </V3Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        chartCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 12, paddingHorizontal: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 12 },
        statsRow: { flexDirection: 'row', gap: 12 },
        statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 16, alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        statValue: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.5 },
        statLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.2 },
    })
}
