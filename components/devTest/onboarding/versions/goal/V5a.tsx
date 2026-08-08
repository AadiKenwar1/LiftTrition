import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ArrowRight, Minus, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react-native'
import { useMemo } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useOnboardingFlow } from '../_shared/flowContext'
import PressableScale from '../_shared/PressableScale'
import { useGoalDraft, type Phase } from '../_shared/useGoalDraft'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V5a goal screen — the no-scroll layout that takes both compressions at once: the three phases
 * become a row of tiles instead of a stack of full-width cards, and current/goal weight share one row with an
 * arrow between them. The phase sublabels move to a single line under the row that swaps to whichever phase is
 * selected, so the explanation survives losing the cards. Roughly half V5's height, which also means the two
 * inputs sit high enough that the keyboard doesn't cover them.
 *
 * The cost: the three sublabels are no longer readable side by side, so the user compares tiles by name and
 * only learns what a phase means after tapping it. Inert.
 */
const ICONS: Record<Phase, typeof TrendingDown> = { cut: TrendingDown, maintain: Minus, bulk: TrendingUp }
const PHASE_IDS: Phase[] = ['cut', 'maintain', 'bulk']

export default function GoalV5a() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const d = useGoalDraft(flow)

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <V4Screen step={3} totalSteps={8} eyebrow="Step 4 of 8" title="What's your goal?" subtitle="This sets your daily calories. You can switch anytime." accent={colors.text} nextDisabled={!d.filled} onBeforeNext={d.commit} onBack={() => router.back()} onNext={() => {}}>
                    <View style={styles.tileRow}>
                        {PHASE_IDS.map((id) => {
                            const Icon = ICONS[id]
                            const on = d.phase === id
                            return (
                                <PressableScale key={id} style={[styles.tile, on && { borderColor: colors.nutrition, backgroundColor: colors.nutrition + '12' }]} onPress={() => d.choosePhase(id)}>
                                    <Icon size={22} color={on ? colors.nutrition : colors.textMuted} strokeWidth={2.2} />
                                    <Text style={[styles.tileLabel, on && { color: colors.text }]}>{id === 'cut' ? 'Cut' : id === 'maintain' ? 'Maintain' : 'Bulk'}</Text>
                                </PressableScale>
                            )
                        })}
                    </View>

                    <Text style={styles.description}>{d.description || 'Pick a phase to continue'}</Text>

                    {d.phase != null && (
                        <Animated.View entering={FadeIn.duration(220)}>
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

                            {d.delta != null && (
                                <Text style={[styles.delta, { color: colors.nutrition }]}>
                                    {d.delta < 0 ? '−' : '+'}{Math.abs(d.delta)} {d.unit} to go
                                </Text>
                            )}

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
        tileRow: { flexDirection: 'row', gap: 10 },
        tile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border },
        tileLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted, letterSpacing: -0.3 },
        description: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.1, textAlign: 'center', marginTop: 12, minHeight: 18 },
        sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
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
        delta: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: -0.2, textAlign: 'center', marginTop: 14 },
        trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
        trustText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },
    })
}
