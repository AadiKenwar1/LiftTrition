import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg'
import { useOnboardingFlow } from '../_shared/flowContext'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V4 Goal Projection — the SIGNATURE screen, now phase-aware (reads flow.data.phase):
 *  - cut / bulk: green weight line sloping down / up to the goal, "You'll reach X by DATE".
 *  - maintain (recomp): flat green weight line + rising blue strength line — "Same weight, stronger body."
 *    The one moment both brand colors share a frame: green nutrition holds you steady, blue training climbs.
 * Weight unit follows the About You choice. Standalone previews (no flow) show the cut variant. Inert.
 */
const LINE_LEN = 340
const AnimatedPath = Animated.createAnimatedComponent(Path)

export default function GoalProjectionV4() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const reduced = useReducedMotion()

    const metric = flow?.data.unit === 'metric'
    const unit = metric ? 'kg' : 'lb'
    const current = metric ? 75 : 165
    const phase = flow?.data.phase === 'maintain' ? 'maintain' : flow?.data.phase === 'bulk' ? 'bulk' : 'cut'
    const maintain = phase === 'maintain'
    const goal = phase === 'bulk' ? (metric ? 80 : 176) : metric ? 70 : 154
    const pace = metric ? 0.5 : 1
    const weeks = maintain ? 12 : Math.max(1, Math.round(Math.abs(current - goal) / pace))
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

    // Chart geometry: cut slopes down, bulk slopes up, maintain is a flat weight line + a rising strength line.
    const weightCurve = phase === 'cut' ? 'M24 46 C 120 60, 200 122, 296 132' : phase === 'bulk' ? 'M24 132 C 120 122, 200 60, 296 46' : 'M24 104 C 115 102, 205 106, 296 104'
    const goalY = phase === 'cut' ? 132 : 46
    const startY = phase === 'cut' ? 46 : 132
    const strengthCurve = 'M24 142 C 120 134, 200 78, 296 50'

    return (
        <V4Screen
            step={8}
            totalSteps={9}
            eyebrow="Step 9 of 9"
            title={maintain ? 'Same weight, stronger body' : `You'll reach ${goal} ${unit}`}
            subtitle={maintain ? `Eating at maintenance holds you at ${current} ${unit} while training drives your strength up — that's recomp.` : `by ${targetDate} — about ${weeks} weeks at your pace.`}
            accent={colors.text}
            onBack={() => router.back()}
            onNext={() => {}}
            nextLabel="Continue"
        >
            <View style={styles.chartCard}>
                {maintain ?
                    <Svg width="100%" height={190} viewBox="0 0 320 190">
                        <Defs>
                            <SvgGradient id="strengthFillV4" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={colors.workout} stopOpacity={0.22} />
                                <Stop offset="1" stopColor={colors.workout} stopOpacity={0} />
                            </SvgGradient>
                        </Defs>
                        <Path d={`${strengthCurve} L296 160 L24 160 Z`} fill="url(#strengthFillV4)" />
                        <Path d={weightCurve} stroke={colors.nutrition} strokeWidth={3} fill="none" strokeLinecap="round" />
                        <AnimatedPath d={strengthCurve} stroke={colors.workout} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={LINE_LEN} animatedProps={lineProps} />
                        <Circle cx={24} cy={104} r={4.5} fill={colors.nutrition} />
                        <Circle cx={296} cy={104} r={4.5} fill={colors.nutrition} />
                        <Circle cx={24} cy={142} r={4.5} fill={colors.workout} />
                        <Circle cx={296} cy={50} r={9} fill={colors.workout} opacity={0.22} />
                        <Circle cx={296} cy={50} r={5} fill={colors.workout} />
                        <SvgText x={296} y={92} fill={colors.nutrition} fontSize={13} fontFamily={fonts.semibold} textAnchor="end">{current} {unit}</SvgText>
                        <SvgText x={296} y={38} fill={colors.workout} fontSize={13} fontFamily={fonts.semibold} textAnchor="end">Strength</SvgText>
                        <SvgText x={24} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="start">Today</SvgText>
                        <SvgText x={296} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="end">{targetDate}</SvgText>
                    </Svg>
                :   <Svg width="100%" height={190} viewBox="0 0 320 190">
                        <Defs>
                            <SvgGradient id="areaFillV4" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={colors.nutrition} stopOpacity={0.3} />
                                <Stop offset="1" stopColor={colors.nutrition} stopOpacity={0} />
                            </SvgGradient>
                        </Defs>
                        <Path d={`${weightCurve} L296 160 L24 160 Z`} fill="url(#areaFillV4)" />
                        <AnimatedPath d={weightCurve} stroke={colors.nutrition} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={LINE_LEN} animatedProps={lineProps} />
                        <Circle cx={24} cy={startY} r={4.5} fill={colors.nutrition} />
                        <Circle cx={296} cy={goalY} r={9} fill={colors.nutrition} opacity={0.22} />
                        <Circle cx={296} cy={goalY} r={5} fill={colors.nutrition} />
                        <SvgText x={24} y={startY - 14} fill={colors.text} fontSize={13} fontFamily={fonts.semibold} textAnchor="start">{current} {unit}</SvgText>
                        <SvgText x={296} y={goalY - 12} fill={colors.nutrition} fontSize={13} fontFamily={fonts.semibold} textAnchor="end">{goal} {unit}</SvgText>
                        <SvgText x={24} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="start">Today</SvgText>
                        <SvgText x={296} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="end">{targetDate}</SvgText>
                    </Svg>
                }
            </View>

            <View style={styles.statsRow}>
                {maintain ?
                    <>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: colors.nutrition }]}>0 {unit}</Text>
                            <Text style={styles.statLabel}>scale change</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: colors.workout }]}>↑ Strength</Text>
                            <Text style={styles.statLabel}>12-week trend</Text>
                        </View>
                    </>
                :   <>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: colors.nutrition }]}>{phase === 'bulk' ? '+' : '−'}{Math.abs(current - goal)} {unit}</Text>
                            <Text style={styles.statLabel}>to goal</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: colors.nutrition }]}>{weeks} wk</Text>
                            <Text style={styles.statLabel}>estimated</Text>
                        </View>
                    </>
                }
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
