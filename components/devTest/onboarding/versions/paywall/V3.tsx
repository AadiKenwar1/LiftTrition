import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useOnboardingFlow } from '../_shared/flowContext'
import PressableScale from '../_shared/PressableScale'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/**
 * Dev-only V3 (black & white) Paywall — neutral canvas, green accents, a green "go" CTA (the one place an
 * accent button earns its keep). Personalized plan + 14-day trial + social proof + escape. Inert.
 * NOTE: rating + testimonials are PLACEHOLDERS.
 */
type Plan = 'monthly' | 'annual'
const GOAL_LABEL = 'Lose Weight'
const GOAL_WEIGHT = 70
const UNIT = 'kg'
const CALORIES = 2200
const TRIAL = 14
const targetDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 70)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})()
const TESTIMONIALS = [
    { quote: 'Down 18 lbs in 3 months — the macro targets made it simple.', name: 'Jordan M.' },
    { quote: 'The AI food scan saves me so much time. First strength PR last week.', name: 'Priya R.' },
]
const FEATURES = [
    { Icon: Database, label: 'Food DB' },
    { Icon: Sparkles, label: 'AI Scan' },
    { Icon: BarChart3, label: 'Charts' },
    { Icon: Zap, label: '& More' },
]

export default function PaywallV3() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const topPad = useScreenTopPad()
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.text
    const [plan, setPlan] = useState<Plan>('annual')

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: topPad }]} showsVerticalScrollIndicator={false}>
                <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Your plan</Text>
                <Text style={styles.title}>Your {GOAL_LABEL} plan is ready</Text>
                <Text style={styles.subtitle}>Unlock it to start today and stay on track to your goal.</Text>

                <View style={styles.planCard}>
                    <View style={styles.planRow}>
                        <Text style={styles.planLabel}>Goal</Text>
                        <Text style={styles.planValue}>{GOAL_WEIGHT} {UNIT} by {targetDate}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.planRow}>
                        <Text style={styles.planLabel}>Daily target</Text>
                        <Text style={styles.planValue}>{CALORIES.toLocaleString()} kcal</Text>
                    </View>
                </View>

                <View style={styles.featuresRow}>
                    {FEATURES.map(({ Icon, label }) => (
                        <View key={label} style={styles.feature}>
                            <Icon size={18} color={accent} strokeWidth={2.2} />
                            <Text style={styles.featureText} numberOfLines={1}>{label}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.pricingRow}>
                    {(['monthly', 'annual'] as const).map((p) => (
                        <PressableScale key={p} style={[styles.priceCard, plan === p && { borderColor: accent }]} onPress={() => setPlan(p)}>
                            <Text style={styles.priceName}>{p === 'monthly' ? 'Monthly' : 'Annual'}</Text>
                            <Text style={[styles.priceAmount, { color: accent }]}>{p === 'monthly' ? '$6.99' : '$39.99'}</Text>
                            <Text style={styles.priceNote}>{TRIAL} day free trial</Text>
                            {p === 'annual' && <Text style={[styles.badge, { color: accent }]}>Best value</Text>}
                        </PressableScale>
                    ))}
                </View>

                <TouchableOpacity style={[styles.cta, { backgroundColor: colors.text }]} onPress={() => {}} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>Start {TRIAL}-Day Free Trial</Text>
                </TouchableOpacity>

                <View style={styles.ratingRow}>
                    <Text style={styles.stars}>★★★★★</Text>
                    <Text style={styles.ratingText}>4.8 · 12,000+ ratings</Text>
                </View>

                {TESTIMONIALS.map((t) => (
                    <View key={t.name} style={styles.testimonial}>
                        <Text style={styles.testimonialStars}>★★★★★</Text>
                        <Text style={styles.testimonialQuote}>“{t.quote}”</Text>
                        <Text style={styles.testimonialName}>— {t.name}</Text>
                    </View>
                ))}
                <Text style={styles.placeholderNote}>Sample reviews — replace with real App Store reviews before shipping.</Text>

                <TouchableOpacity onPress={() => {}} activeOpacity={0.5} style={styles.restore}>
                    <Text style={styles.restoreText}>Restore Purchases</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.backButton} onPress={() => (flow ? flow.goBack() : router.back())} activeOpacity={0.8}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.laterButton} onPress={() => flow?.goNext()} activeOpacity={0.8}>
                    <Text style={styles.laterText}>Maybe later</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        scroll: { flex: 1 },
        content: { paddingBottom: 16 },
        eyebrow: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
        title: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 21, marginBottom: 20 },
        planCard: { backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingHorizontal: 16, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 14 },
        planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
        planLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
        planValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
        featuresRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
        feature: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.card, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        featureText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.text },
        pricingRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
        priceCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 14, alignItems: 'center', gap: 2, borderWidth: 2, borderColor: colors.border },
        priceName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
        priceAmount: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.5, marginTop: 2 },
        priceNote: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
        badge: { fontFamily: fonts.semibold, fontSize: 11, marginTop: 4 },
        cta: { height: 58, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
        ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
        stars: { fontSize: 15, color: '#FFD93D', letterSpacing: 1 },
        ratingText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
        testimonial: { backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 10, gap: 6 },
        testimonialStars: { fontSize: 12, color: '#FFD93D', letterSpacing: 1 },
        testimonialQuote: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
        testimonialName: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
        placeholderNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic', marginTop: 2, marginBottom: 14 },
        restore: { alignSelf: 'center', paddingVertical: 2 },
        restoreText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, letterSpacing: -0.3 },
        footer: { flexDirection: 'row', gap: 12, paddingTop: 12 },
        backButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary },
        laterButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        laterText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSecondary },
    })
}
