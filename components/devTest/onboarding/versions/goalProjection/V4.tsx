import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg'
import { useOnboardingFlow } from '../_shared/flowContext'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V4 Goal Projection — hero beat 2 of 3: the animated weight line, goal dot, and stats are
 * nutrition-green (data is the hero); screen chrome stays neutral. Now a NUMBERED step (was an off-pattern
 * "Your projection" eyebrow in V3), and its weight unit follows the About You choice. Inert.
 */
const LINE_LEN = 340
const AnimatedPath = Animated.createAnimatedComponent(Path)

export default function GoalProjectionV4() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.nutrition // chart + stats only; screen chrome below stays neutral
    const reduced = useReducedMotion()

    const metric = flow?.data.unit === 'metric'
    const unit = metric ? 'kg' : 'lb'
    const current = metric ? 75 : 165
    const goal = metric ? 70 : 154
    const pace = metric ? 0.5 : 1
    const weeks = Math.max(1, Math.round(Math.abs(current - goal) / pace))
    const targetDate = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + weeks * 7)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }, [weeks])

    const draw = useSharedValue(reduced ? 1 : 0)
    useEffect(() => {
        if (!reduced) draw.value = withTiming(1, { duration: 1000 })
    }, [reduced, draw])
    const lineProps = useAnimatedProps(() => ({ strokeDashoffset: LINE_LEN * (1 - draw.value) }))

    return (
        <V4Screen step={8} totalSteps={9} eyebrow="Step 9 of 9" title={`You'll reach ${goal} ${unit}`} subtitle={`by ${targetDate} — about ${weeks} weeks at your pace.`} accent={colors.text} onBack={() => router.back()} onNext={() => {}} nextLabel="Continue">
            <View style={styles.chartCard}>
                <Svg width="100%" height={190} viewBox="0 0 320 190">
                    <Defs>
                        <SvgGradient id="areaFillV4" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={accent} stopOpacity={0.3} />
                            <Stop offset="1" stopColor={accent} stopOpacity={0} />
                        </SvgGradient>
                    </Defs>
                    <Path d="M24 46 C 120 60, 200 122, 296 132 L296 160 L24 160 Z" fill="url(#areaFillV4)" />
                    <AnimatedPath d="M24 46 C 120 60, 200 122, 296 132" stroke={accent} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={LINE_LEN} animatedProps={lineProps} />
                    <Circle cx={24} cy={46} r={4.5} fill={accent} />
                    <Circle cx={296} cy={132} r={9} fill={accent} opacity={0.22} />
                    <Circle cx={296} cy={132} r={5} fill={accent} />
                    <SvgText x={24} y={32} fill={colors.text} fontSize={13} fontFamily={fonts.semibold} textAnchor="start">{current} {unit}</SvgText>
                    <SvgText x={296} y={120} fill={accent} fontSize={13} fontFamily={fonts.semibold} textAnchor="end">{goal} {unit}</SvgText>
                    <SvgText x={24} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="start">Today</SvgText>
                    <SvgText x={296} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="end">{targetDate}</SvgText>
                </Svg>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: accent }]}>−{Math.abs(current - goal)} {unit}</Text>
                    <Text style={styles.statLabel}>to goal</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: accent }]}>{weeks} wk</Text>
                    <Text style={styles.statLabel}>estimated</Text>
                </View>
            </View>
        </V4Screen>
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
