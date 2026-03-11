import TermsAndPrivacyModal from '@/components/NeutralComponents/TermsAndPrivacyModal'
import { useBilling } from '@/context/BillingContext'
import { useSettings } from '@/context/SettingsContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function Onboarding10Screen() {
    const [termsModalVisible, setTermsModalVisible] = useState(false)
    const { settings, setSettings } = useSettings()
    const { loading, hasPremium, monthlyPackage, priceInfo, purchasePackage, restorePurchases, error } = useBilling()
    const [purchasing, setPurchasing] = useState(false)

    const completeOnboarding = () => {
        setSettings({
            ...settings,
            onboardingComplete: true,
            onboardingCompletedAt: new Date(),
        })
        router.replace('/(tabs)')
    }

    const handleSubscribe = async () => {
        if (!monthlyPackage) {
            Alert.alert('Error', 'Subscription package not available. Please try again later.')
            return
        }

        setPurchasing(true)
        try {
            await purchasePackage(monthlyPackage)
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
                <ActivityIndicator size="large" color="#2f80ed" />
                <Text style={styles.loadingText}>Loading subscription options...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Ionicons name="sparkles-outline" size={72} color="#2f80ed" />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Unlock Premium?</Text>
                <Text style={styles.subtitleText}>Get AI food analysis, food database access, and more</Text>

                {/* Features Grid */}
                <View style={styles.featuresSection}>
                    <View style={styles.featuresRow}>
                        <View style={styles.featureItem}>
                            <Database size={16} color="#2f80ed" strokeWidth={2} />
                            <Text style={styles.featureText}>Food Database</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Sparkles size={16} color="#2f80ed" strokeWidth={2} />
                            <Text style={styles.featureText}>AI Features</Text>
                        </View>
                    </View>
                    <View style={styles.featuresRow}>
                        <View style={styles.featureItem}>
                            <BarChart3 size={16} color="#2f80ed" strokeWidth={2} />
                            <Text style={styles.featureText}>Extra Charts</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Zap size={16} color="#2f80ed" strokeWidth={2} />
                            <Text style={styles.featureText}>And More</Text>
                        </View>
                    </View>
                </View>

                {/* Pricing */}
                <View style={styles.pricingCard}>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceAmount}>{priceInfo?.price || '$4.99'}</Text>
                        <Text style={styles.priceInterval}>/{priceInfo?.period || 'month'}</Text>
                    </View>
                    <Text style={styles.pricingNote}>3 day Free Trial Included {'\n'}Cancel anytime</Text>
                </View>

                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error.message}</Text>
                    </View>
                )}

                {/* Subscribe Button */}
                <TouchableOpacity style={[styles.subscribeButton, (hasPremium || purchasing) && styles.subscribeButtonDisabled]} onPress={handleSubscribe} activeOpacity={0.8} disabled={!monthlyPackage || hasPremium || purchasing}>
                    {purchasing ?
                        <ActivityIndicator size="small" color="#fff" />
                    :   <Text style={styles.subscribeButtonText}>{hasPremium ? 'Subscription Active' : 'Subscribe Now'}</Text>}
                </TouchableOpacity>

                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                {/* Continue to app - basic text */}
                <TouchableOpacity onPress={completeOnboarding} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.continueTouchable}>
                    <Text style={styles.continueText}>Continue to app</Text>
                </TouchableOpacity>

                {/* Restore Button */}
                <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} activeOpacity={0.7}>
                    <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                </TouchableOpacity>

                <Text style={styles.legalText}>
                    By subscribing, you agree to our{' '}
                    <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>Privacy Policy</Text>
                    .
                </Text>
                <TermsAndPrivacyModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 25,
        paddingTop: 60,
        paddingBottom: 30,
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
    content: {
        flex: 1,
        alignItems: 'center',
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#242424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2f80ed',
        marginBottom: 8,
    },
    titleText: {
        fontSize: 32,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 18,
        letterSpacing: 0.2,
        marginBottom: 12,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    featuresSection: {
        width: '100%',
        marginBottom: 10,
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
        backgroundColor: '#1e1e1e',
        borderRadius: 10,
        padding: 15,
        gap: 6,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    featureText: {
        fontSize: 14,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    pricingCard: {
        width: '100%',
        backgroundColor: 'rgba(45, 156, 255, 0.1)',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(45, 156, 255, 0.3)',
        marginBottom: 16,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 2,
    },
    priceAmount: {
        fontSize: 28,
        color: '#2f80ed',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    priceInterval: {
        fontSize: 16,
        color: '#888',
        marginLeft: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    pricingNote: {
        fontSize: 12,
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
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 13,
        textAlign: 'center',
        fontFamily: 'Poppins_400Regular',
    },
    subscribeButton: {
        width: '100%',
        height: 48,
        backgroundColor: '#2f80ed',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    subscribeButtonDisabled: {
        opacity: 0.8,
    },
    subscribeButtonText: {
        fontSize: 17,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    backButton: {
        width: '100%',
        height: 48,
        backgroundColor: '#282A2C',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#242424',
    },
    backButtonText: {
        fontSize: 17,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    restoreButton: {
        width: '100%',
        height: 36,
        backgroundColor: 'transparent',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
    },
    restoreButtonText: {
        fontSize: 14,
        color: '#2f80ed',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    legalText: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        lineHeight: 14,
        letterSpacing: 0.2,
        paddingHorizontal: 8,
        marginBottom: 8,
        fontFamily: 'Poppins_400Regular',
    },
    termsLink: {
        color: '#2f80ed',
        fontFamily: 'Poppins_600SemiBold',
        textDecorationLine: 'underline',
    },
    continueTouchable: {
        marginBottom: 4,
    },
    continueText: {
        fontSize: 16,
        color: '#2f80ed',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
})
