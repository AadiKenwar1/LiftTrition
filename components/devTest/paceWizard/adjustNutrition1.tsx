import PressableScale from '@/components/NeutralComponents/PressableScale'
import StepProgress from '@/components/NeutralComponents/StepProgress'
import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight, validateTargetWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { GOAL_SUGGESTION_OFFSET } from '@/lib/utils/goalMath'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { useScreenBottomPad } from '@/lib/hooks/useScreenBottomPad'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

/**
 * Dev duplicate of app/settingsScreens/adjustNutrition/adjustNutrition1.tsx — PaceFlowLauncher walks this
 * copy so pace/projection display work can be prototyped on the wizard without touching the production
 * screens. Hand-synced: diff against the original to re-sync. Intended deltas only: the route targets
 * (this flow pushes /devTest/paceWizard/*), the devPrefillTarget seed for the target field — set by the
 * launcher and forwarded by the activity screen that now opens the flow —
 * the docblocks, and the pace prototypes on steps 2–4 — the capped slider with its kcal readout and
 * warnings, the 800-floor targets on step 3, and step 4's calorie-derived projection with its "—" guard.
 * This step itself carries no prototype: nothing on it reads the calorie math.
 *
 * Settings — eating phase + the weight numbers, laid out like the onboarding goal screen so the same decision
 * looks the same in both places: a row of phase tiles instead of three stacked cards, one description line
 * that swaps with the selection, and current/goal weight side by side with the delta beneath them.
 *
 * Current weight is editable here; it used to be read from settings and never shown. That is what gives the
 * maintain path anything to collect at all — maintain has no target field, so the screen previously asked for
 * nothing. It also means validateTargetWeight checks direction against a weight the user just typed rather
 * than one stored in an earlier session. The value travels the wizard as the `weight` param and
 * adjustNutrition4 logs it as a weigh-in on save when it differs from the stored one.
 *
 * No unit toggle, unlike onboarding: unitSystem also labels the stored height, and flipping it here would
 * make adjustNutrition4 commit inches as centimetres. Units change on the measurements screen.
 */
const PHASES = [
    { value: 'lose' as const, label: 'Cut', sub: 'Eat in a deficit to lose fat', Icon: TrendingDown },
    { value: 'maintain' as const, label: 'Maintain', sub: 'Eat at maintenance to recomp', Icon: Minus },
    { value: 'gain' as const, label: 'Bulk', sub: 'Eat in a surplus to gain', Icon: TrendingUp },
]

