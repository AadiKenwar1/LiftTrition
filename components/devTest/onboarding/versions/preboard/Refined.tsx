import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Activity, Ruler, ShieldCheck, SlidersHorizontal, Target } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Dev-only Refined version of the Preboard screen — restyled per RESTYLE_PLAN (theme tokens, dark +
 * light), keeps the "2 minutes" expectation and adds an explicit trust line (signup). Self-contained / inert.
 */
export default function PreboardRefined() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    const router = useRouter()

    const STEPS = [
        { icon: Ruler, label: 'Body stats', sub: 'Age, sex,\nheight & weight', color: colors.measurement },
        { icon: Activity, label: 'Activity', sub: 'Your day-to-\nday lifestyle', color: colors.workout },
        { icon: Target, label: 'Goals', sub: 'What you\nwant to achieve', color: colors.nutrition },
    ]

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.workout + '12', 'transparent']} style={styles.topGradient} pointerEvents="none" />

            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 12) + 24, paddingBottom: 16 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.iconCircle}>
                    <SlidersHorizontal size={72} color={colors.text} strokeWidth={1.8} />
                </View>

                <Text style={styles.headlineText}>Before we get started...</Text>
                <Text style={styles.purposeText}>We just need a few details to personalize your macronutrient goals and recovery targets to you.</Text>

                <View style={styles.stepsRow}>
                    {STEPS.map(({ icon: Icon, label, sub, color }, i) => (
                        <Animated.View key={label} entering={FadeInDown.delay(i * 70).duration(300)} style={styles.stepCard}>
                            <View style={[styles.stepIconBox, { backgroundColor: color + '22' }]}>
                                <Icon size={20} color={color} strokeWidth={2} />
                            </View>
                            <Text style={styles.stepLabel}>{label}</Text>
                            <Text style={styles.stepSub}>{sub}</Text>
                        </Animated.View>
                    ))}
                </View>

                {/* Trust line (signup) */}
                <View style={styles.trustRow}>
                    <ShieldCheck size={15} color={colors.textMuted} strokeWidth={2.2} />
                    <Text style={styles.trustText}>2 minutes · Your data is never sold or shared</Text>
                </View>
            </ScrollView>

            <View style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
                <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={() => {}}>
                    <Text style={styles.ctaText}>Let's Go</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
        scroll: { flex: 1 },
        scrollContent: { flexGrow: 1, width: '100%', alignItems: 'center', paddingHorizontal: 25, justifyContent: 'center' },
        iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.iconCircleBg, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border, marginBottom: 28 },
        headlineText: { fontFamily: fonts.extrabold, fontSize: 36, color: colors.text, letterSpacing: -1, marginBottom: 14, lineHeight: 42, textAlign: 'center' },
        purposeText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 23, letterSpacing: 0.1, marginBottom: 32, textAlign: 'center', paddingHorizontal: 8 },
        stepsRow: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 24 },
        stepCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        stepIconBox: { width: 40, height: 40, borderRadius: radius.iconTile, justifyContent: 'center', alignItems: 'center' },
        stepLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, letterSpacing: -0.2, textAlign: 'center' },
        stepSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, letterSpacing: 0.1, lineHeight: 16, textAlign: 'center' },
        trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        trustText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2, textAlign: 'center' },
        buttonContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 25, paddingTop: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        ctaButton: { flex: 1, height: 60, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        ctaText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
