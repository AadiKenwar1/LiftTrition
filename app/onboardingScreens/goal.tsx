import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import PressableScale from '@/components/NeutralComponents/PressableScale'
import { useSettings } from '@/context/SettingsContext'
import { validateTargetWeight, validateWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { GOAL_SUGGESTION_OFFSET } from '@/lib/utils/goalMath'
import { onboardingStep } from '@/lib/utils/onboardingSteps'
import { kgToLbs, lbsToKg, weightUnitLabel } from '@/lib/utils/unitConversions'
import { router } from 'expo-router'
import { ArrowRight, Minus, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

/**
 * Onboarding — eating phase + the weight numbers. Current and goal weight sit in one frame, so the delta the
 * user is committing to is visible at the moment they commit, and validateTargetWeight checks direction
 * against a weight just typed rather than one captured on an earlier screen. Persists goalType (cut→lose,
 * maintain→maintain, bulk→gain), goalWeight (target, or the current weight on maintain), bodyWeight and
 * unitSystem, then logs the day-1 weigh-in. About You inherits the unit choice for its height field.
 *
 * Laid out to fit one view without scrolling: the phases are a row of tiles rather than three full-width
 * cards, and the two weights share a row. That matters more than it looks — stacked, the inputs sat low
 * enough that focusing one put the keyboard over the rest of the screen. The sublabel that each card used to
 * carry is a single line under the row that swaps to the selected phase, so the explanation survives.
 *
 * The phase tiles are the only thing on screen until one is picked, so the flow's first keyboard appears only
 * after a commitment. Nothing is preselected, recommended or badged — the app never puts a calorie direction
 * in the user's mouth. The privacy line lives here because this is the flow's first sensitive question.
 */
const PHASES = [
    { id: 'cut', label: 'Cut', sub: 'Eat in a deficit to lose fat', Icon: TrendingDown },
    { id: 'maintain', label: 'Maintain', sub: 'Eat at maintenance to recomp', Icon: Minus },
    { id: 'bulk', label: 'Bulk', sub: 'Eat in a surplus to gain', Icon: TrendingUp },
] as const
type Phase = (typeof PHASES)[number]['id']
const GOAL_TYPE: Record<Phase, 'lose' | 'gain' | 'maintain'> = { cut: 'lose', maintain: 'maintain', bulk: 'gain' }

export default function OnboardingGoal() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { settings, setSettings, handleUpdateBw } = useSettings()
    const accent = colors.nutrition
    const [phase, setPhase] = useState<Phase | null>(null)
    const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>(settings.unitSystem)
    const [weight, setWeight] = useState('')
    const [target, setTarget] = useState('')
    const { current, total } = onboardingStep('goal', settings.goalType)

    const unit = weightUnitLabel(unitSystem)
    const needsTarget = phase != null && phase !== 'maintain'
    const filled = phase != null && weight.trim() !== '' && (!needsTarget || target.trim() !== '')
    const description = PHASES.find((p) => p.id === phase)?.sub ?? ''

    // Signed gap, shown live once both entries are numbers — the delta is the motivating part of this screen.
    // Rounded to 1dp because lbsToKg/kgToLbs round there too, so subtracting two converted values would
    // otherwise render as 9.100000000000001.
    const currentWeight = Number(weight) || 0
    const goalWeight = Number(target) || 0
    const delta = needsTarget && currentWeight > 0 && goalWeight > 0 ? Math.round((goalWeight - currentWeight) * 10) / 10 : null

    // Suggested target, shown as the goal field's placeholder so it tracks the weight actually on screen
    // rather than standing still at a hardcoded number. Withheld until the current weight clears the offset,
    // which keeps a cut suggestion from landing at or below zero on a half-typed weight.
    const offset = GOAL_SUGGESTION_OFFSET[unitSystem]
    const suggested = needsTarget && currentWeight > offset ? Math.round((currentWeight + (phase === 'cut' ? -offset : offset)) * 10) / 10 : null

    // Clearing the target on maintain stops a backed-out cut/bulk from persisting a goal weight the user
    // is no longer chasing.
    function choosePhase(p: Phase) {
        setPhase(p)
        if (p === 'maintain') setTarget('')
    }

    function handleUnitToggle(next: 'imperial' | 'metric') {
        if (next === unitSystem) return
        const convert = (v: string) => {
            const n = Number(v) || 0
            return n > 0 ? (next === 'metric' ? lbsToKg(n) : kgToLbs(n)).toString() : v
        }
        setWeight(convert(weight))
        setTarget(convert(target))
        setUnitSystem(next)
    }

    function handleNext() {
        if (phase == null) return
        const goalType = GOAL_TYPE[phase]
        if (!validateWeight(currentWeight, unitSystem)) return
        const nextGoalWeight = goalType === 'maintain' ? currentWeight : goalWeight
        if (!validateTargetWeight(nextGoalWeight, currentWeight, goalType, unitSystem)) return
        // Goal fields first so the weigh-in's functional updater builds on them; handleUpdateBw decides the
        // goal-reached prompt from the committed result, not from either call's closure.
        setSettings({ ...settings, goalType, goalWeight: nextGoalWeight, bodyWeight: currentWeight, unitSystem })
        handleUpdateBw(currentWeight)
        router.push('/onboardingScreens/aboutYou')
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <OnboardingScaffold step={current} total={total} title="What's your goal?" subtitle="This sets your daily calories. You can switch anytime." accent={colors.text} nextDisabled={!filled} onBack={() => router.back()} onNext={handleNext}>
                    <View style={styles.tileRow}>
                        {PHASES.map(({ id, label, Icon }) => {
                            const on = phase === id
                            return (
                                <PressableScale key={id} style={[styles.tile, on && { borderColor: accent, backgroundColor: accent + '12' }]} onPress={() => choosePhase(id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label}>
                                    <Icon size={22} color={on ? accent : colors.textMuted} strokeWidth={2.2} />
                                    <Text style={[styles.tileLabel, on && { color: colors.text }]}>{label}</Text>
                                </PressableScale>
                            )
                        })}
                    </View>

                    <Text style={styles.description}>{description || 'Pick a phase to continue'}</Text>

                    {phase != null && (
                        <Animated.View entering={FadeIn.duration(220)}>
                            <View style={styles.sectionRow}>
                                <Text style={styles.sectionLabel}>Weight</Text>
                                <View style={styles.unitPills}>
                                    {(['imperial', 'metric'] as const).map((u) => (
                                        <PressableScale key={u} style={[styles.pill, unitSystem === u && { backgroundColor: colors.surfaceInset }]} onPress={() => handleUnitToggle(u)} accessibilityRole="button" accessibilityState={{ selected: unitSystem === u }} accessibilityLabel={u === 'imperial' ? 'Imperial' : 'Metric'}>
                                            <Text style={[styles.pillText, unitSystem === u && { color: colors.text }]}>{u === 'imperial' ? 'lbs' : 'kg'}</Text>
                                        </PressableScale>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.pairRow}>
                                <View style={styles.field}>
                                    <Text style={styles.fieldCap}>Current</Text>
                                    <View style={styles.inputWrap}>
                                        <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} accessibilityLabel="Current weight" />
                                        <Text style={styles.unit}>{unit}</Text>
                                    </View>
                                </View>

                                {needsTarget && (
                                    <>
                                        <ArrowRight size={18} color={colors.chevron} strokeWidth={2.4} style={styles.arrow} />
                                        <View style={styles.field}>
                                            <Text style={styles.fieldCap}>Goal</Text>
                                            <View style={styles.inputWrap}>
                                                <TextInput style={styles.input} placeholder={suggested != null ? suggested.toString() : phase === 'cut' ? (unitSystem === 'imperial' ? '150' : '68') : unitSystem === 'imperial' ? '176' : '80'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={target} onChangeText={setTarget} accessibilityLabel="Goal weight" />
                                                <Text style={styles.unit}>{unit}</Text>
                                            </View>
                                        </View>
                                    </>
                                )}
                            </View>

                            {delta != null && (
                                <Text style={[styles.delta, { color: accent }]}>
                                    {delta < 0 ? '−' : '+'}{Math.abs(delta)} {unit} to go
                                </Text>
                            )}

                            <View style={styles.trustRow}>
                                <ShieldCheck size={14} color={colors.textMuted} strokeWidth={2.2} />
                                <Text style={styles.trustText}>Your data is never sold or shared</Text>
                            </View>
                        </Animated.View>
                    )}
                </OnboardingScaffold>
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
