import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/**
 * Dev-only Refined Paywall — restyled per RESTYLE_PLAN (theme tokens, dark + light) with the strongest
 * paywall pattern: PERSONALIZED plan summary + SOCIAL PROOF + a free trial + a clear "Maybe later"
 * escape hatch (paywalls). `trialDays` is parameterized so 7- vs 14-day framing can be compared
 * (onboardingresearch.md line 14: longer trials convert better). Mock data; inert. Rating + testimonials are PLACEHOLDERS.
 */
type PlanType = 'monthly' | 'annual'

const GOAL_LABEL = 'Lose Weight'
const GOAL_WEIGHT = 70
const UNIT = 'kg'
const CALORIES = 2200
const targetDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 70)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})()

const TESTIMONIALS = [
    { quote: 'Down 18 lbs in 3 months — the macro targets actually made it simple.', name: 'Jordan M.' },
    { quote: 'The AI food scan saves me so much time. Hit my first strength PR last week.', name: 'Priya R.' },
]

export default function PaywallRefined({ trialDays = 7 }: { trialDays?: number }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.workout
    const router = useRouter()
    const topPad = useScreenTopPad()
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual')

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '1F', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={[styles.iconCircle, { borderColor: accent }]}>
                    <Ionicons name="sparkles" size={64} color={accent} />
                </View>

                <Text style={styles.titleText}>
                    Your <Text style={{ color: accent }}>{GOAL_LABEL}</Text> plan is ready
                </Text>
                <Text style={styles.subtitleText}>Unlock it to start today and stay on track to your goal.</Text>

                <View style={styles.planCard}>
                    <View style={styles.planRow}>
                        <Text style={styles.planLabelText}>Goal</Text>
                        <Text style={styles.planValueText}>{GOAL_WEIGHT} {UNIT} by {targetDate}</Text>
                    </View>
                    <View style={styles.planDivider} />
                    <View style={styles.planRow}>
                        <Text style={styles.planLabelText}>Daily target</Text>
                        <Text style={styles.planValueText}>{CALORIES.toLocaleString()} kcal</Text>
                    </View>
                </View>

                <View style={styles.featuresRow}>
                    {[
                        { Icon: Database, label: 'Food Database' },
                        { Icon: Sparkles, label: 'AI Scan' },
                        { Icon: BarChart3, label: 'Charts' },
                        { Icon: Zap, label: '& More' },
                    ].map(({ Icon, label }) => (
                        <View key={label} style={styles.featureItem}>
                            <Icon size={18} color={accent} strokeWidth={2} />
                            <Text style={styles.featureText} numberOfLines={1}>{label}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.pricingRow}>
                    <TouchableOpacity style={[styles.pricingCard, selectedPlan === 'monthly' && { borderColor: accent, borderWidth: 3 }]} onPress={() => setSelectedPlan('monthly')} activeOpacity={0.8}>
                        <Text style={styles.planLabel} numberOfLines={1}>Monthly</Text>
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceAmount, { color: accent }]} numberOfLines={1}>$4.99</Text>
                            <Text style={styles.priceInterval} numberOfLines={1}>/month</Text>
                        </View>
                        <Text style={styles.pricingNote} numberOfLines={2}>{trialDays} day free trial</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.pricingCard, selectedPlan === 'annual' && { borderColor: accent, borderWidth: 3 }]} onPress={() => setSelectedPlan('annual')} activeOpacity={0.8}>
                        <Text style={styles.planLabel} numberOfLines={1}>Annual</Text>
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceAmount, { color: accent }]} numberOfLines={1}>$39.99</Text>
                            <Text style={styles.priceInterval} numberOfLines={1}>/year</Text>
                        </View>
                        <Text style={styles.pricingNote} numberOfLines={2}>{trialDays} day free trial</Text>
                        <Text style={[styles.saveBadge, { color: accent }]} numberOfLines={1}>Best value</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.subscribeButton} onPress={() => {}} activeOpacity={0.85}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.subscribeGradient}>
                        <Text style={styles.subscribeButtonText}>Start {trialDays}-Day Free Trial</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.ratingRow}>
                    <Text style={styles.stars}>★★★★★</Text>
                    <Text style={styles.ratingText}>4.8 · 12,000+ ratings</Text>
                </View>

                {TESTIMONIALS.map((t) => (
                    <View key={t.name} style={styles.testimonialCard}>
                        <Text style={styles.testimonialStars}>★★★★★</Text>
                        <Text style={styles.testimonialQuote}>“{t.quote}”</Text>
                        <Text style={styles.testimonialName}>— {t.name}</Text>
                    </View>
                ))}

                <Text style={styles.placeholderNote}>Sample reviews — replace with real App Store reviews before shipping.</Text>

                <TouchableOpacity style={styles.restoreButton} onPress={() => {}} activeOpacity={0.5}>
                    <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.navButtonRow}>
                    <TouchableOpacity style={styles.navBackButton} onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={styles.navBackButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navContinueButton} onPress={() => {}} activeOpacity={0.8}>
                        <Text style={styles.navContinueButtonText}>Maybe later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 25, paddingBottom: 50 },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
        scroll: { flex: 1 },
        scrollContent: { alignItems: 'center', paddingBottom: 16 },
        iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 12 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.text, letterSpacing: -0.5, marginBottom: 4, textAlign: 'center' },
        subtitleText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, letterSpacing: 0.2, marginBottom: 16, paddingHorizontal: 8 },
        planCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingHorizontal: 16, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 14 },
        planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
        planDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
        planLabelText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary, letterSpacing: -0.3 },
        planValueText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, letterSpacing: -0.3 },
        featuresRow: { flexDirection: 'row', gap: 8, marginBottom: 14, width: '100%' },
        featureItem: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.card, paddingVertical: 12, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        featureText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.text, letterSpacing: -0.3 },
        pricingRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 12 },
        pricingCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.card, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: colors.border },
        planLabel: { fontFamily: fonts.semibold, width: '100%', fontSize: 13, color: colors.textSecondary, marginBottom: 4, textAlign: 'center' },
        saveBadge: { fontFamily: fonts.semibold, width: '100%', fontSize: 11, marginTop: 6, textAlign: 'center' },
        priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', width: '100%', marginBottom: 2, gap: 2 },
        priceAmount: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.5 },
        priceInterval: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, marginLeft: 2, letterSpacing: -0.5 },
        pricingNote: { fontFamily: fonts.medium, width: '100%', fontSize: 12, color: colors.textSecondary, letterSpacing: 0.2, textAlign: 'center' },
        subscribeButton: { alignSelf: 'stretch', width: '100%', height: 60, borderRadius: radius.cardLg, overflow: 'hidden', marginBottom: 18 },
        subscribeGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        subscribeButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.5 },
        ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
        stars: { fontSize: 16, color: '#FFD93D', letterSpacing: 1 },
        ratingText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, letterSpacing: 0.2 },
        testimonialCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 10, gap: 6 },
        testimonialStars: { fontSize: 12, color: '#FFD93D', letterSpacing: 1 },
        testimonialQuote: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20, letterSpacing: 0.1 },
        testimonialName: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },
        placeholderNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic', marginTop: 2, marginBottom: 16 },
        restoreButton: { backgroundColor: 'transparent', alignSelf: 'center', paddingVertical: 2 },
        restoreButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.workout, letterSpacing: -0.5 },
        footer: { width: '100%', gap: 12 },
        navButtonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
        navBackButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        navBackButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        navContinueButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        navContinueButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSecondary, letterSpacing: -0.5 },
    })
}
