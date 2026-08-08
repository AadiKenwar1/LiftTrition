import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Star } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown, useReducedMotion, ZoomIn } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import V4Screen from '../_shared/V4Screen'
import { useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · Social proof — the ask anchored to an existing score, which is the one priming move
 * the research supports: a specific star average and review count lift positive affect and set an anchor
 * before the sheet appears, and specific numbers beat vague ones.
 *
 * PLACEHOLDER NUMBERS. The score, the count and the two quotes below are invented for layout evaluation and
 * MUST be replaced with real App Store figures before this ships — a fabricated rating on a screen asking
 * for ratings is the exact thing guideline 5.6.3 is about, and the production paywall deliberately shows a
 * bare 5.0 rather than inventing a count. Wire these to real numbers or cut the version.
 */
const PLACEHOLDER_SCORE = '4.9'
const PLACEHOLDER_COUNT = '2,847 ratings'
const PLACEHOLDER_QUOTES = [
    { text: 'Finally one that does lifting and food without feeling like two apps.', meta: 'Placeholder quote' },
    { text: 'The set suggestions alone are worth it.', meta: 'Placeholder quote' },
]
const STARS = [0, 1, 2, 3, 4]
const STAR_GOLD = '#FFD93D'

export default function RatingSocialProof() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reduced = useReducedMotion()
    const { prompted, rate, advance } = useRatingBeat()

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
            <PressableScale style={styles.scoreBlock} onPress={rate} accessibilityRole="button" accessibilityLabel="Rate PLATES">
                <Animated.Text entering={reduced ? undefined : ZoomIn.duration(380).springify().damping(11)} style={styles.score}>
                    {PLACEHOLDER_SCORE}
                </Animated.Text>
                <View style={styles.starRow}>
                    {STARS.map((i) => (
                        <Animated.View key={i} entering={reduced ? undefined : ZoomIn.delay(200 + i * 70).springify().damping(9)}>
                            <Star size={18} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.4} />
                        </Animated.View>
                    ))}
                </View>
                <Text style={styles.count}>{PLACEHOLDER_COUNT}</Text>
            </PressableScale>

            <View style={styles.quotes}>
                {PLACEHOLDER_QUOTES.map((q, i) => (
                    <Animated.View key={q.text} entering={reduced ? undefined : FadeInDown.delay(480 + i * 90).duration(320)} style={styles.quoteCard}>
                        <Text style={styles.quoteText}>{q.text}</Text>
                    </Animated.View>
                ))}
            </View>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        scoreBlock: { alignItems: 'center', gap: 8, paddingVertical: 20 },
        score: { fontFamily: fonts.extrabold, fontSize: 64, color: colors.text, letterSpacing: -2, lineHeight: 68 },
        starRow: { flexDirection: 'row', gap: 4 },
        count: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, letterSpacing: 0.2 },
        quotes: { gap: 10, marginTop: 8 },
        quoteCard: { backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingHorizontal: 16, paddingVertical: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        quoteText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
        laterButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        laterText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3 },
        ctaButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
