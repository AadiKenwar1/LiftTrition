import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Star } from 'lucide-react-native'
import { useEffect, useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import V4Screen from '../_shared/V4Screen'
import { useRatingBeat } from './shared'

/**
 * Dev-only V6 Rating ask — the in-flow version (between the projection and the paywall). Two lines of copy
 * and a row of five filled stars: the stars are a picture of the ask, not an input (see shared.ts for why),
 * and tapping them or the CTA opens the OS sheet. The title states why the sheet exists instead of asking
 * whether the user likes the app: an opinion question beside the prompt is review-gating-adjacent and Google
 * forbids it outright, and at this point in the flow nobody has used the app enough to answer it honestly.
 * It also stops the screen echoing the plan screen and the paywall, which both already say the plan is
 * ready. The subtitle then names the thing a rating actually causes — someone else starting — rather than
 * claiming the rating achieves their goals for them, which is two steps further than it can honestly reach.
 * The charm is one star-pop with a middle-star wobble, entrance-only and skipped under useReducedMotion.
 * "Maybe later" advances without prompting.
 */
const STARS = [0, 1, 2, 3, 4]
const STAR_GOLD = '#FFD93D'

export default function RatingV6() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reduced = useReducedMotion()
    const { prompted, rate, advance } = useRatingBeat()

    // The middle star tips once after the row lands, then rests. Nothing loops.
    const tilt = useSharedValue(0)
    useEffect(() => {
        if (!reduced) tilt.value = withDelay(780, withSequence(withTiming(-10, { duration: 120 }), withSpring(0, { damping: 5, stiffness: 160 })))
    }, [reduced, tilt])
    const wobble = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }))

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
        <V4Screen eyebrow="One quick thing" title="Ratings are how people find us" subtitle="Help someone else get started." accent={colors.text} footer={footer} contentStyle={styles.center}>
            <PressableScale style={styles.starRow} onPress={rate} accessibilityRole="button" accessibilityLabel="Rate PLATES">
                {STARS.map((i) => (
                    <Animated.View key={i} entering={reduced ? undefined : ZoomIn.delay(250 + i * 90).springify().damping(9)} style={i === 2 ? wobble : undefined}>
                        <Star size={44} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.4} />
                    </Animated.View>
                ))}
            </PressableScale>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        starRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 28 },
        laterButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        laterText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3 },
        ctaButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
