import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import StepProgress from '../_shared/StepProgress'
import { useScreenTopPad } from '@/lib/hooks/useScreenTopPad'

/**
 * Dev-only NEW step shown right before the paywall — a "results timeline" promise that personalizes the
 * payoff and frames the trial ("you'll see results in ~2 weeks", onboardingresearch.md lines 35, 73). Inert.
 */
const MILESTONES = [
    { week: 'Week 1', title: 'Energy up, habits forming', highlight: false },
    { week: 'Week 2', title: 'First visible changes', highlight: true },
    { week: 'Week 4', title: 'Noticeable progress', highlight: false },
    { week: 'Week 8', title: 'On track to your goal', highlight: false },
]

export default function ResultsTimeline() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.nutrition
    const router = useRouter()
    const topPad = useScreenTopPad()

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '1F', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StepProgress current={8} total={12} accent={accent} />

                <Text style={styles.titleText}>You'll see results fast</Text>
                <Text style={styles.subtitleText}>Stick with your plan and here's what to expect — most people notice changes by week 2.</Text>

                <View style={styles.timeline}>
                    {MILESTONES.map((m, i) => (
                        <Animated.View key={m.week} entering={FadeInDown.delay(i * 70).duration(300)} style={styles.row}>
                            <View style={styles.rail}>
                                <View style={[styles.node, { borderColor: accent }, m.highlight && { backgroundColor: accent }]} />
                                {i < MILESTONES.length - 1 && <View style={[styles.line, { backgroundColor: colors.hairline }]} />}
                            </View>
                            <View style={[styles.card, m.highlight && { borderColor: accent, backgroundColor: accent + '12' }]}>
                                <Text style={[styles.week, { color: accent }]}>{m.week}</Text>
                                <Text style={styles.cardTitle}>{m.title}</Text>
                                {m.highlight && <Text style={styles.badge}>You're here in 14 days</Text>}
                            </View>
                        </Animated.View>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.85}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
                        <Text style={styles.nextButtonText}>Continue</Text>
                    </LinearGradient>
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
        scrollContent: { paddingBottom: 16 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.text, letterSpacing: -0.5, marginBottom: 6 },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 21, letterSpacing: 0.2, marginBottom: 24 },
        timeline: { gap: 0 },
        row: { flexDirection: 'row', gap: 14 },
        rail: { alignItems: 'center', width: 20 },
        node: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, backgroundColor: colors.surface, marginTop: 6 },
        line: { width: 2, flex: 1, marginVertical: 4 },
        card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, gap: 3 },
        week: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
        cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, letterSpacing: -0.3 },
        badge: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12, paddingTop: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.5 },
    })
}
