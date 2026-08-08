import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { weeksToGoal } from '@/lib/utils/goalMath'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { useScreenTopPad } from '@/lib/hooks/useScreenTopPad'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useOnboardingFlow } from '../_shared/flowContext'
import PressableScale from '../_shared/PressableScale'

/**
 * Dev-only V6 Paywall — V5's screen with only the copy changed. Three lines move:
 *
 *  · The subtitle was the flow's most generated-sounding sentence: three nouns in a list, an em dash, and a
 *    tacked-on "tailored to your goal" that asserted personalisation the list had already implied. It now
 *    states what is true at this point (the targets exist) and hands off to the feature row below it.
 *  · "Cancel anytime · billed securely through Apple" hid who bills. Apple does, and saying so is more
 *    reassuring than the passive was.
 *  · "Your data is never sold or shared" had no actor either. A promise with nobody making it is weaker than
 *    the same promise in the first person.
 *
 * Rating is still a PLACEHOLDER (matching production's bare 5.0) and testimonials remain unbuilt. Numbers
 * come from the flow, so the goal date matches the projection's. Inert.
 */
type Plan = 'monthly' | 'annual'
const TRIAL = 14
/** StepProgress' footprint (8pt dots + its 28pt marginBottom) — held open so this unnumbered screen's type starts level with the numbered ones. */
const STEP_PROGRESS_SPACE = 36
const FEATURES = [
    { Icon: Database, label: 'Food DB' },
    { Icon: BarChart3, label: 'Charts' },
    { Icon: Sparkles, label: 'AI Scan' },
    { Icon: Zap, label: '& More' },
]

export default function PaywallV6() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const topPad = useScreenTopPad()
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.text
    const [plan, setPlan] = useState<Plan>('annual')

    const unitSystem = flow?.data.unit === 'metric' ? 'metric' : 'imperial'
    const metric = unitSystem === 'metric'
    const unit = weightUnitLabel(unitSystem)
    const phase = flow?.data.phase === 'maintain' ? 'maintain' : flow?.data.phase === 'bulk' ? 'bulk' : 'cut'
    const current = Number(flow?.data.weight) || (metric ? 75 : 165)
    const goalWeight = Number(flow?.data.target) || (phase === 'bulk' ? (metric ? 80 : 176) : metric ? 70 : 154)
    const goalType = phase === 'maintain' ? 'maintain' : phase === 'bulk' ? 'gain' : 'lose'
    const pace = Number(flow?.data.pace) || (metric ? 0.5 : 1)
    const weeks = weeksToGoal(goalType, current, goalWeight, pace)
    const calories = Number(flow?.data.calories) || 2200
    const targetDate = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + weeks * 7)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }, [weeks])
    const goalLine = phase === 'maintain' ? `Maintain ${current} ${unit}` : `${goalWeight} ${unit} by ${targetDate}`

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: topPad + STEP_PROGRESS_SPACE }]} showsVerticalScrollIndicator={false}>
                <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Your plan</Text>
                <Text style={styles.title}>It's ready.</Text>
                <Text style={styles.subtitle}>Your targets are saved. Premium unlocks the rest.</Text>

                <View style={styles.planCard}>
                    <View style={styles.planRow}>
                        <Text style={styles.planLabel}>Goal</Text>
                        <Text style={styles.planValue}>{goalLine}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.planRow}>
                        <Text style={styles.planLabel}>Daily target</Text>
                        <Text style={styles.planValue}>{calories.toLocaleString()} kcal</Text>
                    </View>
                </View>

                <View style={styles.featuresRow}>
                    {FEATURES.map(({ Icon, label }) => (
                        <View key={label} style={styles.feature}>
                            <Icon size={18} color={accent} strokeWidth={2.2} />
                            <Text style={styles.featureText} numberOfLines={1}>
                                {label}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.pricingRow}>
                    {(['monthly', 'annual'] as const).map((p) => (
                        <PressableScale key={p} style={[styles.priceCard, plan === p && { borderColor: colors.workout }]} onPress={() => setPlan(p)}>
                            <Text style={styles.priceName}>{p === 'monthly' ? 'Monthly' : 'Annual'}</Text>
                            <Text style={[styles.priceAmount, { color: accent }]}>{p === 'monthly' ? '$6.99' : '$39.99'}</Text>
                            <Text style={styles.priceNote}>{TRIAL} day free trial</Text>
                            {p === 'annual' && <Text style={[styles.badge, { color: colors.workout }]}>Best value</Text>}
                        </PressableScale>
                    ))}
                </View>

                <TouchableOpacity style={styles.cta} onPress={() => flow?.goNext()} activeOpacity={0.85}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
                        <Text style={styles.ctaText}>Start {TRIAL}-Day Free Trial</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.ratingRow}>
                    <Text style={styles.stars}>★★★★★</Text>
                    <Text style={styles.ratingText}>5.0</Text>
                </View>

                <View style={styles.trust}>
                    <Text style={styles.trustLine}>Cancel anytime. Apple handles the billing.</Text>
                    <Text style={styles.trustLine}>We never sell or share your data.</Text>
                </View>

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
        cta: { height: 58, borderRadius: radius.cardLg, overflow: 'hidden', marginBottom: 18 },
        ctaGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
        ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
        stars: { fontSize: 15, color: '#FFD93D', letterSpacing: 1 },
        ratingText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
        trust: { alignItems: 'center', gap: 4, marginBottom: 16 },
        trustLine: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2 },
        restore: { alignSelf: 'center', paddingVertical: 2 },
        restoreText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, letterSpacing: -0.3 },
        footer: { flexDirection: 'row', gap: 12, paddingTop: 12 },
        backButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary },
        laterButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        laterText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSecondary },
    })
}
