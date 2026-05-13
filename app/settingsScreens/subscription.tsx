import TermsAndPrivacyModal from '@/components/NeutralComponents/TermsAndPrivacyModal'
import { useBilling } from '@/context/BillingContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { useNavigation } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const ACCENT = '#2f80ed'

type PlanType = 'monthly' | 'annual'

export default function SubscriptionScreen() {
    const navigation = useNavigation()
    const [termsModalVisible, setTermsModalVisible] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual')
    const [purchasing, setPurchasing] = useState(false)
    const { loading, hasPremium, monthlyPackage, annualPackage, priceInfo, annualPriceInfo, purchasePackage, restorePurchases, error } = useBilling()

    // Prevent leaving the screen while a purchase is in progress (back button, swipe back, hardware back, etc.)
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            if (!purchasing) return
            e.preventDefault()
        })
        return unsubscribe
    }, [navigation, purchasing])

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
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to restore purchases. Please try again.')
        }
    }

    const handleManageSubscription = () => {
        const url = Platform.select({
            ios: 'https://apps.apple.com/account/subscriptions',
            android: 'https://play.google.com/store/account/subscriptions',
            default: 'https://apps.apple.com/account/subscriptions',
        })
        Linking.openURL(url)
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={styles.loadingText}>Loading subscription options...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces>
                {/* Icon */}
                <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                    <Ionicons name="sparkles" size={72} color={ACCENT} />
                </View>

                {/* Title */}
                <Text style={styles.titleText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                    Unlock Premium?
                </Text>
                <Text style={styles.subtitleText} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={3}>
                    Get AI food analysis, food database access, and more
                </Text>

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
                        <Text style={styles.planLabel} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
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

                {/* Button Stack */}
                <View style={styles.buttonStack}>
                    <TouchableOpacity style={[styles.subscribeButton, (hasPremium || purchasing) && styles.subscribeButtonDisabled]} onPress={handleSubscribe} activeOpacity={0.8} disabled={!selectedPackage || hasPremium || purchasing}>
                        {purchasing ?
                            <ActivityIndicator size="small" color="#fff" />
                        :   <Text style={styles.subscribeButtonText} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={2}>
                                {hasPremium ? 'Subscription Active' : 'Subscribe Now'}
                            </Text>}
                    </TouchableOpacity>

                    <View style={styles.linksRow}>
                        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} activeOpacity={0.5}>
                            <Text style={[styles.restoreButtonText, { color: ACCENT }]} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}>
                                Restore Purchases
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.restoreButton} onPress={handleManageSubscription} activeOpacity={0.5}>
                            <Text style={[styles.restoreButtonText, { color: '#aaa' }]} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}>
                                Manage subscription
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.legalText} adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={6}>
                    By subscribing, you agree to our{' '}
                    <Text style={[styles.termsLink, { color: ACCENT }]} onPress={() => setTermsModalVisible(true)}>
                        Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text style={[styles.termsLink, { color: ACCENT }]} onPress={() => setTermsModalVisible(true)}>
                        Privacy Policy
                    </Text>
                    .
                </Text>
                <TermsAndPrivacyModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 25,
        paddingTop: 24,
        paddingBottom: 32,
        alignItems: 'center',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 25,
    },
    loadingText: {
        color: '#888',
        marginTop: 16,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
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
        width: '100%',
        fontSize: 28,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 2,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        width: '100%',
        fontSize: 16,
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
    buttonStack: {
        width: '100%',
        gap: 8,
    },
    linksRow: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
    },
    subscribeButton: {
        width: '100%',
        minHeight: 52,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: ACCENT,
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    subscribeButtonDisabled: {
        opacity: 0.7,
    },
    subscribeButtonText: {
        maxWidth: '100%',
        fontSize: 17,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
    restoreButton: {
        backgroundColor: 'transparent',
        alignSelf: 'center',
        paddingVertical: 4,
    },
    restoreButtonText: {
        maxWidth: '100%',
        fontSize: 15,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
    legalText: {
        width: '100%',
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        lineHeight: 14,
        letterSpacing: 0.2,
        paddingHorizontal: 8,
        marginTop: 4,
        marginBottom: 4,
        fontFamily: 'Poppins_400Regular',
    },
    termsLink: {
        fontFamily: 'Poppins_600SemiBold',
        textDecorationLine: 'underline',
    },
})
