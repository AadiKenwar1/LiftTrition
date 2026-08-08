import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Star } from 'lucide-react-native'
import { useEffect, useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import V4Screen from '../_shared/V4Screen'
import { useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · Big-star version — one oversized gold star as the whole hero, three small sparkle
 * dots fading in around it. Same two lines of copy and the same single hand-off as V6 (see shared.ts); the
 * star lands on a spring, tips once and rests. All motion is entrance-only and skipped under useReducedMotion.
 */
const STAR_GOLD = '#FFD93D'

export default function RatingBigStar() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reduced = useReducedMotion()
    const { prompted, rate, advance } = useRatingBeat()

    // One tip after the star lands, then it rests. Nothing loops.
    const tilt = useSharedValue(0)
    useEffect(() => {
        if (!reduced) tilt.value = withDelay(560, withSequence(withTiming(-8, { duration: 130 }), withSpring(0, { damping: 5, stiffness: 150 })))
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
            <PressableScale style={styles.hero} onPress={rate} accessibilityRole="button" accessibilityLabel="Rate PLATES">
                <View style={styles.sparkleField} pointerEvents="none">
                    <Animated.View entering={reduced ? undefined : FadeIn.delay(620).duration(450)} style={[styles.sparkle, styles.sparkleA]} />
                    <Animated.View entering={reduced ? undefined : FadeIn.delay(740).duration(450)} style={[styles.sparkle, styles.sparkleB]} />
                    <Animated.View entering={reduced ? undefined : FadeIn.delay(860).duration(450)} style={[styles.sparkle, styles.sparkleC]} />
                </View>
                <Animated.View entering={reduced ? undefined : ZoomIn.duration(450).springify().damping(10)} style={wobble}>
                    <Star size={120} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.2} />
                </Animated.View>
            </PressableScale>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        hero: { alignItems: 'center', paddingVertical: 32, gap: 16 },
        sparkleField: { ...StyleSheet.absoluteFillObject },
        sparkle: { position: 'absolute', backgroundColor: STAR_GOLD, borderRadius: 999 },
        sparkleA: { width: 8, height: 8, top: 26, left: '24%', opacity: 0.7 },
        sparkleB: { width: 6, height: 6, top: 58, right: '22%', opacity: 0.55 },
        sparkleC: { width: 5, height: 5, bottom: 40, left: '32%', opacity: 0.5 },
        laterButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        laterText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3 },
        ctaButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