export default function AdjustNutrition1Screen() {
    const { settings } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const bottomPad = useScreenBottomPad(6)
    const accent = colors.nutrition
    const unitSystem = settings.unitSystem
    const unit = weightUnitLabel(unitSystem)

    // Launcher seed for the target field. Production starts it empty by design (the comment above the field
    // in the original); the harness wants every field pre-filled, and dev-only code needs no __DEV__ guard.
    const devParams = useLocalSearchParams<{ devPrefillTarget?: string }>()

    const [goal, setGoal] = useState<'lose' | 'gain' | 'maintain'>(settings.goalType)
    const [weight, setWeight] = useState(settings.bodyWeight.toString())
    const [targetWeight, setTargetWeight] = useState(devParams.devPrefillTarget ?? '')

    const needsTarget = goal !== 'maintain'
    const description = PHASES.find((p) => p.value === goal)?.sub ?? ''

    // Signed gap, shown live once both entries are numbers. Rounded to 1dp because a stored metric weight
    // carries conversion noise, so subtracting two of them would otherwise render as 9.100000000000001.
    const currentWeight = Number(weight) || 0
    const goalWeight = Number(targetWeight) || 0
    const delta = needsTarget && currentWeight > 0 && goalWeight > 0 ? Math.round((goalWeight - currentWeight) * 10) / 10 : null

    // Suggested target, shown as the Goal field's placeholder so it tracks the weight actually on screen
    // rather than standing still at a hardcoded number. Withheld until the current weight clears the offset,
    // which keeps a Cut suggestion from landing at or below zero on a half-typed weight.
    const offset = GOAL_SUGGESTION_OFFSET[unitSystem]
    const suggested = needsTarget && currentWeight > offset ? Math.round((currentWeight + (goal === 'lose' ? -offset : offset)) * 10) / 10 : null

    // Switching phase reverses which side of the current weight the target belongs on, so a figure typed for
    // Cut is wrong for Bulk. Clear it there and let the placeholder suggest the new direction; one already
    // pointing the right way survives the switch.
    function choosePhase(next: 'lose' | 'gain' | 'maintain') {
        setGoal(next)
        if (currentWeight <= 0 || goalWeight <= 0) return
        if ((next === 'lose' && goalWeight >= currentWeight) || (next === 'gain' && goalWeight <= currentWeight)) setTargetWeight('')
    }

    function handleNext() {
        // Height isn't editable here but still feeds calculateMacros downstream, so it keeps its floor check.
        if (!validateHeightWeight(settings.height, currentWeight, unitSystem)) return
        // Maintain has no target field; its goal weight IS the weight just typed. The target state is left
        // untouched when switching to maintain, so toggling back to Cut or Bulk returns what was typed.
        const nextGoalWeight = needsTarget ? goalWeight : currentWeight
        if (!validateTargetWeight(nextGoalWeight, currentWeight, goal, unitSystem)) return
        const commonParams = {
            height: settings.height.toString(),
            weight: currentWeight.toString(),
            unitSystem,
            goal,
            targetWeight: nextGoalWeight.toString(),
        }
        if (goal === 'maintain') {
            router.push({
                pathname: '/devTest/paceWizard/adjustNutrition3',
                params: { ...commonParams, goalPace: '0' },
            } as never)
        } else {
            router.push({ pathname: '/devTest/paceWizard/adjustNutrition2', params: commonParams } as never)
        }
    }

    return (
        <View style={[styles.container, { paddingBottom: bottomPad }]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScrollBeginDrag={Keyboard.dismiss}>
                <StepProgress current={0} total={goal === 'maintain' ? 3 : 4} accent={colors.text} />
                <Text style={styles.titleText}>What's your goal?</Text>
                <Text style={styles.subtitleText}>This sets your daily calories. You can switch anytime.</Text>

                <View style={styles.tileRow}>
                    {PHASES.map(({ value, label, Icon }) => {
                        const on = goal === value
                        return (
                            <PressableScale key={value} style={[styles.tile, on && { borderColor: accent, backgroundColor: accent + '12' }]} onPress={() => choosePhase(value)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label}>
                                <Icon size={22} color={on ? accent : colors.textMuted} strokeWidth={2.2} />
                                <Text style={[styles.tileLabel, on && { color: colors.text }]}>{label}</Text>
                            </PressableScale>
                        )
                    })}
                </View>

                <Text style={styles.description}>{description}</Text>

                <Text style={styles.sectionLabel}>Weight</Text>

                <View style={styles.pairRow}>
                    <View style={styles.field}>
                        <Text style={styles.fieldCap}>Current</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} accessibilityLabel="Current weight" />
                            <Text style={styles.unitText}>{unit}</Text>
                        </View>
                    </View>

                    {needsTarget && (
                        <>
                            <ArrowRight size={18} color={colors.chevron} strokeWidth={2.4} style={styles.arrow} />
                            <View style={styles.field}>
                                <Text style={styles.fieldCap}>Goal</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput style={styles.input} placeholder={suggested != null ? suggested.toString() : goal === 'lose' ? (unitSystem === 'imperial' ? '150' : '68') : unitSystem === 'imperial' ? '176' : '80'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} accessibilityLabel="Goal weight" />
                                    <Text style={styles.unitText}>{unit}</Text>
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
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
        scroll: { flex: 1 },
        scrollContent: { paddingTop: 16, paddingBottom: 16 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 22, letterSpacing: 0.1, marginBottom: 26 },
        tileRow: { flexDirection: 'row', gap: 10 },
        tile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border },
        tileLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted, letterSpacing: -0.3 },
        description: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.1, textAlign: 'center', marginTop: 12, minHeight: 18 },
        sectionLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
        pairRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
        field: { flex: 1, gap: 6 },
        fieldCap: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 14, height: 58 },
        input: { flex: 1, fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: -0.5 },
        unitText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, marginLeft: 6 },
        arrow: { marginBottom: 20 },
        delta: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: -0.2, textAlign: 'center', marginTop: 14 },
        footer: { paddingTop: 12 },
        nextButton: { width: '100%', height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        nextText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
