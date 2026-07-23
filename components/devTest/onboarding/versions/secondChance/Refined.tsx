import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Clock, Gift } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useScreenTopPad } from '@/lib/hooks/useScreenTopPad'

/**
 * Dev-only NEW step shown to non-converters after they tap "Maybe later" on the paywall — a one-time 24h
 * offer (onboardingresearch.md line 21: lifts ARPU ~10–15% without devaluing for everyone). Inert.
 * NOTE: pricing + discount are PLACEHOLDERS — wire real RevenueCat offerings before shipping.
 */
export default function SecondChance() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.workout
    const router = useRouter()
    const topPad = useScreenTopPad()

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '24', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(320)} style={[styles.iconCircle, { borderColor: accent }]}>
                    <Gift size={56} color={accent} strokeWidth={2} />
                </Animated.View>

                <Text style={styles.titleText}>Wait — here's 40% off</Text>
                <Text style={styles.subtitleText}>Your plan is still ready. As a one-time welcome, take 40% off your first year.</Text>

                <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.offerCard}>
                    <Text style={styles.planLabel}>Annual · first year</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceWas}>$39.99</Text>
                        <Text style={[styles.priceNow, { color: accent }]}>$23.99</Text>
                    </View>
                    <Text style={styles.planSub}>Includes your 14-day free trial · cancel anytime</Text>
                </Animated.View>

                <View style={styles.expiryRow}>
                    <Clock size={15} color={colors.warning} strokeWidth={2.4} />
                    <Text style={[styles.expiryText, { color: colors.warning }]}>Offer expires in 24 hours</Text>
                </View>

                <Text style={styles.placeholderNote}>Placeholder pricing — wire a real RevenueCat second-chance offering before shipping.</Text>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.claimButton} onPress={() => {}} activeOpacity={0.85}>
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.claimGradient}>
                        <Text style={styles.claimText}>Claim my 40% off</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineButton} onPress={() => router.back()} activeOpacity={0.6}>
                    <Text style={styles.declineText}>No thanks</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 25, paddingBottom: 50 },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
        scroll: { flex: 1 },
        scrollContent: { alignItems: 'center', paddingBottom: 16 },
        iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 20 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.text, letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, letterSpacing: 0.2, marginBottom: 24, paddingHorizontal: 8 },
        offerCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 20, borderWidth: 2, borderColor: colors.workout, alignItems: 'center', gap: 6, marginBottom: 16 },
        planLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
        priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
        priceWas: { fontFamily: fonts.semibold, fontSize: 20, color: colors.textMuted, textDecorationLine: 'line-through' },
        priceNow: { fontFamily: fonts.extrabold, fontSize: 34, letterSpacing: -0.5 },
        planSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.1 },
        expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
        expiryText: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.2 },
        placeholderNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 8 },
        footer: { width: '100%', gap: 10, paddingTop: 12 },
        claimButton: { width: '100%', height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        claimGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        claimText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
        declineButton: { alignSelf: 'center', paddingVertical: 10 },
        declineText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, letterSpacing: -0.3 },
    })
}
