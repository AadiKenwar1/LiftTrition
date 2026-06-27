import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { FlaskConical, TrendingUp, Utensils } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const SECTIONS = [
    {
        Icon: Utensils,
        accent: 'nutrition' as const,
        badge: 'Mifflin-St Jeor · 1990',
        title: 'How Are My Nutrition Goals Calculated?',
        intro: 'We estimate how many calories you need each day using the Mifflin-St Jeor equation.',
        bullets: ['Your profile — height, weight, age, and sex help estimate your daily calorie burn.', 'Your activity — your activity level adjusts that estimate to your maintenance calories.', 'Your goal — we raise or lower calories based on whether you want to gain, lose, or maintain weight.', 'Your macros — your calories are split into protein, carbs, and fats based on your goal.'],
    },
    {
        Icon: TrendingUp,
        accent: 'workout' as const,
        badge: 'Epley formula · 1985',
        title: 'Strength chart',
        intro: 'The chart shows your estimated one-rep max for each day you trained an exercise.',
        bullets: ['Best set per day — for each day you log that exercise, we use your best set from that day.', "Epley formula — your estimated max is calculated from that set's weight and reps."],
    },
]

function BulletText({ bullet }: { bullet: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const dashIndex = bullet.indexOf(' — ')
    if (dashIndex === -1) {
        return <Text style={styles.bulletText}>{bullet}</Text>
    }
    const label = bullet.slice(0, dashIndex)
    const body = bullet.slice(dashIndex)
    return (
        <Text style={styles.bulletText}>
            <Text style={styles.bulletLabel}>{label}</Text>
            {body}
        </Text>
    )
}

export default function HowItWorksScreen() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.headerIconCircle}>
                <FlaskConical size={38} color={colors.text} strokeWidth={2} />
            </View>
            <Text style={styles.headerTitle}>How LIFTRI Works</Text>
            <Text style={styles.headerSubtitle}>Short overview of how we calculate your nutrition targets, fatigue score, and strength chart.</Text>

            {SECTIONS.map((section) => {
                const accentColor = section.accent === 'nutrition' ? colors.nutrition : colors.workout
                return (
                    <View key={section.title} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconBox, { backgroundColor: accentColor + '22' }]}>
                                <section.Icon size={22} color={accentColor} strokeWidth={2} />
                            </View>
                            <View style={styles.sectionHeaderText}>
                                {'badge' in section && section.badge ?
                                    <View style={styles.badgeContainer}>
                                        <Text style={styles.badge}>{section.badge}</Text>
                                    </View>
                                :   null}
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionIntro}>{section.intro}</Text>

                        <View style={styles.bulletsContainer}>
                            {section.bullets.map((bullet) => (
                                <View key={bullet} style={styles.bulletRow}>
                                    <Text style={[styles.bulletDot, { color: accentColor }]}>•</Text>
                                    <BulletText bullet={bullet} />
                                </View>
                            ))}
                        </View>
                    </View>
                )
            })}
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        scroll: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollContent: {
            paddingHorizontal: 20,
            paddingTop: 24,
        },
        headerIconCircle: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.text,
            alignSelf: 'center',
            marginBottom: 14,
        },
        headerTitle: {
            fontSize: 22,
            color: colors.text,
            fontFamily: fonts.semibold,
            textAlign: 'center',
            letterSpacing: -0.4,
            marginBottom: 8,
        },
        headerSubtitle: {
            fontSize: 14,
            color: colors.textSecondary,
            fontFamily: fonts.regular,
            textAlign: 'center',
            lineHeight: 21,
            marginBottom: 28,
            paddingHorizontal: 4,
        },
        section: {
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            padding: 18,
            marginBottom: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 10,
        },
        sectionIconBox: {
            width: 44,
            height: 44,
            borderRadius: radius.iconTile,
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
            marginTop: 2,
        },
        sectionHeaderText: {
            flex: 1,
            gap: 6,
        },
        badgeContainer: {
            alignSelf: 'flex-start',
            backgroundColor: colors.surfaceInset,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        badge: {
            fontSize: 10,
            color: colors.textMuted,
            fontFamily: fonts.medium,
            letterSpacing: 0.2,
        },
        sectionTitle: {
            fontSize: 15,
            color: colors.text,
            fontFamily: fonts.semibold,
            letterSpacing: -0.3,
            lineHeight: 22,
        },
        sectionIntro: {
            fontSize: 13,
            color: colors.textSecondary,
            fontFamily: fonts.regular,
            lineHeight: 20,
            marginBottom: 12,
        },
        bulletsContainer: {
            gap: 10,
        },
        bulletRow: {
            flexDirection: 'row',
            gap: 10,
            alignItems: 'flex-start',
        },
        bulletDot: {
            fontSize: 16,
            lineHeight: 20,
            marginTop: -1,
            fontFamily: fonts.semibold,
        },
        bulletText: {
            flex: 1,
            fontSize: 13,
            color: colors.textSecondary,
            fontFamily: fonts.regular,
            lineHeight: 19,
        },
        bulletLabel: {
            color: colors.text,
            fontFamily: fonts.semibold,
        },
    })
}
