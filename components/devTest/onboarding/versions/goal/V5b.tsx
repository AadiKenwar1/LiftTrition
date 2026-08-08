import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ShieldCheck } from 'lucide-react-native'
import { useMemo } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useOnboardingFlow } from '../_shared/flowContext'
import PressableScale from '../_shared/PressableScale'
import { PHASES, useGoalDraft } from '../_shared/useGoalDraft'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V5b goal screen — the most compressed of the no-scroll layouts. The phase choice becomes a single
 * segmented bar (one control instead of three cards), and the weights become rows in one form card: label
 * left, a large right-aligned number, hairlines between. The unit is the tappable suffix on each row rather
 * than its own toggle, and the live gap is a third read-only row, so the delta reads as an outcome of the two
 * entries instead of a separate annotation.
 *
 * The cost: a segmented bar carries no sublabels at all (the description line under it does that work for one
 * phase at a time), and a tappable unit suffix is far less discoverable than a labelled Imperial/Metric
 * toggle — a user who wants kg may never find it. That tradeoff is the point of previewing it. Inert.
 */
export default function GoalV5b() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const d = useGoalDraft(flow)

    // The suffix is the only unit affordance here, so tapping either row's unit flips both.
    const flipUnit = () => d.toggleUnit(d.unitSystem === 'imperial' ? 'metric' : 'imperial')

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <V4Screen step={3} totalSteps={8} eyebrow="Step 4 of 8" title="What's your goal?" subtitle="This sets your daily calories. You can switch anytime." accent={colors.text} nextDisabled={!d.filled} onBeforeNext={d.commit} onBack={() => router.back()} onNext={() => {}}>
                    <View style={styles.segment}>
                        {PHASES.map((p) => (
                            <PressableScale key={p.id} style={[styles.segmentItem, d.phase === p.id && { backgroundColor: colors.background }]} onPress={() => d.choosePhase(p.id)}>
                                <Text style={[styles.segmentText, d.phase === p.id && { color: colors.nutrition }]}>{p.label}</Text>
                            </PressableScale>
                        ))}
                    </View>

                    <Text style={styles.description}>{d.description || 'Pick a phase to continue'}</Text>

                    {d.phase != null && (
                        <Animated.View entering={FadeIn.duration(220)} style={styles.card}>
                            <View style={styles.row}>
                                <Text style={styles.rowLabel}>Current weight</Text>
                                <TextInput style={styles.rowInput} placeholder={d.unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={d.weight} onChangeText={d.setWeight} />
                                <PressableScale style={styles.unitTap} onPress={flipUnit}>
                                    <Text style={styles.unitText}>{d.unit}</Text>
                                </PressableScale>
                            </View>

                            {d.needsTarget && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>Goal weight</Text>
                                        <TextInput style={styles.rowInput} placeholder={d.phase === 'cut' ? (d.unitSystem === 'imperial' ? '150' : '68') : d.unitSystem === 'imperial' ? '176' : '80'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={d.target} onChangeText={d.setTarget} />
                                        <PressableScale style={styles.unitTap} onPress={flipUnit}>
                                            <Text style={styles.unitText}>{d.unit}</Text>
                                        </PressableScale>
                                    </View>
                                </>
                            )}

                            {d.delta != null && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>To go</Text>
                                        <Text style={[styles.rowResult, { color: colors.nutrition }]}>
                                            {d.delta < 0 ? '−' : '+'}{Math.abs(d.delta)}
                                        </Text>
                                        <Text style={[styles.unitText, styles.unitStatic]}>{d.unit}</Text>
                                    </View>
                                </>
                            )}
                        </Animated.View>
                    )}

                    {d.phase != null && (
                        <View style={styles.trustRow}>
                            <ShieldCheck size={14} color={colors.textMuted} strokeWidth={2.2} />
                            <Text style={styles.trustText}>Your data is never sold or shared</Text>
                        </View>
                    )}
                </V4Screen>
            </View>
        </TouchableWithoutFeedback>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        segment: { flexDirection: 'row', backgroundColor: colors.surfaceInset, borderRadius: radius.toggle, padding: 3, gap: 3 },
        segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.toggleInner },
        segmentText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, letterSpacing: -0.3 },
        description: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.1, textAlign: 'center', marginTop: 12, minHeight: 18 },
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, marginTop: 20 },
        row: { flexDirection: 'row', alignItems: 'center', height: 56 },
        rowLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.textSecondary, letterSpacing: -0.2 },
        rowInput: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: -0.5, textAlign: 'right', minWidth: 70 },
        rowResult: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.5, textAlign: 'right', minWidth: 70 },
        unitTap: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.chip, backgroundColor: colors.surfaceInset },
        unitText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
        unitStatic: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4 },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
        trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
        trustText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },
    })
}
