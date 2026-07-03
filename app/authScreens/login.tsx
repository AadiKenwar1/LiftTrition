import TermsAndPrivacyModal from '@/components/NeutralComponents/TermsAndPrivacyModal'
import { useAuth } from '@/context/AuthContext'
import { fonts, radius, useColorScheme, useColors, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { Moon, Star, Sun } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Login — the brand opener and auth gate (shown when there's no session). Scheme-aware logo, wordmark,
 * honest ★★★★★ 5.0, theme toggle, and the Apple button that runs the real signInWithApple(); on success the
 * route guard reveals the onboarding flow.
 */
export default function LoginScreen() {
    const { signInWithApple, loading } = useAuth()
    const colors = useColors()
    const scheme = useColorScheme()
    const setScheme = useSetColorScheme()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const [termsVisible, setTermsVisible] = useState(false)
    const logo = scheme === 'light' ? require('@/assets/images/LogoWhite.png') : require('@/assets/images/LogoBlack.png')

    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
                <TouchableOpacity style={styles.toggle} onPress={() => setScheme(scheme === 'dark' ? 'light' : 'dark')} activeOpacity={0.7}>
                    {scheme === 'dark' ? <Sun size={20} color={colors.text} strokeWidth={2.2} /> : <Moon size={20} color={colors.text} strokeWidth={2.2} />}
                </TouchableOpacity>
            </View>

            <View style={styles.hero}>
                <Image source={logo} style={styles.mark} contentFit="contain" priority="high" />
                <Text style={styles.appName}>PLATES</Text>
                <Text style={styles.tagline}>Track your plates in the gym and kitchen.</Text>
                <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} color="#FFD93D" fill="#FFD93D" strokeWidth={0} />
                    ))}
                    <Text style={styles.ratingText}>5.0</Text>
                </View>
            </View>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
                <TouchableOpacity style={[styles.appleButton, loading && { opacity: 0.6 }]} onPress={() => signInWithApple()} activeOpacity={0.85} disabled={loading}>
                    <Ionicons name="logo-apple" size={19} color={colors.background} style={{ marginRight: 8, marginTop: -2 }} />
                    <Text style={styles.appleText}>{loading ? 'Signing in…' : 'Sign in with Apple'}</Text>
                </TouchableOpacity>
                <Text style={styles.legal}>
                    By continuing you agree to our{' '}
                    <Text style={styles.legalLink} onPress={() => setTermsVisible(true)}>
                        Terms & Privacy Policy
                    </Text>
                    .
                </Text>
            </View>

            <TermsAndPrivacyModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
        toggle: { width: 42, height: 42, borderRadius: radius.iconButton, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, justifyContent: 'center', alignItems: 'center' },
        hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        mark: { width: 184, height: 184, marginBottom: 8 },
        appName: { fontFamily: fonts.extrabold, fontSize: 44, color: colors.text, letterSpacing: -1.6, textAlign: 'center' },
        tagline: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 23, marginTop: 6, marginBottom: 16, paddingHorizontal: 16 },
        ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        ratingText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, marginLeft: 6 },
        footer: { gap: 14 },
        appleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: radius.cardLg, backgroundColor: colors.text },
        appleText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
        legal: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 16 },
        legalLink: { color: colors.workoutInk, fontFamily: fonts.semibold, textDecorationLine: 'underline' },
    })
}
