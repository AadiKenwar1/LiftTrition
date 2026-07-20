import { fonts, logoForScheme, radius, useColorScheme, useColors, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'

// paywall.tsx and subscription.tsx render an identical CTA + trust block; only the caption/button copy differs.
const CTA_TRUST_CASES: { caption: string; ctaText: string }[] = [
    { caption: 'paywall.tsx — CTA + trust', ctaText: 'Start 3-Day Free Trial' },
    { caption: 'subscription.tsx — CTA + trust', ctaText: 'Subscribe Now' },
]

/**
 * Dev-only preview for M23: the fabricated five-star rating row was removed from the three
 * purchase-adjacent screens (login hero, onboarding paywall, settings subscription). This page
 * reproduces each screen's hero/CTA block WITHOUT that row so the CTA-to-trust-line spacing can be
 * eyeballed in light and dark — there must be no star row or rating number anywhere.
 */
export default function RatingRemovalTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const scheme = useColorScheme()
    const setColorScheme = useSetColorScheme()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={scheme === 'dark' ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            <Text style={styles.hint}>Each block is the real screen's hero/CTA with the fabricated rating row removed. Confirm no star row or rating number appears and the CTA sits cleanly above the next line in light and dark.</Text>

            {/* login.tsx — logo/wordmark/tagline flows straight into the Apple CTA, with no rating row between */}
            <Text style={styles.caption}>login.tsx — hero + Sign in</Text>
            <View style={styles.card}>
                <View style={styles.hero}>
                    <Image source={logoForScheme(scheme)} style={styles.mark} contentFit="contain" />
                    <Text style={styles.appName}>PLATES</Text>
                    <Text style={styles.tagline}>Track your plates in the gym and kitchen.</Text>
                </View>
                <TouchableOpacity style={styles.appleButton} activeOpacity={0.85}>
                    <Ionicons name="logo-apple" size={19} color={colors.background} style={{ marginRight: 8, marginTop: -2 }} />
                    <Text style={styles.appleText}>Sign in with Apple</Text>
                </TouchableOpacity>
            </View>

            {/* paywall.tsx / subscription.tsx — subscribe CTA flows straight into the trust lines, with no rating row between */}
            {CTA_TRUST_CASES.map(({ caption, ctaText }) => (
                <View key={caption}>
                    <Text style={styles.caption}>{caption}</Text>
                    <View style={styles.card}>
                        <View style={styles.cta}>
                            <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
                                <Text style={styles.ctaText}>{ctaText}</Text>
                            </LinearGradient>
                        </View>
                        <View style={styles.trust}>
                            <Text style={styles.trustLine}>Cancel anytime · billed securely through Apple</Text>
                            <Text style={styles.trustLine}>Your data is never sold or shared</Text>
                        </View>
                    </View>
                </View>
            ))}
        </ScrollView>
    )
}

// Theme-reactive styles mirroring the shipped login/paywall/subscription blocks (minus the rating row).
function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.labelMuted, marginBottom: 16, lineHeight: 18 },
        caption: { fontFamily: fonts.semibold, fontSize: 12, color: colors.labelMuted, marginBottom: 8, marginLeft: 2 },
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 20, marginBottom: 24 },
        hero: { alignItems: 'center', marginBottom: 24 },
        mark: { width: 96, height: 96, marginBottom: 8 },
        appName: { fontFamily: fonts.extrabold, fontSize: 32, color: colors.text, letterSpacing: -1.2, textAlign: 'center' },
        tagline: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 6, paddingHorizontal: 8 },
        appleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: radius.cardLg, backgroundColor: colors.text },
        appleText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
        cta: { height: 58, borderRadius: radius.cardLg, overflow: 'hidden', marginBottom: 18 },
        ctaGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
        trust: { alignItems: 'center', gap: 4 },
        trustLine: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2 },
    })
}
