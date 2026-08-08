import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { Star } from 'lucide-react-native'
import { useEffect, useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import V4Screen from '../_shared/V4Screen'
import { useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · App-tile version — the ask framed as the thing being rated: a squircle app tile with
 * the PLATES monogram, five small stars beneath it, App Store style. Same two lines of copy and the same
 * single hand-off as V6 (see shared.ts); the tile drops in, wobbles once and rests, the stars pop in after.
 * All motion is entrance-only and skipped under useReducedMotion.
 */
const STARS = [0, 1, 2, 3, 4]
const STAR_GOLD = '#FFD93D'

export default function RatingTile() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reduced = useReducedMotion()
    const { prompted, rate, advance } = useRatingBeat()

    // One wobble after the tile lands, then it rests. Nothing loops.
    const tilt = useSharedValue(0)
    useEffect(() => {
        if (!reduced) tilt.value = withDelay(480, withSequence(withTiming(-6, { duration: 130 }), withTiming(5, { duration: 150 }), withSpring(0, { damping: 6, stiffness: 140 })))
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
                <Animated.View entering={reduced ? undefined : ZoomIn.duration(420).springify().damping(11)} style={wobble}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
                        <Text style={styles.monogram}>P</Text>
                    </LinearGradient>
                </Animated.View>
                <Animated.View entering={reduced ? undefined : ZoomIn.delay(420).duration(300).springify().damping(10)} style={styles.starRow}>
                    {STARS.map((i) => (
                        <Star key={i} size={22} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.4} />
                    ))}
                </Animated.View>
            </PressableScale>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        hero: { alignItems: 'center', paddingVertical: 24, gap: 16 },
        tile: { width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
        monogram: { fontFamily: fonts.extrabold, fontSize: 44, color: '#fff', letterSpacing: -1 },
        starRow: { flexDirection: 'row', gap: 6 },
        laterButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        laterText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3 },
        ctaButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
