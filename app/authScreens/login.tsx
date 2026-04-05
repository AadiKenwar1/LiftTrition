import TermsAndPrivacyModal from '@/components/NeutralComponents/TermsAndPrivacyModal'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { Settings } from '@/context/SettingsContext/types'
import { AntDesign } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function LoginScreen() {
    const [termsModalVisible, setTermsModalVisible] = useState(false)
    const { signInWithApple, loading } = useAuth()
    const { settings, setSettings } = useSettings()
    const router = useRouter()

    function handleResetOnboarding() {
        const updatedSettings: Settings = {
            ...settings,
            onboardingComplete: false,
            onboardingCompletedAt: undefined,
        }
        setSettings(updatedSettings)
        router.push('/onboardingScreens/onboarding1')
    }

    async function handleAppleSignIn() {
        await signInWithApple()
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(255, 255, 255, 0.07)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            {/* Logo/Branding Section */}
            <View style={styles.brandingContainer}>
                <View style={styles.logoContainer}>
                    <Image source={require('@/assets/images/LTpng.png')} style={{ width: '175%', height: '175%' }} contentFit="contain" priority="high" />
                </View>

                <Text style={styles.appName}>LiftTrition</Text>
                <Text style={styles.tagline}> Progress Starts With Tracking</Text>
            </View>

            {/* Sign In Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.appleButton, loading && styles.appleButtonDisabled]} onPress={handleAppleSignIn} activeOpacity={0.8} disabled={loading}>
                    <AntDesign name="apple" size={28} color="#000" />
                    <Text style={styles.appleButtonText}>{loading ? 'Signing in...' : 'Continue with Apple'}</Text>
                </TouchableOpacity>
            </View>

            {/* Terms */}
            <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>
                    Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>
                    Privacy Policy
                </Text>
            </Text>
            <TermsAndPrivacyModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#121212',
        paddingHorizontal: 25,
        justifyContent: 'center',
        paddingBottom: 50,
        paddingTop: 60,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 220,
    },
    brandingContainer: {
        alignItems: 'center',
    },
    logoContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
    },
    appName: {
        fontSize: 60,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -1.5,
        marginBottom: 0,
        fontFamily: 'Poppins_800ExtraBold',
    },
    tagline: {
        fontSize: 22,
        fontWeight: '500',
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_500Medium',
        marginBottom: 24,
        textAlign: 'center',
    },
    subtagline: {
        fontSize: 20,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_500Medium_Italic',
        marginBottom: 24,
        textAlign: 'center',
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    appleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 56,
        backgroundColor: 'white',
        borderRadius: 16,
        gap: 7,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#242424',
    },
    appleButtonDisabled: {
        opacity: 0.6,
    },
    sentryTestButton: {
        width: '100%',
        height: 44,
        backgroundColor: 'transparent',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        marginTop: 8,
    },
    sentryTestText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        letterSpacing: -0.3,
    },
    appleButtonText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        letterSpacing: -0.3,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 56,
        backgroundColor: '#fff',
        borderRadius: 16,
        gap: 12,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    googleButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1e1e1e',
        letterSpacing: -0.3,
    },
    resetButton: {
        width: '100%',
        height: 48,
        backgroundColor: 'transparent',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        marginTop: 8,
    },
    resetText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666',
        letterSpacing: -0.3,
    },
    termsText: {
        position: 'absolute',
        bottom: 30,
        fontSize: 12,
        fontWeight: '400',
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 32,
    },
    termsLink: {
        color: '#2f80ed',
        fontFamily: 'Poppins_600SemiBold',
        textDecorationLine: 'underline',
    },
})
