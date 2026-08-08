import { logoForScheme } from '@/context/ThemeContext/assets'
import { fonts, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { Star } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated'
import V4Screen from '../_shared/V4Screen'
import { openRatingPrompt, useRatingBeat } from './shared'

/**
 * Dev-only Rating ask · Quiet — a subtraction pass on the halo screen, which had stacked three grey
 * rectangles above each other (rating button, Back, Next) and crowned them with an eyebrow, a three-line
 * title and a subtitle. Here the eyebrow goes, the composition shrinks, and the rating action becomes a
 * plain text link instead of a fourth slab, so the only rectangles on screen are the flow's own Back/Next.
 *
 * The logo drops to 108 and the stars to a tight arc above it, which leaves real space between the type and
 * the artwork rather than filling the screen edge to edge.
 */
const STAR_GOLD = '#FFD93D'
const RADIUS = 78
const SIZES = [20, 26, 30, 26, 20]
const OPACITIES = [0.5, 0.75, 1, 0.75, 0.5]
const FIELD = 216

const STARS = SIZES.map((size, i) => {
    const deg = -158 + (136 * i) / (SIZES.length - 1)
    const angle = (deg * Math.PI) / 180
    return { size, opacity: OPACITIES[i], x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS }
})

export default function RatingQuiet() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const scheme = useColorScheme()
    const reduced = useReducedMotion()
    const { advance, back } = useRatingBeat()

    return (
        <V4Screen title="Ratings are how people find us" subtitle="Help someone else get started." accent={colors.text} onBack={back} onNext={advance} contentStyle={styles.center}>
            <Animated.View entering={reduced ? undefined : FadeIn.duration(520)} style={styles.field}>
                {STARS.map((s, i) => (
                    <View key={i} style={[styles.star, { left: FIELD / 2 + s.x - s.size / 2, top: FIELD / 2 + s.y - s.size / 2, opacity: s.opacity }]}>
                        <Star size={s.size} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.2} />
                    </View>
                ))}
                <Image source={logoForScheme(scheme)} style={styles.logo} contentFit="contain" priority="high" />
            </Animated.View>

            <TouchableOpacity style={styles.link} onPress={() => void openRatingPrompt()} activeOpacity={0.5} hitSlop={12} accessibilityRole="button">
                <Star size={16} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.4} />
                <Text style={styles.linkText}>Leave a rating</Text>
            </TouchableOpacity>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        field: { width: FIELD, height: FIELD, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
        star: { position: 'absolute' },
        logo: { width: 108, height: 108 },
        link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
        linkText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
    })
}
