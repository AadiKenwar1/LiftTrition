import CalorieFeedback from '@/components/devTest/paceWizard/CalorieFeedback'
import { basisWeightKg, devCalorieTarget, devFloorCalories, devMaxPace, devSplitMacros, DEV_PACE_CEILING } from '@/components/devTest/paceWizard/devMacroMath'
import StepProgress from '@/components/NeutralComponents/StepProgress'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { kgToLbs, lbsToKg } from '@/lib/utils/unitConversions'
import { useScreenBottomPad } from '@/lib/hooks/useScreenBottomPad'
import Slider from '@react-native-community/slider'
import { router, useLocalSearchParams } from 'expo-router'
import { Rabbit, ShieldCheck, Turtle } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

/**
 * Dev duplicate of app/settingsScreens/adjustNutrition/adjustNutrition2.tsx — see the step-1 copy's docblock
 * for the why and the sync rule. Deltas beyond the route target: the pace prototypes — a Cut slider capped
 * at devMaxPace (no position whose plan can't pay for protein, fat and 50 g of carbs exists), the initial
 * thumb clamped into that range, the live kcal readout and warnings under the slider fed by devCalorieTarget
 * and devSplitMacros, and a note naming the rule so a Cut user is told why the track ends where it does
 * instead of inferring it. The cap differs per body on purpose — it is the nutrition floor speaking, not a
 * shared constant — and both directions of the track stop at DEV_PACE_CEILING.
 *
 * Pace is DISPLAYED in the user's unit system but STORED in lb/week — macroCalculation.tsx assumes lbs
 * ((goalPace * 3500) / 7), so metric values are converted with kgToLbs before leaving this screen.
 */
// max is DEV_PACE_CEILING in each unit system (kg side floored to its own 0.1 step, 2 lb → 0.9 kg).
const RANGES = {
    metric: { min: 0.1, max: 0.9, def: 0.5, unit: 'kg' },
    imperial: { min: 0.1, max: DEV_PACE_CEILING, def: 1, unit: 'lbs' },
} as const

const paceLabel = (v: number, max: number) => {
    const f = v / max
    return f < 0.33 ? 'Slow' : f < 0.66 ? 'Moderate' : f < 0.9 ? 'Fast' : 'Very fast'
}

