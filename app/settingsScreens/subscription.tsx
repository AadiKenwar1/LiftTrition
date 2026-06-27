import TermsAndPrivacyModal from '@/components/NeutralComponents/TermsAndPrivacyModal'
import { useBilling } from '@/context/BillingContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from 'expo-router'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type PlanType = 'monthly' | 'annual'

export default function SubscriptionScreen() {
    const navigation = useNavigation()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
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
                <ActivityIndicator size="large" color={colors.workout} />
                <Text style={styles.loadingText}>Loading subscription options...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Ionicons name="sparkles" size={72} color={colors.workout} />
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
                            <Database size={18} color={colors.workout} strokeWidth={2} />
                            <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                                Food Database
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Sparkles size={18} color={colors.workout} strokeWidth={2} />
                            <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                                AI Features
                            </Text>
                        </View>
                    </View>
                    <View style={styles.featuresRow}>
                        <View style={styles.featureItem}>
                            <BarChart3 size={18} color={colors.workout} strokeWidth={2} />
                            <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                                Extra Charts
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Zap size={16} color={colors.workout} strokeWidth={2} />
                            <Text style={styles.featureText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                                And More
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Pricing - Monthly & Annual */}
                <View style={styles.pricingRow}>
                    <TouchableOpacity style={[styles.pricingCard, selectedPlan === 'monthly' && { ...styles.pricingCardSelected, borderColor: colors.workout }]} onPress={() => setSelectedPlan('monthly')} activeOpacity={0.8} disabled={!monthlyPackage}>
                        <Text style={styles.planLabel} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                            Monthly
                        </Text>
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceAmount, { color: colors.workout }]} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1}>
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
                    <TouchableOpacity style={[styles.pricingCard, selectedPlan === 'annual' && { ...styles.pricingCardSelected, borderColor: colors.workout }]} onPress={() => setSelectedPlan('annual')} activeOpacity={0.8} disabled={!annualPackage}>
                        <Text style={styles.planLabel} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                            Annual
                        </Text>
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceAmount, { color: colors.workout }]} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1}>
                                {annualPriceInfo?.price || '$39.99'}
                            </Text>
                            <Text style={styles.priceInterval} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                                /year
                            </Text>
                        </View>
                        <Text style={styles.pricingNote} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}>
                            3 day free trial
                        </Text>
                        <View style={styles.saveBadge}>
                            <Text style={styles.saveBadgeText} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
                                Best value
                            </Text>
                        </View>
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
                        <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.subscribeGradient}>
                            {purchasing ?
                                <ActivityIndicator size="small" color="#fff" />
                            :   <Text style={styles.subscribeButtonText} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={2}>
                                    {hasPremium ? 'Subscription Active' : 'Subscribe Now'}
                                </Text>
                            }
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.linksRow}>
                        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} activeOpacity={0.5} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={[styles.restoreButtonText, { color: colors.workoutInk }]} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}>
                                Restore Purchases
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.restoreButton} onPress={handleManageSubscription} activeOpacity={0.5} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={[styles.restoreButtonText, { color: colors.textSecondary }]} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}>
                                Manage subscription
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.legalText} adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={6}>
                    By subscribing, you agree to our{' '}
                    <Text style={[styles.termsLink, { color: colors.workoutInk }]} onPress={() => setTermsModalVisible(true)}>
                        Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text style={[styles.termsLink, { color: colors.workoutInk }]} onPress={() => setTermsModalVisible(true)}>
                        Privacy Policy
                    </Text>
                    .
                </Text>
                <TermsAndPrivacyModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
            </ScrollView>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scroll: {
            flex: 1,
        },
        scrollContent: {
            flexGrow: 1,
            paddingHorizontal: 20,
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
            color: colors.textMuted,
            marginTop: 16,
            fontSize: 16,
            fontFamily: fonts.regular,
        },
        iconCircle: {
            width: 144,
            height: 144,
            borderRadius: 72,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.workout,
            marginBottom: 8,
        },
        titleText: {
            width: '100%',
            fontSize: 28,
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 2,
            textAlign: 'center',
            fontFamily: fonts.semibold,
        },
        subtitleText: {
            width: '100%',
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 20,
            letterSpacing: 0.2,
            marginBottom: 16,
            paddingHorizontal: 8,
            fontFamily: fonts.regular,
        },
        featuresSection: {
            width: '100%',
            marginBottom: 16,
            gap: 8,
        },
        featuresRow: {
            flexDirection: 'row',
            gap: 8,
        },
        featureItem: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            paddingVertical: 16,
            paddingHorizontal: 16,
            gap: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        featureText: {
            flex: 1,
            minWidth: 0,
            fontSize: 15,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        pricingRow: {
            flexDirection: 'row',
            gap: 12,
            width: '100%',
            marginBottom: 16,
        },
        pricingCard: {
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            padding: 12,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.border,
        },
        pricingCardSelected: {
            borderWidth: 3,
        },
        planLabel: {
            width: '100%',
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 4,
            fontFamily: fonts.semibold,
            textAlign: 'center',
        },
        saveBadge: {
            alignSelf: 'center',
            marginTop: 6,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: radius.chip,
            backgroundColor: colors.workout + '22',
        },
        saveBadgeText: {
            fontSize: 11,
            color: colors.workoutInk,
            fontFamily: fonts.semibold,
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
            fontFamily: fonts.semibold,
            textAlign: 'center',
        },
        priceInterval: {
            flexShrink: 0,
            fontSize: 17,
            color: colors.textMuted,
            marginLeft: 2,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        pricingNote: {
            width: '100%',
            fontSize: 13,
            color: colors.textSecondary,
            letterSpacing: 0.2,
            fontFamily: fonts.medium,
            textAlign: 'center',
        },
        errorContainer: {
            width: '100%',
            backgroundColor: colors.destructive + '1A',
            borderRadius: radius.card,
            padding: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.destructive + '4D',
            marginBottom: 16,
        },
        errorText: {
            color: colors.destructive,
            fontSize: 13,
            textAlign: 'center',
            fontFamily: fonts.regular,
        },
        buttonStack: {
            width: '100%',
            gap: 12,
        },
        linksRow: {
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
        },
        subscribeButton: {
            width: '100%',
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.workout,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
        },
        subscribeGradient: {
            width: '100%',
            minHeight: 52,
            paddingVertical: 14,
            paddingHorizontal: 16,
            justifyContent: 'center',
            alignItems: 'center',
        },
        subscribeButtonDisabled: {
            opacity: 0.7,
        },
        subscribeButtonText: {
            maxWidth: '100%',
            fontSize: 17,
            color: '#fff',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
            textAlign: 'center',
        },
        restoreButton: {
            backgroundColor: 'transparent',
            alignSelf: 'center',
            paddingVertical: 4,
            paddingHorizontal: 12,
        },
        restoreButtonText: {
            maxWidth: '100%',
            fontSize: 15,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
            textAlign: 'center',
        },
        legalText: {
            width: '100%',
            fontSize: 10,
            color: colors.textMuted,
            textAlign: 'center',
            lineHeight: 14,
            letterSpacing: 0.2,
            paddingHorizontal: 8,
            marginTop: 20,
            marginBottom: 4,
            fontFamily: fonts.regular,
        },
        termsLink: {
            fontFamily: fonts.semibold,
            textDecorationLine: 'underline',
        },
    })
}
