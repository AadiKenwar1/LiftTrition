import PressableScale from '@/components/NeutralComponents/PressableScale'
import { fonts, useColors, withAlpha, type Colors } from '@/context/ThemeContext'
import { Plus, type LucideIcon } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/**
 * The empty state for a list the user hasn't filled yet: the hero icon circle IS the add button,
 * with a `+` badge on its edge. Replaces copy that pointed at the ⋮ FAB — the first action stops
 * being a second step, and the screen gains no furniture it didn't already have.
 *
 * Omit `ctaLabel` where there is nothing to add (a past nutrition date) and pass `subtitle`
 * instead: the block keeps its shape but renders nothing tappable.
 */
interface EmptyStateCtaProps {
    Icon: LucideIcon
    // The screen's mode accent — colors.workout or colors.nutrition
    accent: string
    title: string
    ctaLabel?: string
    subtitle?: string
    onPress?: () => void
}

export default function EmptyStateCta({ Icon, accent, title, ctaLabel, subtitle, onPress }: EmptyStateCtaProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    if (!ctaLabel) {
        return (
            <View style={styles.wrap}>
                <View style={[styles.circle, styles.heroGap, { borderColor: accent, backgroundColor: colors.iconCircleBg }]}>
                    <Icon size={56} color={accent} strokeWidth={2} />
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
        )
    }

    return (
        <View style={styles.wrap}>
            {/* The 120pt circle is the whole touch target; the badge is decorative and carries no label of its own. */}
            <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={ctaLabel} scaleTo={0.94} style={styles.heroGap}>
                <View style={[styles.circle, { borderColor: accent, backgroundColor: withAlpha(accent, 0.1) }]}>
                    <Icon size={54} color={accent} strokeWidth={2} />
                </View>
                <View style={[styles.badge, { backgroundColor: accent, borderColor: colors.background }]}>
                    <Plus size={17} color="#fff" strokeWidth={3} />
                </View>
            </PressableScale>
            <Text style={styles.title}>{title}</Text>
            <Text style={[styles.subtitle, { color: accent, fontFamily: fonts.semibold }]}>{ctaLabel}</Text>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        wrap: {
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch',
        },
        circle: {
            width: 120,
            height: 120,
            borderRadius: 60,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
        },
        // Gap below the hero. Sits on the pressable wrapper, not the circle, so the absolute badge
        // still anchors to the circle's edge rather than to the bottom of the gap.
        heroGap: {
            marginBottom: 24,
        },
        // Sits on the circle's lower-right edge; the background-colored ring punches it out of the rim.
        badge: {
            position: 'absolute',
            right: -2,
            bottom: 2,
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 3,
            justifyContent: 'center',
            alignItems: 'center',
        },
        title: {
            fontSize: 26,
            color: colors.text,
            marginBottom: 16,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.extrabold,
        },
        subtitle: {
            fontSize: 15,
            color: colors.labelMuted,
            textAlign: 'center',
            lineHeight: 22,
            fontFamily: fonts.regular,
        },
    })
}