export default function AdjustNutrition2Screen() {
    const { settings } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const bottomPad = useScreenBottomPad(6)
    const params = useLocalSearchParams<{ height: string; weight: string; unitSystem: string; goal: string; targetWeight: string }>()

    const metric = params.unitSystem === 'metric'
    const r = metric ? RANGES.metric : RANGES.imperial

    // Pre-commit state: params carry the not-yet-saved height/weight/goal, settings supply the body
    // facts the wizard never edits (gender, birthDate, activity) — the adjustNutrition3 merge pattern.
    const merged = useMemo(
        () => ({
            ...settings,
            height: Number(params.height),
            bodyWeight: Number(params.weight),
            unitSystem: params.unitSystem as 'imperial' | 'metric',
            goalType: params.goal as 'lose' | 'gain' | 'maintain',
            goalWeight: Number(params.targetWeight),
        }),
        [params, settings]
    )

    // Honest ceiling for a Cut: slider positions whose plan couldn't pay for protein and fat — negative
    // carbs — simply don't exist. devMaxPace works in lb/week; the kg slider converts the result and
    // floors it to its own 0.1 step. Bulk keeps the fixed range — a surplus has no floor to collide with.
    const capLb = devMaxPace(merged)
    const max = merged.goalType === 'lose' ? (metric ? Math.max(r.min, Math.floor(lbsToKg(capLb) * 10) / 10) : capLb) : r.max

    const [goalPace, setGoalPace] = useState<number>(() => {
        const displayPace = metric ? lbsToKg(settings.goalPace) : settings.goalPace
        // A stored pace above the cap shows AT the cap without writing settings; nonsense falls back
        // to the default, itself clamped for bodies whose cap sits under it.
        if (displayPace > max) return max
        if (displayPace >= r.min) return displayPace
        return Math.min(r.def, max)
    })

    // Live target for the current thumb — the same function the plan step quotes, so the readout and
    // the committed number can never disagree. The split rides along so the carb warning under the
    // slider reads the same grams the plan step will show.
    const { maintenance, target } = devCalorieTarget({ ...merged, goalPace: metric ? kgToLbs(goalPace) : goalPace }, !metric)
    const basisKg = basisWeightKg(merged, !metric)
    const { carbGrams } = devSplitMacros(merged.goalType, target, basisKg)

    // Says out loud why a Cut's track ends where it does. It names the rule, not the number the rule
    // produced: where the slider stops depends on the body in front of it, so quoting this user's cap
    // as if it were everyone's would be wrong. Only a Cut has a floor to run into.
    const floorNote = merged.goalType === 'lose' ? `The slider ends where your daily protein and fat alone would fill the day — a faster pace isn't stricter, it's impossible.` : null

    const handleNext = () => {
        router.push({
            pathname: '/devTest/paceWizard/adjustNutrition3',
            params: {
                height: params.height,
                weight: params.weight,
                unitSystem: params.unitSystem,
                goal: params.goal,
                targetWeight: params.targetWeight,
                goalPace: (metric ? kgToLbs(goalPace) : goalPace).toString(),
            },
        } as never)
    }

    return (
        <View style={[styles.container, { paddingBottom: bottomPad }]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StepProgress current={1} total={4} accent={colors.text} />
                <Text style={styles.titleText}>How fast do you want to get there?</Text>
                <Text style={styles.subtitleText}>A faster pace means a bigger daily calorie change. You can adjust this later.</Text>

                <Animated.View entering={FadeInDown.duration(320)} style={styles.valueBlock}>
                    <Text style={styles.value}>{goalPace.toFixed(1)}</Text>
                    <Text style={styles.valueLabel}>{r.unit} / week · {paceLabel(goalPace, max)}</Text>
                </Animated.View>

                <View style={styles.sliderRow}>
                    <Turtle size={24} color={colors.textMuted} strokeWidth={2} />
                    <Slider style={styles.slider} minimumValue={r.min} maximumValue={max} step={0.1} value={goalPace} onValueChange={setGoalPace} minimumTrackTintColor={colors.nutrition} maximumTrackTintColor={colors.ringTrack} thumbTintColor={colors.nutrition} />
                    <Rabbit size={24} color={colors.textMuted} strokeWidth={2} />
                </View>
                <View style={styles.range}>
                    <Text style={styles.rangeText}>{r.min} {r.unit}</Text>
                    <Text style={styles.rangeText}>{max} {r.unit}</Text>
                </View>

                <Text style={styles.kcalReadout}>≈ {target.toLocaleString()} kcal a day</Text>
                <CalorieFeedback calories={target} maintenance={maintenance} goalType={merged.goalType} floorCalories={devFloorCalories(merged.goalType, basisKg)} carbGrams={carbGrams} align="center" style={styles.feedback} />

                {floorNote != null && (
                    <View style={styles.floorNote}>
                        <ShieldCheck size={15} color={colors.textMuted} strokeWidth={2.2} style={styles.floorIcon} />
                        <Text style={styles.floorNoteText}>{floorNote}</Text>
                    </View>
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
        valueBlock: { alignItems: 'center', marginTop: 8, marginBottom: 28 },
        value: { fontFamily: fonts.extrabold, fontSize: 64, color: colors.text, letterSpacing: -2 },
        valueLabel: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3, marginTop: 2 },
        sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        slider: { flex: 1, height: 40 },
        range: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
        rangeText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, letterSpacing: 0.2 },
        kcalReadout: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textSecondary, letterSpacing: -0.2, textAlign: 'center', marginTop: 22 },
        feedback: { marginTop: 10 },
        floorNote: { flexDirection: 'row', gap: 9, backgroundColor: colors.surfaceInset, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingVertical: 11, paddingHorizontal: 13, marginTop: 12 },
        floorIcon: { marginTop: 1 },
        floorNoteText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted, lineHeight: 18, letterSpacing: 0.1 },
        footer: { paddingTop: 12 },
        nextButton: { width: '100%', height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        nextText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
