import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Target } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import StepProgress from '../_shared/StepProgress'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/** Dev-only Refined Goal screen — restyled per RESTYLE_PLAN (theme tokens, dark + light). Inert. */
const UNIT_SYSTEM: 'imperial' | 'metric' = 'metric'

export default function GoalRefined() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.nutrition
    const router = useRouter()
    const topPad = useScreenTopPad()
    const [goal, setGoal] = useState<'lose' | 'gain' | 'maintain' | null>('maintain')
    const [targetWeight, setTargetWeight] = useState('')

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.outerContainer}>
                <LinearGradient colors={[accent + '14', 'transparent']} style={styles.topGradient} pointerEvents="none" />
                <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <StepProgress current={6} total={12} accent={accent} />

                    <View style={[styles.iconCircle, { borderColor: accent }]}>
                        <Target size={86} color={accent} strokeWidth={2} />
                    </View>

                    <Text style={styles.titleText}>What's Your {'\n'}Body Weight Goal?</Text>
                    <Text style={styles.subtitleText}>We use your body weight goal to adjust your nutrition goals.</Text>

                    <View style={styles.goalContainer}>
                        {(['lose', 'maintain', 'gain'] as const).map((g, i) => (
                            <Animated.View key={g} entering={FadeInDown.delay(i * 50).duration(280)} style={{ flex: 1 }}>
                                <PressableScale style={[styles.goalButton, goal === g && { borderColor: accent }]} onPress={() => setGoal(g)}>
                                    <Text style={[styles.goalText, goal === g && { color: colors.text }]}>{g[0].toUpperCase() + g.slice(1)}</Text>
                                </PressableScale>
                            </Animated.View>
                        ))}
                    </View>

                    {goal && goal !== 'maintain' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Target Weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} placeholder={UNIT_SYSTEM === 'imperial' ? '150' : '68'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} />
                                <Text style={styles.unitText}>{UNIT_SYSTEM === 'imperial' ? 'lbs' : 'kg'}</Text>
                            </View>
                        </View>
                    )}

                    {goal === 'maintain' && (
                        <View style={styles.maintainMessageContainer}>
                            <Text style={styles.maintainMessageText}>Maintaining body weight, so no target weight needed.</Text>
                        </View>
                    )}
                </ScrollView>
                <View style={styles.navFooter}>
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
            </View>
        </TouchableWithoutFeedback>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        outerContainer: { flex: 1, backgroundColor: colors.background },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: 25, alignItems: 'center', paddingBottom: 24 },
        stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 28 },
        stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ringTrack },
        navFooter: { paddingHorizontal: 25, paddingBottom: 50 },
        iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 12 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.text, letterSpacing: -0.5, marginBottom: 4, textAlign: 'center' },
        subtitleText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', letterSpacing: 0.2, marginBottom: 24, paddingHorizontal: 8, lineHeight: 22 },
        goalContainer: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 24 },
        goalButton: { flex: 1, height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border },
        goalText: { fontFamily: fonts.medium, fontSize: 16, color: colors.textMuted, letterSpacing: -0.5 },
        inputGroup: { width: '100%', marginBottom: 24 },
        inputLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSecondary, marginBottom: 8, paddingLeft: 4, letterSpacing: -0.5 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60, marginBottom: 8 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unitText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
        maintainMessageContainer: { width: '100%', paddingVertical: 20, paddingHorizontal: 20, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, marginBottom: 24, backgroundColor: colors.surface, borderColor: colors.hairline },
        maintainMessageText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', letterSpacing: 0.2 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff', letterSpacing: -0.5 },
    })
}
