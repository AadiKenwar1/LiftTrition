import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Dumbbell, HeartPulse, TrendingDown, Zap } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import StepProgress from '../_shared/StepProgress'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/**
 * Dev-only NEW step (goal-first motivation routing) — the missing fitness pattern: open by asking the
 * user's #1 goal and route the tone around it (onboardingresearch.md line 30). Themed + motion; inert.
 */
const GOALS = [
    { id: 'lose', icon: TrendingDown, label: 'Lose weight', sub: 'Cut fat, stay strong' },
    { id: 'muscle', icon: Dumbbell, label: 'Build muscle', sub: 'Add size and mass' },
    { id: 'strength', icon: Zap, label: 'Get stronger', sub: 'Push your numbers up' },
    { id: 'health', icon: HeartPulse, label: 'Improve health', sub: 'Feel better day to day' },
]

export default function GoalMotivation() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.nutrition
    const router = useRouter()
    const topPad = useScreenTopPad()
    const [selected, setSelected] = useState<string | null>(null)

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '1F', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StepProgress current={0} total={12} accent={accent} />

                <Text style={styles.titleText}>What's your #1 goal?</Text>
                <Text style={styles.subtitleText}>We'll build your whole plan around this — you can change it later.</Text>

                <View style={styles.optionsContainer}>
                    {GOALS.map((g, i) => {
                        const Icon = g.icon
                        const active = selected === g.id
                        return (
                            <Animated.View key={g.id} entering={FadeInDown.delay(i * 50).duration(280)}>
                                <PressableScale style={[styles.optionButton, active && { borderColor: accent, backgroundColor: accent + '12' }]} onPress={() => setSelected(g.id)}>
                                    <View style={[styles.optionIconBox, { backgroundColor: accent + '1F' }]}>
                                        <Icon size={22} color={accent} strokeWidth={2.2} />
                                    </View>
                                    <View style={styles.optionTextWrap}>
                                        <Text style={[styles.optionLabel, active && { color: colors.text }]}>{g.label}</Text>
                                        <Text style={styles.optionSub}>{g.sub}</Text>
                                    </View>
                                </PressableScale>
                            </Animated.View>
                        )
                    })}
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.85}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
                        <Text style={styles.nextButtonText}>Next</Text>
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
        optionsContainer: { gap: 12 },
        optionButton: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, borderWidth: 2, borderColor: colors.border },
        optionIconBox: { width: 44, height: 44, borderRadius: radius.iconTile, justifyContent: 'center', alignItems: 'center' },
        optionTextWrap: { flex: 1, gap: 2 },
        optionLabel: { fontFamily: fonts.bold, fontSize: 17, color: colors.text, letterSpacing: -0.3 },
        optionSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.1 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12, paddingTop: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.5 },
    })
}
