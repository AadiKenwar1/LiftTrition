import { useBilling } from '@/context/BillingContext'
import { useSettings } from '@/context/SettingsContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type PlanType = 'monthly' | 'annual'

/** Premium paywall always uses blue accent (independent of app light/dark mode). */
const ACCENT = '#2f80ed'
const GRADIENT_COLORS = ['rgba(47, 128, 237, 0.14)', 'transparent'] as const

export default function Onboarding10Screen() {
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual')
    const [purchasing, setPurchasing] = useState(false)
    const { settings, setSettings } = useSettings()
    const { loading, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo, purchasePackage, restorePurchases, error } = useBilling()

    const completeOnboarding = () => {
        setSettings({
            ...settings,
            onboardingComplete: true,
            onboardingCompletedAt: new Date(),
        })
        router.replace('/(tabs)')
    }

    const selectedPackage = selectedPlan === 'monthly' ? monthlyPackage : annualPackage

    const handleSubscribe = async () => {
        const pkg = selectedPlan === 'monthly' ? monthlyPackage : annualPackage
        if (!pkg) {
            Alert.alert('Error', 'Subscription package not available. Please try again later.')
            return
        }

        setPurchasing(true)
        try {
            await purchasePackage(pkg)
            Alert.alert('Success', 'Your subscription is now active!')
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
            Alert.alert('Success', 'Purchases restored successfully!')
            completeOnboarding()
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to restore purchases. Please try again.')
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <LinearGradient colors={GRADIENT_COLORS} style={styles.topGradient} pointerEvents="none" />
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={styles.loadingText}>Loading subscription options...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={GRADIENT_COLORS} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Icon */}
                <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                    <Ionicons name="sparkles" size={72} color={ACCENT} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Unlock Premium?</Text>
                <Text style={styles.subtitleText}>Get AI food analysis, food database access, and more</Text>

                {/* Features Grid */}
                <View style={styles.featuresSection}>
                    <View style={styles.featuresRow}>
                        <View style={styles.featureItem}>
                            <Database size={18} color={ACCENT} strokeWidth={2} />
                            <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                                Food Database
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Sparkles size={18} color={ACCENT} strokeWidth={2} />
                            <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                                AI Features
                            </Text>
                        </View>
                    </View>
                    <View style={styles.featuresRow}>
                        <View style={styles.featureItem}>
                            <BarChart3 size={18} color={ACCENT} strokeWidth={2} />
                            <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                                Extra Charts
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Zap size={16} color={ACCENT} strokeWidth={2} />
                            <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                                And More
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Pricing - Monthly & Annual */}
                <View style={styles.pricingRow}>
                    <TouchableOpacity style={[styles.pricingCard, selectedPlan === 'monthly' && { ...styles.pricingCardSelected, borderColor: ACCENT }]} onPress={() => setSelectedPlan('monthly')} activeOpacity={0.8} disabled={!monthlyPackage}>
                        <Text style={[styles.planLabel]} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                            Monthly
                        </Text>
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceAmount, { color: ACCENT }]} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1}>
                                {priceInfo?.price || '$4.99'}
                            </Text>
                            <Text style={styles.priceInterval} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                                /month
                            </Text>
                        </View>
                        <Text style={styles.pricingNote} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}>
                            3 day free trial
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.pricingCard, selectedPlan === 'annual' && { ...styles.pricingCardSelected, borderColor: ACCENT }]} onPress={() => setSelectedPlan('annual')} activeOpacity={0.8} disabled={!annualPackage}>
                        <Text style={styles.planLabel} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                            Annual
                        </Text>
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceAmount, { color: ACCENT }]} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1}>
                                {annualPriceInfo?.price || '$39.99'}
                            </Text>
                            <Text style={styles.priceInterval} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                                /year
                            </Text>
                        </View>
                        <Text style={styles.pricingNote} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}>
                            3 day free trial
                        </Text>
                        <Text style={[styles.saveBadge, { color: ACCENT }]} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                            Best value
                        </Text>
                    </TouchableOpacity>
                </View>

                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error.message}</Text>
                    </View>
                )}

                <View style={styles.subscribeBlock}>
                    <TouchableOpacity
                        style={[
                            styles.subscribeButton,
                            {
                                shadowColor: ACCENT,
                                backgroundColor: '#D4E4FF',
                            },
                            (hasPremium || purchasing) && styles.subscribeButtonDisabled,
                        ]}
                        onPress={handleSubscribe}
                        activeOpacity={0.8}
                        disabled={!selectedPackage || hasPremium || purchasing}
                    >
                        {purchasing ?
                            <ActivityIndicator size="small" color="#000" />
                        :   <Text style={styles.subscribeButtonText}>{hasPremium ? 'Subscription Active' : 'Subscribe Now'}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} activeOpacity={0.5}>
                        <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.navButtonRow}>
                    <TouchableOpacity style={styles.navBackButton} onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={styles.navBackButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navContinueButton} onPress={completeOnboarding} activeOpacity={0.8}>
                        <Text style={styles.navContinueButtonText}>Finish</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 25,
        paddingTop: 48,
        paddingBottom: 50,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 220,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        marginTop: 16,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 16,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#282A2C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 8,
    },
    titleText: {
        fontSize: 24,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 2,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 0.2,
        marginBottom: 8,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    featuresSection: {
        width: '100%',
        marginBottom: 8,
    },
    featuresRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    featureItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    featureText: {
        flex: 1,
        minWidth: 0,
        fontSize: 15,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    pricingRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginBottom: 10,
    },
    pricingCard: {
        flex: 1,
        backgroundColor: '#282A2C',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#333',
    },
    pricingCardSelected: {
        borderWidth: 3,
    },
    planLabel: {
        width: '100%',
        fontSize: 13,
        color: '#aaa',
        marginBottom: 4,
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
    saveBadge: {
        width: '100%',
        fontSize: 11,
        marginTop: 6,
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        flexWrap: 'wrap',
        width: '100%',
        marginBottom: 2,
        gap: 2,
    },
    priceAmount: {
        flexShrink: 1,
        minWidth: 0,
        fontSize: 22,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
    priceInterval: {
        flexShrink: 0,
        fontSize: 17,
        color: '#888',
        marginLeft: 2,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    pricingNote: {
        width: '100%',
        fontSize: 13,
        color: '#aaa',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
        textAlign: 'center',
    },
    errorContainer: {
        width: '100%',
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderRadius: 10,
        padding: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 13,
        textAlign: 'center',
        fontFamily: 'Poppins_400Regular',
    },
    subscribeBlock: {
        alignSelf: 'stretch',
        width: '100%',
        gap: 10,
        marginTop: 8,
        marginBottom: 8,
    },
    footer: {
        width: '100%',
        gap: 12,
    },
    subscribeButton: {
        alignSelf: 'stretch',
        width: '100%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    subscribeButtonDisabled: {
        opacity: 0.7,
    },
    subscribeButtonText: {
        fontSize: 17,
        color: '#000',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    navButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        gap: 12,
    },
    navBackButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#282A2C',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#242424',
    },
    navBackButtonText: {
        fontSize: 17,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    navContinueButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#D4E4FF',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    navContinueButtonText: {
        fontSize: 16,
        color: '#000',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    restoreButton: {
        backgroundColor: 'transparent',
        alignSelf: 'center',
        paddingVertical: 2,
    },
    restoreButtonText: {
        fontSize: 16,
        color: '#2f80ed',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
