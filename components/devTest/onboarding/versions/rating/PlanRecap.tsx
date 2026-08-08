import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { weeksToGoal } from '@/lib/utils/goalMath'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { Star } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown, useReducedMotion, ZoomIn } from 'react-native-reanimated'
import { useOnboardingFlow } from '../_shared/flowContext'
import PressableScale from '../_shared/PressableScale'
import V4Screen from '../_shared/V4Screen'
import { useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · Plan recap — the effort-justification play. The user has just answered eight screens
 * and watched a plan come out of them; showing that plan back to them immediately before the ask is what the
 * research means by asking at the peak of invested effort rather than at an arbitrary screen.
 *
 * Numbers come from the flow's data bag through the same production helpers the projection and paywall use
 * (weeksToGoal, weightUnitLabel), so this screen can't quote a goal date that disagrees with theirs; mock
 * fallbacks keep the standalone preview readable. Nothing here is a new claim — it is the previous two
 * screens, restated in two rows.
 */
const STARS = [0, 1, 2, 3, 4]
const STAR_GOLD = '#FFD93D'

export default function RatingPlanRecap() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reduced = useReducedMotion()
    const flow = useOnboardingFlow()
    const { prompted, rate, advance } = useRatingBeat()

    const unitSystem = flow?.data.unit === 'metric' ? 'metric' : 'imperial'
    const metric = unitSystem === 'metric'
    const unit = weightUnitLabel(unitSystem)
    const phase = flow?.data.phase === 'maintain' ? 'maintain' : flow?.data.phase === 'bulk' ? 'bulk' : 'cut'
    const current = Number(flow?.data.weight) || (metric ? 75 : 165)
    const goalWeight = Number(flow?.data.target) || (phase === 'bulk' ? (metric ? 80 : 176) : metric ? 70 : 154)
    const goalType = phase === 'maintain' ? 'maintain' : phase === 'bulk' ? 'gain' : 'lose'
    const pace = Number(flow?.data.pace) || (metric ? 0.5 : 1)
    const weeks = weeksToGoal(goalType, current, goalWeight, pace)
    const calories = Number(flow?.data.calories) || 2200
    const targetDate = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + weeks * 7)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }, [weeks])
    const goalLine = phase === 'maintain' ? `Maintain ${current} ${unit}` : `${goalWeight} ${unit} by ${targetDate}`

    const footer = (
        <>
            <TouchableOpacity style={styles.laterButton} onPress={advance} activeOpacity={0.8}>
                <Text style={styles.laterText}>Maybe later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaButton} onPress={rate} activeOpacity={0.85}>
                <Text style={styles.ctaText}>{prompted ? 'Continue' : 'Leave a rating'}</Text>
            </TouchableOpacity>
        </>
    )

    return (
        <V4Screen eyebrow="One quick thing" title="Here's what you built" subtitle="A rating helps more people find PLATES." accent={colors.text} footer={footer} contentStyle={styles.center}>
            <Animated.View entering={reduced ? undefined : FadeInDown.duration(320)} style={styles.planCard}>
                <View style={styles.planRow}>
                    <Text style={styles.planLabel}>Goal</Text>
                    <Text style={styles.planValue}>{goalLine}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.planRow}>
                    <Text style={styles.planLabel}>Daily target</Text>
                    <Text style={styles.planValue}>{calories.toLocaleString()} kcal</Text>
                </View>
            </Animated.View>

            <PressableScale style={styles.starRow} onPress={rate} accessibilityRole="button" accessibilityLabel="Rate PLATES">
                {STARS.map((i) => (
                    <Animated.View key={i} entering={reduced ? undefined : ZoomIn.delay(320 + i * 80).springify().damping(9)}>
                        <Star size={32} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.4} />
                    </Animated.View>
                ))}
            </PressableScale>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        planCard: { backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingHorizontal: 16, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
        planLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
        planValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
        starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 28 },
        laterButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        laterText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3 },
        ctaButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
