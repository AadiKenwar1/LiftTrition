import { useBilling } from '@/context/BillingContext'
import { useSettings } from '@/context/SettingsContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { BarChart3, Database, Sparkles, Zap } from 'lucide-react-native'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const ACCENT = { workout: '#2f80ed', nutrition: '#22C922' }
const ACCENT_RGBA = { workout: 'rgba(45, 156, 255, 0.1)', nutrition: 'rgba(34, 201, 34, 0.1)' }
const ACCENT_RGBA_30 = { workout: 'rgba(45, 156, 255, 0.3)', nutrition: 'rgba(34, 201, 34, 0.3)' }

export default function SubscriptionScreen() {
    const { loading, hasPremium, monthlyPackage, priceInfo, purchasePackage, restorePurchases, error } = useBilling()
    const { mode } = useSettings()
    const accent = mode ? ACCENT.workout : ACCENT.nutrition
    const accentRgba = mode ? ACCENT_RGBA.workout : ACCENT_RGBA.nutrition
    const accentRgba30 = mode ? ACCENT_RGBA_30.workout : ACCENT_RGBA_30.nutrition

    const handleSubscribe = async () => {
        if (!monthlyPackage) {
            Alert.alert('Error', 'Subscription package not available. Please try again later.')
            return
        }

        try {
            await purchasePackage(monthlyPackage)
            Alert.alert('Success', 'Your subscription is now active!')
        } catch (err: any) {
            if (err.userCancelled) return
            Alert.alert('Error', err.message || 'Failed to complete purchase. Please try again.')
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

    // Show loading state
    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={accent} />
                <Text style={styles.loadingText}>Loading subscription options...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={[styles.heroIcon, { borderColor: accent }]}>
                        <Ionicons name="sparkles-outline" size={48} color={accent} />
                    </View>
                    <Text style={styles.heroTitle}>Unlock Premium</Text>
                    <Text style={styles.heroSubtitle}>Get unlimited access to AI-powered features, food database access, and advanced analytics</Text>
                </View>

                {/* Features Grid */}
                <View style={styles.featuresSection}>
                    <View style={styles.featuresRow}>
                        <View style={styles.featureItem}>
                            <Database size={20} color={accent} strokeWidth={2} />
                            <Text style={styles.featureText}>Food Database</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Sparkles size={20} color={accent} strokeWidth={2} />
                            <Text style={styles.featureText}>AI Features</Text>
                        </View>
                    </View>
                    <View style={styles.featuresRow}>
                        <View style={styles.featureItem}>
                            <BarChart3 size={20} color={accent} strokeWidth={2} />
                            <Text style={styles.featureText}>Extra Charts</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Zap size={20} color={accent} strokeWidth={2} />
                            <Text style={styles.featureText}>And More</Text>
                        </View>
                    </View>
                </View>

                {/* Pricing Section */}
                <View style={styles.pricingSection}>
                    <View style={[styles.pricingCard, { backgroundColor: accentRgba, borderColor: accentRgba30 }]}>
                        <View style={styles.priceRow}>
                            <Text style={[styles.priceAmount, { color: accent }]}>{priceInfo?.price || '$4.99'}</Text>
                            <Text style={styles.priceInterval}>/{priceInfo?.period || 'month'}</Text>
                        </View>
                        <Text style={styles.pricingNote}>3 day Free Trial Included {'\n'}Cancel anytime</Text>
                    </View>
                </View>

                {/* Error Message */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error.message}</Text>
                    </View>
                )}

                {/* Subscribe Button */}
                <TouchableOpacity
                    style={[styles.subscribeButton, { backgroundColor: hasPremium ? '#4CAF50' : accent, shadowColor: hasPremium ? '#4CAF50' : accent }, hasPremium && styles.subscribeButtonActive]}
                    onPress={handleSubscribe}
                    activeOpacity={0.8}
                    disabled={!monthlyPackage || hasPremium}
                >
                    <Text style={styles.subscribeButtonText}>
                        {hasPremium ?
                            'Subscription Active'
                        : monthlyPackage ?
                            'Subscribe Now'
                        :   'Loading...'}
                    </Text>
                </TouchableOpacity>

                {/* Restore Button */}
                <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} activeOpacity={0.7}>
                    <Text style={[styles.restoreButtonText, { color: accent }]}>Restore Purchases</Text>
                </TouchableOpacity>

                {/* Terms & Privacy */}
                <View style={styles.legalSection}>
                    <Text style={styles.legalText}>
                        By subscribing, you agree to our <Text style={[styles.legalLink, { color: accent }]}>Terms</Text> and <Text style={[styles.legalLink, { color: accent }]}>Privacy Policy</Text>
                    </Text>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 20,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    loadingText: {
        color: '#888',
        marginTop: 16,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    heroIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#242424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 10,
    },
    heroTitle: {
        fontSize: 32,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 12,
        fontFamily: 'Poppins_600SemiBold',
    },
    heroSubtitle: {
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.2,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    featuresSection: {
        marginBottom: 28,
    },
    featuresRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    featureItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    featureText: {
        fontSize: 13,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    pricingSection: {
        marginBottom: 20,
    },
    pricingCard: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 6,
    },
    priceAmount: {
        fontSize: 40,
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
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
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
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    subscribeButtonActive: {
        opacity: 0.8,
    },
    subscribeButtonText: {
        fontSize: 17,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    restoreButton: {
        width: '100%',
        height: 40,
        backgroundColor: 'transparent',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    restoreButtonText: {
        fontSize: 14,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    legalSection: {
        paddingHorizontal: 8,
    },
    legalText: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    legalLink: {
        fontFamily: 'Poppins_500Medium',
    },
})
