import { logoForScheme } from '@/context/ThemeContext/assets'
import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { Star } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated'
import V4Screen from '../_shared/V4Screen'
import { openRatingPrompt, useRatingBeat } from './shared'

/**
 * Dev-only shared chrome for the "logo among stars" rating versions. Every halo version renders this and
 * differs ONLY in where its five stars sit, so a placement can be judged against the others without any
 * other variable moving. Coordinates are offsets from the logo's centre, in points.
 *
 * The composition — logo and stars together — fades in once as a single picture; an earlier pass popped each
 * star in on its own spring and read as a performance.
 *
 * The sheet opens from an explicit "Leave a rating" button above the standard Back/Next pair, borrowing the
 * paywall's shape: one deliberate action, with navigation kept separate underneath. Two earlier tries were
 * worse. Firing on arrival covered the copy before it could be read, so the screen never got to explain
 * itself; and relabelling Next after the prompt can't be built honestly, because requestReview() returns
 * Promise<void> and reports neither a rating nor a cancel.
 *
 * The tradeoff is knowingly taken: Apple's HIG says not to wire a control to requestReview(), since the
 * 3-per-365-days quota means a tap can silently do nothing. That is a UX recommendation rather than a review
 * rule, and the cost is contained here — Next sits right below and always works, so a throttled prompt
 * strands nobody. The button's label never changes, because a changed label would be a claim about an
 * outcome the API doesn't report.
 *
 * The rating button uses the app's existing secondary treatment — surface fill, hairline border, cardLg
 * radius, 58 tall — the same one the Back button and every card in the app wears. An earlier pass gave it a
 * gold outline, which matched nothing in the product and looked it. Gold now appears only in the star icon,
 * where it ties to the composition above and to the paywall's rating row. Filled neutral was the other
 * option and is wrong here: it is exactly what Next wears, so the two would compete for the same rank.
 */
export interface HaloStar {
    /** Offset from the logo's centre, in points. */
    x: number
    y: number
    size: number
    opacity?: number
}

const STAR_GOLD = '#FFD93D'
const LOGO = 132

export default function HaloScreen({ stars, field = 268 }: { stars: HaloStar[]; field?: number }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors, field), [colors, field])
    const scheme = useColorScheme()
    const reduced = useReducedMotion()
    const { advance, back } = useRatingBeat()
    const half = field / 2

    return (
        <V4Screen eyebrow="One quick thing" title="Ratings are how people find us" subtitle="Help someone else get started." accent={colors.text} onBack={back} onNext={advance} contentStyle={styles.center}>
            <Animated.View entering={reduced ? undefined : FadeIn.duration(520)} style={styles.field}>
                {stars.map((s, i) => (
                    <View key={i} style={[styles.star, { left: half + s.x - s.size / 2, top: half + s.y - s.size / 2, opacity: s.opacity ?? 1 }]}>
                        <Star size={s.size} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.2} />
                    </View>
                ))}
                <Image source={logoForScheme(scheme)} style={styles.logo} contentFit="contain" priority="high" />
            </Animated.View>

            <TouchableOpacity style={styles.rateButton} onPress={() => void openRatingPrompt()} activeOpacity={0.8} accessibilityRole="button">
                <Star size={19} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={1.4} />
                <Text style={styles.rateText}>Leave a rating</Text>
            </TouchableOpacity>
        </V4Screen>
    )
}

function makeStyles(colors: Colors, field: number) {
    return StyleSheet.create({
        // Optically centred, not mathematically: the footer buttons weigh the bottom of the screen, so the
        // block is lifted (padding here overrides V4Screen's 16, and half of the difference becomes the lift).
        center: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
        field: { width: field, height: field, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
        star: { position: 'absolute' },
        logo: { width: LOGO, height: LOGO },
        rateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 58, marginTop: 16, borderRadius: radius.cardLg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        rateText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text, letterSpacing: -0.3 },
    })
}
