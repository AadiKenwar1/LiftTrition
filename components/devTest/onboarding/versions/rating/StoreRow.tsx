import { brandAssets } from '@/context/ThemeContext/assets'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useScreenTopPad } from '@/lib/hooks/useScreenTopPad'
import { Image } from 'expo-image'
import { Star } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated'
import V4Screen from '../_shared/V4Screen'
import { openRatingPrompt, useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · Store row — the ask drawn as the thing it produces. A horizontal listing row (icon
 * tile, app name, star line) quotes the App Store's own layout, so what is being asked for is legible before
 * a word of copy is read, and the screen needs far less type to explain itself.
 *
 * Uses the real app icon rather than the wordmark, because the icon is self-contained and reads correctly on
 * any background — the scheme-aware wordmark assumes the page colour behind it.
 *
 * The stars here are ornament on a mock listing, NOT a score: no number is shown next to them precisely so
 * the row can't be read as a rating this app has actually earned.
 *
 * The CTA is filled workout blue with white 17pt semibold on it, matching the paywall's CTA label exactly.
 * Flat rather than gradient: the app fills its CTAs with workoutGradient, whose top stop IS colors.workout,
 * so this is the same blue without the depth — swap in the gradient if it should carry the paywall's weight.
 */
const STARS = [0, 1, 2, 3, 4]
const STAR_GOLD = '#FFD93D'
/** StepProgress' footprint (8pt dots + its 28pt marginBottom) — held open so this unnumbered screen's type starts level with the numbered ones. */
const STEP_PROGRESS_SPACE = 36

export default function RatingStoreRow() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reduced = useReducedMotion()
    const { advance, back } = useRatingBeat()
    const topPad = useScreenTopPad()
    // Overrides V4Screen's own paddingTop, so it has to carry that value forward as well as the reserved space.
    const contentStyle = useMemo(() => ({ paddingTop: topPad + STEP_PROGRESS_SPACE }), [topPad])

    return (
        <V4Screen eyebrow="Rate Us!" title="Help others get started." subtitle="Ratings are how people find us." accent={colors.text} onBack={back} onNext={advance} contentStyle={contentStyle}>
            <Animated.View entering={reduced ? undefined : FadeIn.duration(480)} style={styles.row}>
                <Image source={brandAssets.appIcon} style={styles.icon} contentFit="cover" priority="high" />
                <View style={styles.meta}>
                    <Text style={styles.name}>PLATES</Text>
                    <Text style={styles.tagline} numberOfLines={1}>
                        Gym and kitchen, one app
                    </Text>
                    <View style={styles.starRow}>
                        {STARS.map((i) => (
                            <Star key={i} size={15} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.2} />
                        ))}
                    </View>
                </View>
            </Animated.View>

            <TouchableOpacity style={styles.cta} onPress={() => void openRatingPrompt()} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.ctaText}>Leave a rating</Text>
            </TouchableOpacity>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18 },
        icon: { width: 76, height: 76, borderRadius: 18 },
        meta: { flex: 1, gap: 5 },
        name: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: -0.5 },
        tagline: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
        starRow: { flexDirection: 'row', gap: 3, marginTop: 2 },
        cta: { height: 58, marginTop: 16, borderRadius: radius.cardLg, backgroundColor: colors.workout, alignItems: 'center', justifyContent: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
    })
}
