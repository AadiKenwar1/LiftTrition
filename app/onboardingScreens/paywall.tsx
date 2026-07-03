import PressableScale from '@/components/NeutralComponents/PressableScale'
import { useBilling } from '@/context/BillingContext'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { lbsToKg } from '@/lib/utils/unitConversions'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Plan = 'monthly' | 'annual'
/** Matches the RevenueCat product's intro period — keep in sync with the dashboard config. */
const TRIAL = 3
const FEATURES = [
    { Icon: Database, label: 'Food DB' },
    { Icon: BarChart3, label: 'Charts' },
    { Icon: Sparkles, label: 'AI Scan' },
    { Icon: Zap, label: '& More' },
]

/**
 * Onboarding — paywall (final screen, blue funnel). Real RevenueCat: subscribe / restore both complete
 * onboarding; "Maybe later" completes as a free user (parity with old onboarding10's Finish). completeOnboarding
 * sets onboardingComplete + onboardingCompletedAt and router.replace('/(tabs)').
 */
export default function OnboardingPaywall() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const topPad = Math.max(insets.top, 12) + 16
    const { settings, setSettings } = useSettings()
    const { loading, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo, purchasePackage, restorePurchases, error } = useBilling()
    const accent = colors.text
    const [plan, setPlan] = useState<Plan>('annual')
    const [purchasing, setPurchasing] = useState(false)

    const metric = settings.unitSystem === 'metric'
    const unit = metric ? 'kg' : 'lb'
    const paceDisplay = metric ? lbsToKg(settings.goalPace) : settings.goalPace
    const weeks = settings.goalType === 'maintain' ? 12 : Math.max(1, Math.round(Math.abs(settings.bodyWeight - settings.goalWeight) / (paceDisplay > 0 ? paceDisplay : 1)))
    const targetDate = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + weeks * 7)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }, [weeks])
    const goalLine = settings.goalType === 'maintain' ? `Maintain ${settings.goalWeight} ${unit}` : `${settings.goalWeight} ${unit} by ${targetDate}`

    const selectedPackage = plan === 'monthly' ? monthlyPackage : annualPackage

    const completeOnboarding = () => {
        setSettings({ ...settings, onboardingComplete: true, onboardingCompletedAt: new Date() })
        router.replace('/(tabs)')
    }

    const handleSubscribe = async () => {
        if (!selectedPackage) {
            Alert.alert('Error', 'Subscription package not available. Please try again later.')
            return
        }
        setPurchasing(true)
        try {
            await purchasePackage(selectedPackage)
            completeOnboarding()
        } catch (err: any) {
            if (err.userCancelled) {
                setPurchasing(false)
                return
            }
            Alert.alert('Error', err.message || 'Failed to complete purchase. Please try again.')
        } finally {
            setPurchasing(false)
        }
    }

    const handleRestore = async () => {
        try {
            await restorePurchases()
            completeOnboarding()
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to restore purchases. Please try again.')
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.workout} />
                <Text style={styles.loadingText}>Loading subscription options…</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: topPad }]} showsVerticalScrollIndicator={false}>
                <Text style={styles.eyebrow}>Your plan</Text>
                <Text style={styles.title}>It's ready.</Text>
                <Text style={styles.subtitle}>Your daily targets, workouts, and food tracking — tailored to your goal.</Text>

                <View style={styles.planCard}>
                    <View style={styles.planRow}>
                        <Text style={styles.planLabel}>Goal</Text>
                        <Text style={styles.planValue}>{goalLine}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.planRow}>
                        <Text style={styles.planLabel}>Daily target</Text>
                        <Text style={styles.planValue}>{settings.calorieGoal.toLocaleString()} kcal</Text>
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
                    <PressableScale style={[styles.priceCard, plan === 'monthly' && { borderColor: colors.workout }]} onPress={() => setPlan('monthly')}>
                        <Text style={styles.priceName}>Monthly</Text>
                        <Text style={[styles.priceAmount, { color: accent }]}>{priceInfo?.price ?? '$6.99'}</Text>
                        <Text style={styles.priceNote}>{TRIAL} day free trial</Text>
                    </PressableScale>
                    <PressableScale style={[styles.priceCard, plan === 'annual' && { borderColor: colors.workout }]} onPress={() => setPlan('annual')}>
                        <Text style={styles.priceName}>Annual</Text>
                        <Text style={[styles.priceAmount, { color: accent }]}>{annualPriceInfo?.price ?? '$39.99'}</Text>
                        <Text style={styles.priceNote}>{TRIAL} day free trial</Text>
                        <Text style={[styles.badge, { color: colors.workout }]}>Best value</Text>
                    </PressableScale>
                </View>

                {error && <Text style={styles.errorText}>{error.message}</Text>}

                <TouchableOpacity style={styles.cta} onPress={handleSubscribe} activeOpacity={0.85} disabled={!selectedPackage || purchasing || hasPremium}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
                        {purchasing ?
                            <ActivityIndicator size="small" color="#fff" />
                        :   <Text style={styles.ctaText}>{hasPremium ? 'Subscription Active' : `Start ${TRIAL}-Day Free Trial`}</Text>}
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.ratingRow}>
                    <Text style={styles.stars}>★★★★★</Text>
                    <Text style={styles.ratingText}>5.0</Text>
                </View>

                <View style={styles.trust}>
                    <Text style={styles.trustLine}>Cancel anytime · billed securely through Apple</Text>
                    <Text style={styles.trustLine}>Your data is never sold or shared</Text>
                </View>

                <TouchableOpacity onPress={handleRestore} disabled={purchasing} activeOpacity={0.5} style={[styles.restore, purchasing && styles.footerDisabled]}>
                    <Text style={styles.restoreText}>Restore Purchases</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                <TouchableOpacity style={[styles.backButton, purchasing && styles.footerDisabled]} onPress={() => router.back()} disabled={purchasing} activeOpacity={0.8}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.laterButton, purchasing && styles.footerDisabled]} onPress={completeOnboarding} disabled={purchasing} activeOpacity={0.8}>
                    <Text style={styles.laterText}>Maybe later</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        loadingText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, marginTop: 14 },
        scroll: { flex: 1 },
        content: { paddingBottom: 16 },
        eyebrow: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textMuted, marginBottom: 8 },
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
        errorText: { fontFamily: fonts.regular, fontSize: 13, color: colors.destructive, textAlign: 'center', marginBottom: 10 },
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
        footerDisabled: { opacity: 0.5 },
        backButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary },
        laterButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        laterText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSecondary },
    })
}
