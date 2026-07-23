import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Activity } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import StepProgress from '../_shared/StepProgress'
import { useScreenTopPad } from '@/lib/hooks/useScreenTopPad'

/** Dev-only Refined Activity screen — restyled per RESTYLE_PLAN (theme tokens, dark + light). Inert. */
const FREQUENCIES = [
    { id: 'sedentary', label: 'Sedentary', subtitle: 'Little to no exercise' },
    { id: 'light', label: 'Light', subtitle: 'Light exercise 1-3 days a week' },
    { id: 'moderate', label: 'Moderate', subtitle: 'Moderate exercise 4-5 days a week' },
    { id: 'active', label: 'Active', subtitle: 'Intensive exercise 3-4 days a week or Moderate exercise 6-7 days a week' },
    { id: 'gymrat', label: 'Gym Rat', subtitle: 'Intensive exercise 6-7 days a week' },
]

export default function ActivityRefined() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.workout
    const router = useRouter()
    const topPad = useScreenTopPad()
    const [selected, setSelected] = useState<string | null>(null)

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '24', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StepProgress current={5} total={12} accent={accent} />

                <View style={[styles.iconCircle, { borderColor: accent }]}>
                    <Activity size={72} color={accent} strokeWidth={2} />
                </View>

                <Text style={styles.titleText}>What's your Activity Level?</Text>
                <Text style={styles.subtitleText}>We use your activity level for BMR, nutrition, and fatigue calculations.</Text>

                <View style={styles.optionsContainer}>
                    {FREQUENCIES.map((freq, i) => (
                        <Animated.View key={freq.id} entering={FadeInDown.delay(i * 50).duration(280)}>
                            <PressableScale style={[styles.optionButton, selected === freq.id && { borderColor: accent }]} onPress={() => setSelected(freq.id)}>
                                <Text style={[styles.optionLabel, selected === freq.id && { color: colors.text }]}>{freq.label}</Text>
                                <Text style={styles.optionSubtitle}>{freq.subtitle}</Text>
                            </PressableScale>
                        </Animated.View>
                    ))}
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
        container: { flex: 1, backgroundColor: colors.background, paddingBottom: 50, paddingHorizontal: 25 },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
        scroll: { flex: 1 },
        scrollContent: { alignItems: 'center', width: '100%', paddingBottom: 16 },
        stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 28 },
        stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ringTrack },
        iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, marginBottom: 12 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.text, letterSpacing: -0.5, marginBottom: 4, textAlign: 'center' },
        subtitleText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', letterSpacing: 0.2, lineHeight: 22, marginBottom: 12, paddingHorizontal: 8 },
        optionsContainer: { width: '100%', gap: 8, justifyContent: 'center', marginBottom: 16 },
        optionButton: { width: '100%', minHeight: 65, paddingVertical: 12, backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 2, borderColor: colors.border, gap: 6 },
        optionLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, letterSpacing: -0.5, textAlign: 'left' },
        optionSubtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, letterSpacing: 0.1, lineHeight: 20 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff', letterSpacing: -0.5 },
    })
}
