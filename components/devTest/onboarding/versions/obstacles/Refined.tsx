import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { CalendarX, Check, Salad, TrendingDown, Utensils } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import StepProgress from '../_shared/StepProgress'
import { useScreenTopPad } from '@/lib/hooks/useScreenTopPad'

/**
 * Dev-only NEW step — "What's held you back?" multi-select. Builds commitment/consistency bias before
 * the plan (onboardingresearch.md lines 17, 36) and lets us frame the plan against their blockers. Inert.
 */
const OBSTACLES = [
    { id: 'consistency', icon: CalendarX, label: 'Staying consistent' },
    { id: 'plateau', icon: TrendingDown, label: 'Hitting a plateau' },
    { id: 'diet', icon: Utensils, label: 'Tracking what I eat' },
    { id: 'plan', icon: Salad, label: 'Not knowing what to do' },
]

export default function Obstacles() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.workout
    const router = useRouter()
    const topPad = useScreenTopPad()
    const [selected, setSelected] = useState<string[]>([])

    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '1F', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StepProgress current={1} total={12} accent={accent} />

                <Text style={styles.titleText}>What's held you back before?</Text>
                <Text style={styles.subtitleText}>Pick anything that fits — we'll tailor your plan to get past it. Select all that apply.</Text>

                <View style={styles.optionsContainer}>
                    {OBSTACLES.map((o, i) => {
                        const Icon = o.icon
                        const active = selected.includes(o.id)
                        return (
                            <Animated.View key={o.id} entering={FadeInDown.delay(i * 50).duration(280)}>
                                <PressableScale style={[styles.optionButton, active && { borderColor: accent, backgroundColor: accent + '12' }]} onPress={() => toggle(o.id)}>
                                    <Icon size={22} color={active ? accent : colors.textMuted} strokeWidth={2.2} />
                                    <Text style={[styles.optionLabel, active && { color: colors.text }]}>{o.label}</Text>
                                    <View style={[styles.checkBox, active && { backgroundColor: accent, borderColor: accent }]}>{active && <Check size={14} color="#fff" strokeWidth={3} />}</View>
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
                    <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
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
        optionButton: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 18, borderWidth: 2, borderColor: colors.border },
        optionLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted, letterSpacing: -0.3 },
        checkBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12, paddingTop: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.5 },
    })
}
