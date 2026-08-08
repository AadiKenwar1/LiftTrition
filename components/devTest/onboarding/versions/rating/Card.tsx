import { logoForScheme } from '@/context/ThemeContext/assets'
import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { ChevronRight, Star } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated'
import V4Screen from '../_shared/V4Screen'
import { openRatingPrompt, useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · Card — the halo screen's loose parts collected into one object. The logo, the stars
 * and the action live inside a single surface card with a hairline divider, the same construction the paywall
 * uses for its plan card and settings uses for its rows, so the ask reads as one thing rather than as
 * artwork with a button sitting under it.
 *
 * The action is a row with a chevron rather than a filled button, which is how every other tappable row in
 * the app announces itself, and it keeps the screen down to one rectangle plus the flow's Back/Next.
 */
const STARS = [0, 1, 2, 3, 4]
const STAR_GOLD = '#FFD93D'

export default function RatingCard() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const scheme = useColorScheme()
    const reduced = useReducedMotion()
    const { advance, back } = useRatingBeat()

    return (
        <V4Screen eyebrow="One quick thing" title="Ratings are how people find us" subtitle="Help someone else get started." accent={colors.text} onBack={back} onNext={advance} contentStyle={styles.center}>
            <Animated.View entering={reduced ? undefined : FadeIn.duration(480)} style={styles.card}>
                <View style={styles.top}>
                    <Image source={logoForScheme(scheme)} style={styles.logo} contentFit="contain" priority="high" />
                    <View style={styles.starRow}>
                        {STARS.map((i) => (
                            <Star key={i} size={26} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.2} />
                        ))}
                    </View>
                </View>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.action} onPress={() => void openRatingPrompt()} activeOpacity={0.6} accessibilityRole="button">
                    <Text style={styles.actionText}>Leave a rating</Text>
                    <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
                </TouchableOpacity>
            </Animated.View>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, overflow: 'hidden' },
        top: { alignItems: 'center', gap: 20, paddingTop: 32, paddingBottom: 26 },
        logo: { width: 104, height: 104 },
        starRow: { flexDirection: 'row', gap: 6 },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
        action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, height: 56 },
        actionText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
    })
}
