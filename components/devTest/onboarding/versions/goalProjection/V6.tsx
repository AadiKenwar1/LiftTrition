import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { weeksToGoal } from '@/lib/utils/goalMath'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg'
import { useOnboardingFlow } from '../_shared/flowContext'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V6 Goal Projection — V5's screen with only the copy changed. Both subtitles hinged on an em dash;
 * each is now two sentences. The cut/bulk line also leads with the number of weeks rather than the date,
 * because the weeks are what the pace slider actually controls and the date is the consequence.
 *
 * "That's recomp" survives verbatim on the maintain path: it is the one line in the flow that uses the word a
 * lifter would use and trusts the reader to keep up.
 *
 * Uses the production weeksToGoal (shared with the real projection + paywall) against the flow's real pace, so
 * this screen and the paywall can't quote different dates for the same goal. Still deliberately does NOT name
 * the calorie target: weeksToGoal divides the distance by the REQUESTED pace, while the previous screen's
 * calorie number is this prototype's own mock, so the two are not tied together here. (Shipped no longer
 * clamps the target for adequacy — LOW_CALORIE_THRESHOLDS is advisory only.) Step 8 of 8. Inert.
 */
const LINE_LEN = 340
const AnimatedPath = Animated.createAnimatedComponent(Path)

export default function GoalProjectionV6() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const reduced = useReducedMotion()

    const unitSystem = flow?.data.unit === 'metric' ? 'metric' : 'imperial'
    const metric = unitSystem === 'metric'
    const unit = weightUnitLabel(unitSystem)
    // Real values from the flow's data bag when the user entered them; mock fallbacks for standalone previews.
    const current = Number(flow?.data.weight) || (metric ? 75 : 165)
    const phase = flow?.data.phase === 'maintain' ? 'maintain' : flow?.data.phase === 'bulk' ? 'bulk' : 'cut'
    const maintain = phase === 'maintain'
    const goal = Number(flow?.data.target) || (phase === 'bulk' ? (metric ? 80 : 176) : metric ? 70 : 154)
    const goalType = maintain ? 'maintain' : phase === 'bulk' ? 'gain' : 'lose'
    const pace = Number(flow?.data.pace) || (metric ? 0.5 : 1)
    const weeks = weeksToGoal(goalType, current, goal, pace)
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
            step={7}
            totalSteps={8}
            eyebrow="Step 8 of 8"
            title={maintain ? 'Same weight, stronger body' : `You'll reach ${goal} ${unit}`}
            subtitle={maintain ? `Eating at maintenance holds you at ${current} ${unit} while training drives your strength up. That's recomp.` : `About ${weeks} weeks at your pace. That puts you there by ${targetDate}.`}
            accent={colors.text}
            onBack={() => router.back()}
            onNext={() => {}}
            nextLabel="Continue"
        >
            <View style={styles.chartCard}>
                {maintain ?
                    <Svg width="100%" height={190} viewBox="0 0 320 190">
                        <Defs>
                            <SvgGradient id="strengthFillV6" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={colors.workout} stopOpacity={0.22} />
                                <Stop offset="1" stopColor={colors.workout} stopOpacity={0} />
                            </SvgGradient>
                        </Defs>
                        <Path d={`${strengthCurve} L296 160 L24 160 Z`} fill="url(#strengthFillV6)" />
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
                            <SvgGradient id="areaFillV6" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={colors.nutrition} stopOpacity={0.3} />
                                <Stop offset="1" stopColor={colors.nutrition} stopOpacity={0} />
                            </SvgGradient>
                        </Defs>
                        <Path d={`${weightCurve} L296 160 L24 160 Z`} fill="url(#areaFillV6)" />
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
