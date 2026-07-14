import { fonts, radius, useColorScheme, useColors, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { Moon, Star, Sun } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useOnboardingFlow } from '../_shared/flowContext'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/**
 * Dev-only V3 (black & white) Login — the real opener and brand moment (the app gates Apple Sign-In before
 * onboarding, so this is the first thing a new user sees). Carries the logo (scheme-aware), value prop, a
 * ★rating, the Apple button, and the sun/moon theme toggle. In the flow, the Apple button advances. Inert
 * otherwise. NOTE: the rating is a PLACEHOLDER, and the Apple button is a mock of expo-apple-authentication.
 */
export default function LoginV3() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const topPad = useScreenTopPad(12)
    const flow = useOnboardingFlow()
    const scheme = useColorScheme()
    const setScheme = useSetColorScheme()
    const logo = scheme === 'light' ? require('@/assets/images/LogoWhite.png') : require('@/assets/images/LogoBlack.png')

    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: topPad }]}>
                <TouchableOpacity style={styles.toggle} onPress={() => setScheme(scheme === 'dark' ? 'light' : 'dark')} activeOpacity={0.7}>
                    {scheme === 'dark' ?
                        <Sun size={20} color={colors.text} strokeWidth={2.2} />
                    :   <Moon size={20} color={colors.text} strokeWidth={2.2} />}
                </TouchableOpacity>
            </View>

            <View style={styles.hero}>
                <Image source={logo} style={styles.logo} contentFit="contain" priority="high" />
                <Text style={styles.appName}>PLATES</Text>
                <Text style={styles.tagline}>Training and nutrition that finally work together.</Text>
                <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} color="#FFD93D" fill="#FFD93D" strokeWidth={0} />
                    ))}
                    <Text style={styles.ratingText}>4.8 · loved by thousands</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.appleButton} onPress={() => flow?.goNext()} activeOpacity={0.85}>
                    <Ionicons name="logo-apple" size={19} color={colors.background} style={{ marginRight: 8, marginTop: -2 }} />
                    <Text style={styles.appleText}>Sign in with Apple</Text>
                </TouchableOpacity>
                <Text style={styles.legal}>By continuing you agree to our Terms & Privacy Policy.</Text>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
        toggle: { width: 42, height: 42, borderRadius: radius.iconButton, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, justifyContent: 'center', alignItems: 'center' },
        hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        logo: { width: 104, height: 104, marginBottom: 14 },
        appName: { fontFamily: fonts.extrabold, fontSize: 44, color: colors.text, letterSpacing: -1.6, textAlign: 'center' },
        tagline: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 23, marginTop: 6, marginBottom: 16, paddingHorizontal: 16 },
        ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        ratingText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, marginLeft: 6 },
        footer: { gap: 14 },
        appleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: radius.cardLg, backgroundColor: colors.text },
        appleText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
        legal: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 16 },
    })
}
