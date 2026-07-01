import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Clock } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useOnboardingFlow } from '../_shared/flowContext'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V4 second-chance offer — extension of hero beat 3: the green (nutritionGradient) CLAIM button is
 * the one saturated element (same "go" language as the paywall CTA); the offer card and "No thanks" stay
 * neutral. Not a numbered step. Inert. Pricing is a PLACEHOLDER.
 */
export default function SecondChanceV4() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.text

    const footer = (
        <View style={{ flex: 1, gap: 8 }}>
            <TouchableOpacity style={styles.claim} onPress={() => flow?.goNext()} activeOpacity={0.85}>
                <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.claimGradient}>
                    <Text style={styles.claimText}>Claim my 40% off</Text>
                </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.decline} onPress={() => (flow ? flow.goBack() : router.back())} activeOpacity={0.6}>
                <Text style={styles.declineText}>No thanks</Text>
            </TouchableOpacity>
        </View>
    )

    return (
        <V4Screen eyebrow="One-time offer" title="Wait — here's 40% off" subtitle="Your plan is still ready. As a one-time welcome, take 40% off your first year." accent={accent} footer={footer}>
            <View style={[styles.offerCard, { borderColor: accent }]}>
                <Text style={styles.offerLabel}>Annual · first year</Text>
                <View style={styles.priceRow}>
                    <Text style={styles.was}>$39.99</Text>
                    <Text style={[styles.now, { color: accent }]}>$23.99</Text>
                </View>
                <Text style={styles.offerSub}>Includes your 14-day free trial · cancel anytime</Text>
            </View>

            <View style={styles.expiryRow}>
                <Clock size={15} color={colors.warning} strokeWidth={2.4} />
                <Text style={[styles.expiryText, { color: colors.warning }]}>Offer expires in 24 hours</Text>
            </View>

            <Text style={styles.placeholderNote}>Placeholder pricing — wire a real RevenueCat second-chance offering before shipping.</Text>
        </V4Screen>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        offerCard: { backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 20, borderWidth: 2, alignItems: 'center', gap: 6, marginBottom: 16 },
        offerLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
        priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
        was: { fontFamily: fonts.semibold, fontSize: 20, color: colors.textMuted, textDecorationLine: 'line-through' },
        now: { fontFamily: fonts.extrabold, fontSize: 34, letterSpacing: -0.5 },
        offerSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
        expiryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
        expiryText: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.2 },
        placeholderNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic' },
        claim: { height: 58, borderRadius: radius.cardLg, overflow: 'hidden' },
        claimGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        claimText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
        decline: { alignSelf: 'center', paddingVertical: 8 },
        declineText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted },
    })
}
