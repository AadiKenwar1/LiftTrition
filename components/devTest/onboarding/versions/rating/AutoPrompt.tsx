import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Star } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { useReducedMotion, ZoomIn } from 'react-native-reanimated'
import V4Screen from '../_shared/V4Screen'
import { useAutoRatingPrompt, useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · Auto-prompt — the shape Apple's HIG actually asks for. Nothing on this screen
 * triggers the sheet: it fires on its own once the stars have landed, and the only control is Continue.
 *
 * That matters because requestReview() is quota'd (3 per user per 365 days) and can silently decline to
 * show. Every other version here hangs the prompt off a tap, so a declined prompt reads as a dead button;
 * here a declined prompt just means the user reads a pleasant screen and moves on, which is exactly the
 * failure mode Apple's "don't use buttons to request feedback" rule exists to produce.
 *
 * The trade is that the screen can't tell the user what's about to happen without sounding like a warning,
 * so the copy stays a statement and lets the sheet explain itself.
 */
const STARS = [0, 1, 2, 3, 4]
const STAR_GOLD = '#FFD93D'

export default function RatingAutoPrompt() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reduced = useReducedMotion()
    const { advance } = useRatingBeat()

    // A beat after the stars land, so the sheet doesn't collide with the entrance animation.
    useAutoRatingPrompt(reduced ? 400 : 1100)

    const footer = (
        <TouchableOpacity style={styles.ctaButton} onPress={advance} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>
    )

    return (
        <V4Screen eyebrow="One quick thing" title="Ratings are how people find us" subtitle="Help someone else get started." accent={colors.text} footer={footer} contentStyle={styles.center}>
            <View style={styles.starRow}>
                {STARS.map((i) => (
                    <Animated.View key={i} entering={reduced ? undefined : ZoomIn.delay(250 + i * 90).springify().damping(9)}>
                        <Star size={40} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.4} />
                    </Animated.View>
                ))}
            </View>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        starRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 28 },
        ctaButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
