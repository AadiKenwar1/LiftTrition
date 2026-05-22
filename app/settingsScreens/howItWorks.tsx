import { BicepsFlexed, FlaskConical, TrendingUp, Utensils } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// ─── Content ─────────────────────────────────────────────────────────────────

const SECTIONS = [
    {
        Icon: Utensils,
        iconColor: '#22C922',
        badge: 'Mifflin-St Jeor Equation · Published 1990',
        title: 'How Your Nutrition Goals Are Calculated',
        intro:
            'Every person burns a different number of calories each day depending on their body, age, and lifestyle. We use a well-established scientific formula to estimate yours — and then build your macro goals around it.',
        steps: [
            {
                label: 'Step 1 — Your Resting Burn (BMR)',
                body: 'Even at complete rest, your body burns calories to keep your heart beating, lungs breathing, and cells running. This baseline number — called your Basal Metabolic Rate — is calculated from your height, weight, age, and biological sex.',
            },
            {
                label: 'Step 2 — Your Total Daily Burn (TDEE)',
                body: 'We then multiply your resting burn by an activity factor that reflects how active your day-to-day life is — from sedentary to very active. This gives your Total Daily Energy Expenditure: roughly how many calories you burn in a full day.',
            },
            {
                label: 'Step 3 — Your Goal Adjustment',
                body: 'If your goal is to lose or gain weight, we shift your calorie target up or down by a small daily amount based on your chosen pace. A mild adjustment (around 250–500 calories per day) leads to safe, sustainable progress without sacrificing performance.',
            },
            {
                label: 'Step 4 — Your Macro Split',
                body: 'Your total calories are divided into protein, carbohydrates, and fats using research-backed ratios tuned to your goal. Cutting phases prioritise more protein to protect muscle; building phases shift more calories toward carbs to fuel training.',
            },
        ],
        footnote:
            'The Mifflin-St Jeor equation is one of the most widely validated calorie-estimation formulas in nutrition science. It is used by registered dietitians, sports nutritionists, and major health organisations worldwide.',
    },
    {
        Icon: BicepsFlexed,
        iconColor: '#2f80ed',
        badge: 'Epley Formula · Published 1985',
        title: 'How Your Fatigue Score Is Calculated',
        intro:
            'Your fatigue score reflects how much training stress your body has accumulated — not just how much weight you lifted, but how hard it was relative to your own strength level.',
        steps: [
            {
                label: 'Step 1 — Your Estimated Maximum',
                body: 'For each exercise you log, we estimate your one-rep maximum using your best set from the last 30 days — not just the current session. This rolling benchmark means a lighter day is still judged against your recent peak, keeping the score honest as you get stronger.',
            },
            {
                label: 'Step 2 — Relative Intensity',
                body: 'We look at how close each set was to your personal maximum. A set at 85% of your max is more taxing than one at 60%, even if the total volume is similar. This makes your fatigue score meaningful regardless of your experience level.',
            },
            {
                label: 'Step 3 — RPE & Effort',
                body: 'If you log a Rate of Perceived Exertion (RPE) — how hard the set felt on a 1–10 scale — we factor that in too. The same weight can feel very different on a poor sleep day versus a great one.',
            },
            {
                label: 'Step 4 — Exercise Type & Muscle Groups',
                body: 'Compound barbell movements like squats and deadlifts stress more of your body than a cable curl. We account for this by weighting each exercise based on the muscles involved, whether it is a compound or isolation movement, and the equipment used. For bodyweight exercises like pull-ups and dips, your profile body weight is automatically used as the training load — so logging zero added weight still registers real fatigue.',
            },
            {
                label: 'Step 5 — Your Activity Level',
                body: 'Your daily fatigue budget scales with your activity level. A gymrat has a higher baseline tolerance for training stress than someone who is sedentary — so the same session scores differently as a percentage for each person.',
            },
        ],
        footnote:
            'The one-rep max estimation component is derived from the Epley formula, a foundational strength-science model that has been used in exercise physiology research for decades.',
    },
    {
        Icon: TrendingUp,
        iconColor: '#2f80ed',
        badge: 'Epley Formula · Published 1985',
        title: 'How Your 1 Rep Max Chart Works',
        intro:
            'On the Progress tab, pick an exercise to see how your estimated strength is trending. The graph shows your recent training history for that lift — only on days you actually logged sets.',
        steps: [
            {
                label: 'Step 1 — One Point Per Day',
                body: 'Each day you train that exercise, we plot one value: the highest estimated one-rep max from that day. If you log multiple sets, only your best set that day is used for the point.',
            },
            {
                label: 'Step 2 — The Epley Formula',
                body: 'We estimate your max from the weight and reps you logged. For more than one rep, estimated max = weight × (1 + reps ÷ 30). A true one-rep set counts as the weight you lifted. Values are rounded for display on the chart.',
            },
        ],
        footnote:
            'The chart applies the Epley formula to each day’s best set, a widely used method in strength training for estimating one-rep max from submaximal work and tracking progress over time without a true single-rep test.',
    },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function HowItWorksScreen() {
    const insets = useSafeAreaInsets()

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.headerIconCircle}>
                <FlaskConical size={38} color="#fff" strokeWidth={2} />
            </View>
            <Text style={styles.headerTitle}>How LiftTrition Works</Text>
            <Text style={styles.headerSubtitle}>
                We believe you should understand the science behind your goals. Both calculations below are based on peer-reviewed research used by nutrition and strength professionals worldwide.
            </Text>

            {/* Sections */}
            {SECTIONS.map((section) => (
                <View key={section.title} style={styles.section}>
                    {/* Section header */}
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIconBox, { backgroundColor: section.iconColor + '22' }]}>
                            <section.Icon size={22} color={section.iconColor} strokeWidth={2} />
                        </View>
                        <View style={styles.sectionHeaderText}>
                            <View style={styles.badgeContainer}>
                                <Text style={styles.badge}>{section.badge}</Text>
                            </View>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionIntro}>{section.intro}</Text>

                    {/* Steps */}
                    <View style={styles.stepsContainer}>
                        {section.steps.map((step, i) => (
                            <View key={step.label} style={styles.step}>
                                <View style={styles.stepNumberCircle}>
                                    <Text style={styles.stepNumber}>{i + 1}</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepLabel}>{step.label}</Text>
                                    <Text style={styles.stepBody}>{step.body}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Footnote */}
                    <View style={styles.footnoteContainer}>
                        <Text style={styles.footnoteText}>{section.footnote}</Text>
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

    // Header
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

    // Section card
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
        marginBottom: 12,
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
        marginBottom: 16,
    },

    // Steps
    stepsContainer: {
        gap: 14,
        marginBottom: 16,
    },
    step: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    stepNumberCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#2e2e2e',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 1,
        flexShrink: 0,
        borderWidth: 1,
        borderColor: '#3a3a3a',
    },
    stepNumber: {
        fontSize: 11,
        color: '#aaa',
        fontFamily: 'Poppins_600SemiBold',
    },
    stepContent: {
        flex: 1,
        gap: 3,
    },
    stepLabel: {
        fontSize: 13,
        color: '#e0e0e0',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.2,
    },
    stepBody: {
        fontSize: 13,
        color: '#999',
        fontFamily: 'Poppins_400Regular',
        lineHeight: 19,
    },

    // Footnote
    footnoteContainer: {
        backgroundColor: '#222',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#444',
    },
    footnoteText: {
        fontSize: 12,
        color: '#777',
        fontFamily: 'Poppins_400Regular',
        lineHeight: 18,
        fontStyle: 'italic',
    },
})
