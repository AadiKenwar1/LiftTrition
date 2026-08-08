import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ArrowRight, ShieldCheck } from 'lucide-react-native'
import { useMemo } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useOnboardingFlow } from '../_shared/flowContext'
import PressableScale from '../_shared/PressableScale'
import { PHASES, useGoalDraft } from '../_shared/useGoalDraft'
import V3Option from '../_shared/V3Option'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V5c goal screen — the conservative no-scroll attempt: the three full option cards stay exactly as
 * production draws them, sublabels and all, and the height comes out of the weight block alone. Current and
 * goal share one row, and the Imperial/Metric toggle collapses from a full-width pair of buttons into two
 * small pills on the section header. That is the smallest possible change to the shipped screen.
 *
 * It is also the least likely to actually fit: keeping three ~76pt cards spends most of the budget before the
 * inputs start, so this fits a modern handset but probably still scrolls on the smallest ones. Preview it
 * against V5a to judge whether the readable sublabels are worth that. Inert.
 */
export default function GoalV5c() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const d = useGoalDraft(flow)

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <V4Screen step={3} totalSteps={8} eyebrow="Step 4 of 8" title="What's your goal?" subtitle="This sets your daily calories. You can switch anytime." accent={colors.text} nextDisabled={!d.filled} onBeforeNext={d.commit} onBack={() => router.back()} onNext={() => {}}>
                    <View style={{ gap: 10 }}>
                        {PHASES.map((p, i) => (
                            <V3Option key={p.id} index={i} label={p.label} sublabel={p.sub} accent={colors.nutrition} selected={d.phase === p.id} onPress={() => d.choosePhase(p.id)} />
                        ))}
                    </View>

                    {d.phase != null && (
                        <Animated.View entering={FadeInDown.duration(280)}>
                            <View style={styles.sectionRow}>
                                <Text style={styles.sectionLabel}>Weight</Text>
                                <View style={styles.unitPills}>
                                    {(['imperial', 'metric'] as const).map((u) => (
                                        <PressableScale key={u} style={[styles.pill, d.unitSystem === u && { backgroundColor: colors.surfaceInset }]} onPress={() => d.toggleUnit(u)}>
                                            <Text style={[styles.pillText, d.unitSystem === u && { color: colors.text }]}>{u === 'imperial' ? 'lbs' : 'kg'}</Text>
                                        </PressableScale>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.pairRow}>
                                <View style={styles.field}>
                                    <Text style={styles.fieldCap}>Current</Text>
                                    <View style={styles.inputWrap}>
                                        <TextInput style={styles.input} placeholder={d.unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={d.weight} onChangeText={d.setWeight} />
                                        <Text style={styles.unit}>{d.unit}</Text>
                                    </View>
                                </View>

                                {d.needsTarget && (
                                    <>
                                        <ArrowRight size={18} color={colors.chevron} strokeWidth={2.4} style={styles.arrow} />
                                        <View style={styles.field}>
                                            <Text style={styles.fieldCap}>Goal</Text>
                                            <View style={styles.inputWrap}>
                                                <TextInput style={styles.input} placeholder={d.phase === 'cut' ? (d.unitSystem === 'imperial' ? '150' : '68') : d.unitSystem === 'imperial' ? '176' : '80'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={d.target} onChangeText={d.setTarget} />
                                                <Text style={styles.unit}>{d.unit}</Text>
                                            </View>
                                        </View>
                                    </>
                                )}
                            </View>

                            <View style={styles.trustRow}>
                                <ShieldCheck size={14} color={colors.textMuted} strokeWidth={2.2} />
                                <Text style={styles.trustText}>Your data is never sold or shared</Text>
                            </View>
                        </Animated.View>
                    )}
                </V4Screen>
            </View>
        </TouchableWithoutFeedback>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
        sectionLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
        unitPills: { flexDirection: 'row', gap: 4, backgroundColor: colors.surface, borderRadius: radius.chip, padding: 3 },
        pill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.chip },
        pillText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, letterSpacing: -0.2 },
        pairRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
        field: { flex: 1, gap: 6 },
        fieldCap: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },
        inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 14, height: 58 },
        input: { flex: 1, fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: -0.5 },
        unit: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, marginLeft: 6 },
        arrow: { marginBottom: 20 },
        trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
        trustText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },
    })
}
