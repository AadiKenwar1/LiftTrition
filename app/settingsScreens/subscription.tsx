import PressableScale from '@/components/NeutralComponents/PressableScale'
import TermsAndPrivacyModal from '@/components/NeutralComponents/TermsAndPrivacyModal'
import { hasActiveEntitlement, useBilling } from '@/context/BillingContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useSubmitOnce } from '@/lib/hooks/useSubmitOnce'
import { useScreenBottomPad } from '@/lib/hooks/useScreenBottomPad'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from 'expo-router'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Plan = 'monthly' | 'annual'
/** Matches the RevenueCat product's intro period — keep in sync with the dashboard config + the onboarding paywall. */
const TRIAL = 3
const FEATURES = [
    { Icon: Database, label: 'Food DB' },
    { Icon: BarChart3, label: 'Charts' },
    { Icon: Sparkles, label: 'AI Scan' },
    { Icon: Zap, label: '& More' },
]

/**
 * Subscription (Settings) — the V4 paywall look, but a standalone settings screen (not the onboarding flow):
 * purchase success shows an Alert (no navigation), a beforeRemove guard blocks leaving mid-purchase, and it
 * keeps Manage-subscription + the already-premium state. Blue funnel = selected plan + CTA.
 */
export default function SubscriptionScreen() {
    const navigation = useNavigation()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const bottomPad = useScreenBottomPad(6)
    const accent = colors.text
    const [termsVisible, setTermsVisible] = useState(false)
    const [plan, setPlan] = useState<Plan>('annual')
    const [purchasing, setPurchasing] = useState(false)
    const { loading, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo, annualSavingsPercent, purchasePackage, restorePurchases, restoring, error } = useBilling()
    const [guardRestore] = useSubmitOnce()

    // Block leaving (header back, swipe, hardware back) while a purchase or restore is in progress.
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            if (!purchasing && !restoring) return
            e.preventDefault()
        })
        return unsubscribe
    }, [navigation, purchasing, restoring])

    const selectedPackage = plan === 'monthly' ? monthlyPackage : annualPackage

    const handleSubscribe = async () => {
        if (!selectedPackage) {
            Alert.alert('Error', 'Subscription package not available. Please try again later.')
            return
        }
        setPurchasing(true)
        try {
            await purchasePackage(selectedPackage)
            Alert.alert('Success', 'Your subscription is now active!')
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

    const handleRestore = guardRestore(
        async () => {
            try {
                const info = await restorePurchases()
                if (hasActiveEntitlement(info)) {
                    Alert.alert('Success', 'Purchases restored successfully!')
                } else {
                    Alert.alert('No Purchases Found', 'No purchases found for this Apple ID.')
                }
            } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to restore purchases. Please try again.')
            }
        },
        { retryable: true },
    )

    const handleManage = () => {
        const url = Platform.select({
            ios: 'https://apps.apple.com/account/subscriptions',
            android: 'https://play.google.com/store/account/subscriptions',
            default: 'https://apps.apple.com/account/subscriptions',
        })
        Linking.openURL(url)
    }

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingBottom: bottomPad }]}>
                <ActivityIndicator size="large" color={colors.workout} />
                <Text style={styles.loadingText}>Loading subscription options…</Text>
            </View>
        )
    }

    return (
        <View style={[styles.container, { paddingBottom: bottomPad }]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Unlock Premium</Text>
                <Text style={styles.subtitle}>AI food scan, the full food database, advanced charts, and more.</Text>

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
                        <Text style={[styles.badge, { color: colors.workout }]}>{`Save ${annualSavingsPercent ?? 52}%`}</Text>
                    </PressableScale>
                </View>

                {error && <Text style={styles.errorText}>{error.message}</Text>}

                <TouchableOpacity style={styles.cta} onPress={handleSubscribe} activeOpacity={0.85} disabled={!selectedPackage || purchasing || restoring || hasPremium}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
                        {purchasing ?
                            <ActivityIndicator size="small" color="#fff" />
                        :   <Text style={styles.ctaText}>{hasPremium ? 'Subscription Active' : 'Subscribe Now'}</Text>}
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

                <View style={styles.links}>
                    <TouchableOpacity onPress={handleRestore} disabled={purchasing || restoring} activeOpacity={0.5} style={(purchasing || restoring) && { opacity: 0.5 }}>
                        <Text style={styles.linkText}>Restore Purchases</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleManage} disabled={purchasing || restoring} activeOpacity={0.5} style={(purchasing || restoring) && { opacity: 0.5 }}>
                        <Text style={[styles.linkText, { color: colors.textSecondary }]}>Manage subscription</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.legal}>
                    By subscribing, you agree to our{' '}
                    <Text style={styles.legalLink} onPress={() => setTermsVisible(true)}>
                        Terms & Privacy Policy
                    </Text>
                    .
                </Text>
            </ScrollView>

            <TermsAndPrivacyModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
        loadingText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, marginTop: 14 },
        scroll: { flex: 1 },
        content: { paddingTop: 16, paddingBottom: 24 },
        title: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 21, marginBottom: 20 },
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
        trust: { alignItems: 'center', gap: 4, marginBottom: 18 },
        trustLine: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2 },
        links: { alignItems: 'center', gap: 12, marginBottom: 18 },
        linkText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, letterSpacing: -0.3 },
        legal: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
        legalLink: { color: colors.workoutInk, fontFamily: fonts.semibold, textDecorationLine: 'underline' },
    })
}
