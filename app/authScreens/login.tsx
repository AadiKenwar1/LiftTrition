import TermsAndPrivacyModal from '@/components/NeutralComponents/TermsAndPrivacyModal'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { Settings } from '@/context/SettingsContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { AntDesign } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function LoginScreen() {
    const [termsModalVisible, setTermsModalVisible] = useState(false)
    const { signInWithApple, loading } = useAuth()
    const { settings, setSettings } = useSettings()
    const router = useRouter()
    const insets = useSafeAreaInsets()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    function handleResetOnboarding() {
        const updatedSettings: Settings = {
            ...settings,
            onboardingComplete: false,
            onboardingCompletedAt: undefined,
        }
        setSettings(updatedSettings)
        router.push('/onboardingScreens/introduction')
    }

    async function handleAppleSignIn() {
        await signInWithApple()
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(255, 255, 255, 0.07)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.brandingContainer}>
                    <View style={styles.logoContainer}>
                        <Image source={require('@/assets/images/AppIconPng.png')} style={{ width: '175%', height: '175%' }} contentFit="contain" priority="high" />
                    </View>

                    <Text style={styles.appName} adjustsFontSizeToFit minimumFontScale={0.45} numberOfLines={1}>
                        LIFTRI
                    </Text>
                    <Text style={styles.tagline}>Built for Strength, Physique, and Performance.</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={[styles.appleButton, loading && styles.appleButtonDisabled]} onPress={handleAppleSignIn} activeOpacity={0.8} disabled={loading}>
                        <AntDesign name="apple" size={28} color="#000" />
                        <Text style={styles.appleButtonText}>{loading ? 'Signing in...' : 'Continue with Apple'}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.termsText}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>
                        Terms of Service
                    </Text>{' '}
                </Text>
            </ScrollView>
            <TermsAndPrivacyModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
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
            width: '100%',
            paddingHorizontal: 25,
            paddingTop: 60,
            justifyContent: 'center',
            alignItems: 'center',
        },
        topGradient: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 220,
        },
        brandingContainer: {
            width: '100%',
            alignItems: 'center',
        },
        logoContainer: {
            width: 200,
            height: 200,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
        },
        appName: {
            width: '100%',
            fontSize: 60,
            color: colors.text,
            letterSpacing: -0,
            marginBottom: 0,
            textAlign: 'center',
            fontFamily: fonts.extrabold,
        },
        tagline: {
            fontSize: 20,
            color: colors.textMuted,
            letterSpacing: -0.5,
            fontFamily: fonts.medium,
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
            borderRadius: radius.cardLg,
            gap: 7,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        appleButtonDisabled: {
            opacity: 0.6,
        },
        appleButtonText: {
            fontSize: 20,
            color: '#000',
            letterSpacing: -0.3,
            fontFamily: fonts.semibold,
        },
        termsText: {
            width: '100%',
            marginTop: 28,
            fontSize: 12,
            color: colors.textMuted,
            textAlign: 'center',
            lineHeight: 18,
            paddingHorizontal: 8,
            fontFamily: fonts.regular,
        },
        termsLink: {
            color: colors.workoutInk,
            fontFamily: fonts.semibold,
            textDecorationLine: 'underline',
        },
    })
}
