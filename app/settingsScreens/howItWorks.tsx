import { BicepsFlexed, FlaskConical, TrendingUp, Utensils } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const SECTIONS = [
    {
        Icon: Utensils,
        iconColor: '#22C922',
        badge: 'Mifflin-St Jeor · 1990',
        title: 'How Are My Nutrition Goals Calculated?',
        intro: 'We estimate how many calories you need each day using the Mifflin-St Jeor equation.',
        bullets: [
            'Your profile — height, weight, age, and sex help estimate your daily calorie burn.',
            'Your activity — your activity level adjusts that estimate to your maintenance calories.',
            'Your goal — we raise or lower calories based on whether you want to gain, lose, or maintain weight.',
            'Your macros — your calories are split into protein, carbs, and fats based on your goal.',
        ],
    },
    {
        Icon: BicepsFlexed,
        iconColor: '#2f80ed',
        badge: 'Epley formula · 1985',
        title: 'What Is My Fatigue Score?',
        intro: 'Fatigue in LIFTRI shows how demanding your logged training was. We use a modified version of the Epley formula to estimate your fatigue score.',
        bullets: [
            "Each set gets a score — for each set, fatigue is estimated from the set's weight, reps, muscle group, and exercise equipment.",
            'Relative to you — each set is rated against your best performance on that exercise in the last 30 days.',
            "Daily budget — based on your activity level, you're assigned a daily budget. Your set scores are totaled against it to produce the fatigue percentage.",
        ],
    },
    {
        Icon: TrendingUp,
        iconColor: '#2f80ed',
        badge: 'Epley formula · 1985',
        title: 'Strength chart',
        intro: 'The chart shows your estimated one-rep max for each day you trained an exercise.',
        bullets: ['Best set per day — for each day you log that exercise, we use your best set from that day.', "Epley formula — your estimated max is calculated from that set's weight and reps."],
    },
]

function BulletText({ bullet }: { bullet: string }) {
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
    const insets = useSafeAreaInsets()

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.headerIconCircle}>
                <FlaskConical size={38} color="#fff" strokeWidth={2} />
            </View>
            <Text style={styles.headerTitle}>How LIFTRI Works</Text>
            <Text style={styles.headerSubtitle}>Short overview of how we calculate your nutrition targets, fatigue score, and strength chart.</Text>

            {SECTIONS.map((section) => (
                <View key={section.title} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIconBox, { backgroundColor: section.iconColor + '22' }]}>
                            <section.Icon size={22} color={section.iconColor} strokeWidth={2} />
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
                                <Text style={[styles.bulletDot, { color: section.iconColor }]}>•</Text>
                                <BulletText bullet={bullet} />
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scrollContent: {
        paddingHorizontal: 22,
        paddingTop: 20,
    },
    headerIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        alignSelf: 'center',
        marginBottom: 14,
    },
    headerTitle: {
        fontSize: 22,
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
        letterSpacing: -0.4,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#aaa',
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 28,
        paddingHorizontal: 4,
    },
    section: {
        backgroundColor: '#1a1a1a',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#272727',
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
        borderRadius: 12,
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
        backgroundColor: '#2a2a2a',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: '#383838',
    },
    badge: {
        fontSize: 10,
        color: '#888',
        fontFamily: 'Poppins_500Medium',
        letterSpacing: 0.2,
    },
    sectionTitle: {
        fontSize: 15,
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.3,
        lineHeight: 22,
    },
    sectionIntro: {
        fontSize: 13,
        color: '#bbb',
        fontFamily: 'Poppins_400Regular',
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
        fontFamily: 'Poppins_600SemiBold',
    },
    bulletText: {
        flex: 1,
        fontSize: 13,
        color: '#999',
        fontFamily: 'Poppins_400Regular',
        lineHeight: 19,
    },
    bulletLabel: {
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
    },
})
