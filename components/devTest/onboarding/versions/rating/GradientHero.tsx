import { brandAssets } from '@/context/ThemeContext/assets'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Star } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated'
import V4Screen from '../_shared/V4Screen'
import { openRatingPrompt, useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · Gradient hero — the icon and its stars on a workout-gradient panel, with a gradient
 * CTA underneath. The most emphatic of the set: it borrows the paywall's own visual language, so the screen
 * carries weight without needing a long title to do it.
 *
 * That borrowing is the version's open question. The gradient is currently the flow's "money action"
 * signature, and the paywall is the very next screen — using it here either makes the ask feel first-class
 * or spends the gradient a screen early and blunts it. Worth judging side by side with the quieter versions
 * rather than in isolation.
 *
 * Gold stars sit on the panel because they hold up on the blue; the icon is the real app icon, which is
 * self-contained and needs no page colour behind it.
 */
const STARS = [0, 1, 2, 3, 4]
const STAR_GOLD = '#FFD93D'

export default function RatingGradientHero() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reduced = useReducedMotion()
    const { advance, back } = useRatingBeat()

    return (
        <V4Screen eyebrow="One quick thing" title="Ratings are how people find us" subtitle="Help someone else get started." accent={colors.text} onBack={back} onNext={advance} contentStyle={styles.center}>
            <Animated.View entering={reduced ? undefined : FadeIn.duration(480)}>
                <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.panel}>
                    <Image source={brandAssets.appIcon} style={styles.icon} contentFit="cover" priority="high" />
                    <View style={styles.starRow}>
                        {STARS.map((i) => (
                            <Star key={i} size={24} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.2} />
                        ))}
                    </View>
                </LinearGradient>
            </Animated.View>

            <TouchableOpacity style={styles.cta} onPress={() => void openRatingPrompt()} activeOpacity={0.85} accessibilityRole="button">
                <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaFill}>
                    <Text style={styles.ctaText}>Leave a rating</Text>
                </LinearGradient>
            </TouchableOpacity>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        panel: { alignItems: 'center', gap: 22, paddingVertical: 36, borderRadius: radius.cardLg },
        icon: { width: 92, height: 92, borderRadius: 21 },
        starRow: { flexDirection: 'row', gap: 6 },
        cta: { height: 58, marginTop: 16, borderRadius: radius.cardLg, overflow: 'hidden' },
        ctaFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
    })
}
