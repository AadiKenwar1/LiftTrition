import { fonts, useColors } from '@/context/ThemeContext'
import { useEffect } from 'react'
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg'

/**
 * Goal projection chart (production port of the V4 onboarding signature chart). Three variants:
 *  - lose: green weight line sloping down to the goal
 *  - gain: green weight line sloping up to the goal
 *  - maintain (recomp): flat green weight line + rising blue strength line
 * Values are labels only — the curve shape is fixed per variant. Animated draw honors reduced motion.
 */
const LINE_LEN = 340
const AnimatedPath = Animated.createAnimatedComponent(Path)

export interface GoalProjectionChartProps {
    variant: 'lose' | 'gain' | 'maintain'
    current: number
    goal: number
    unit: string
    targetDate: string
}

export default function GoalProjectionChart({ variant, current, goal, unit, targetDate }: GoalProjectionChartProps) {
    const colors = useColors()
    const reduced = useReducedMotion()

    const draw = useSharedValue(reduced ? 1 : 0)
    useEffect(() => {
        if (!reduced) draw.value = withTiming(1, { duration: 1000 })
    }, [reduced, draw])
    const lineProps = useAnimatedProps(() => ({ strokeDashoffset: LINE_LEN * (1 - draw.value) }))

    if (variant === 'maintain') {
        const weightCurve = 'M24 104 C 115 102, 205 106, 296 104'
        const strengthCurve = 'M24 142 C 120 134, 200 78, 296 50'
        return (
            <Svg width="100%" height={190} viewBox="0 0 320 190">
                <Defs>
                    <SvgGradient id="projStrengthFill" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.workout} stopOpacity={0.22} />
                        <Stop offset="1" stopColor={colors.workout} stopOpacity={0} />
                    </SvgGradient>
                </Defs>
                <Path d={`${strengthCurve} L296 160 L24 160 Z`} fill="url(#projStrengthFill)" />
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
        )
    }

    const weightCurve = variant === 'lose' ? 'M24 46 C 120 60, 200 122, 296 132' : 'M24 132 C 120 122, 200 60, 296 46'
    const startY = variant === 'lose' ? 46 : 132
    const goalY = variant === 'lose' ? 132 : 46

    return (
        <Svg width="100%" height={190} viewBox="0 0 320 190">
            <Defs>
                <SvgGradient id="projAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={colors.nutrition} stopOpacity={0.3} />
                    <Stop offset="1" stopColor={colors.nutrition} stopOpacity={0} />
                </SvgGradient>
            </Defs>
            <Path d={`${weightCurve} L296 160 L24 160 Z`} fill="url(#projAreaFill)" />
            <AnimatedPath d={weightCurve} stroke={colors.nutrition} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={LINE_LEN} animatedProps={lineProps} />
            <Circle cx={24} cy={startY} r={4.5} fill={colors.nutrition} />
            <Circle cx={296} cy={goalY} r={9} fill={colors.nutrition} opacity={0.22} />
            <Circle cx={296} cy={goalY} r={5} fill={colors.nutrition} />
            <SvgText x={24} y={startY - 14} fill={colors.text} fontSize={13} fontFamily={fonts.semibold} textAnchor="start">{current} {unit}</SvgText>
            <SvgText x={296} y={goalY - 12} fill={colors.nutrition} fontSize={13} fontFamily={fonts.semibold} textAnchor="end">{goal} {unit}</SvgText>
            <SvgText x={24} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="start">Today</SvgText>
            <SvgText x={296} y={183} fill={colors.textMuted} fontSize={11} fontFamily={fonts.medium} textAnchor="end">{targetDate}</SvgText>
        </Svg>
    )
}
