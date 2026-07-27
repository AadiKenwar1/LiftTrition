import { fonts, radius, useColors, useColorScheme, type Colors } from '@/context/ThemeContext'
import { useMemo } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'
import { displayGoal, isCalibration, weightValue, type ProgressIndicatorData, type ProgressState } from './ProgressIndicatorVariants'

/**
 * Round 3 — riffs on the centered layout (round-2 pick), with NO checkmark in any state.
 *
 * Voice: the app suggests, it never instructs. Nothing here is a plan the user has to follow, so
 * every label reads as an offer — "TODAY'S SUGGESTED SET" / "NEXT SUGGESTED SET", never a
 * prescription. The today/next pair also makes it unambiguous which session the numbers belong to.
 *
 * A hit shows TWO lines — "GOAL HIT", then what the numbers underneath actually are. Those are
 * separate jobs and cramming them into one string ("GOAL HIT · NEXT") made the numbers ambiguous:
 * a hit displays NEXT session's suggestion, not the set that was just beaten.
 *
 * Riff 4 is the dissenting position: drop the GOAL HIT line so a hit reads like any other
 * look-ahead. Everything else keeps it.
 */

// What the numbers below are. Never says why a hit fired — on a weight-jump session the lifter
// wasn't stronger than last time, so any "stronger than…" claim would be false some of the time.
function capsLabel(state: ProgressState): string {
    if (state === 'calibrationNew') return 'NEW EXERCISE'
    if (state === 'calibrationReturn') return 'BEEN A WHILE'
    if (state === 'hit' || state === 'preview') return 'NEXT SUGGESTED SET'
    return "TODAY'S SUGGESTED SET"
}

/**
 * The label block above the numbers. A hit gets an extra accent line so "you did it" and "here's
 * what these numbers are" never share one string. `mergeHit` suppresses that line — riff 4 only.
 */
function StateHeader({
    d,
    s,
    mergeHit = false,
    labelStyle,
}: {
    d: ProgressIndicatorData
    s: SharedStyles
    mergeHit?: boolean
    labelStyle?: StyleProp<TextStyle>
}) {
    const colors = useColors()
    const showHit = d.state === 'hit' && !mergeHit
    return (
        <>
            {showHit && <Text style={[s.caps, { color: colors.nutritionInk }]}>GOAL HIT</Text>}
            <Text style={labelStyle ?? s.caps}>{capsLabel(d.state)}</Text>
        </>
    )
}

/* ── 0 · Baseline (label block + numbers, nothing else) ───────────────────────── */

export function CenteredLabelColor(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} />
            <Numbers goal={displayGoal(d)} unit={d.weightUnit} s={s} />
        </View>
    )
}

/* ── 1 · Accent numerals (the numbers carry the state too) ────────────────────── */

export function CenteredAccentNumbers(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    const goal = displayGoal(d)
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} />
            <View style={s.numbersRow}>
                <Text style={[s.value, hit && { color: colors.nutritionInk }]}>{weightValue(goal.weight)}</Text>
                {goal.weight > 0 && <Text style={[s.unit, hit && { color: colors.nutritionInk, opacity: 0.75 }]}>{d.weightUnit}</Text>}
                <Text style={s.times}>×</Text>
                <Text style={[s.value, hit && { color: colors.nutritionInk }]}>{goal.reps}</Text>
            </View>
        </View>
    )
}

/* ── 2 · Underline rule (a short accent bar sits under the numbers) ───────────── */

export function CenteredUnderline(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} />
            <Numbers goal={displayGoal(d)} unit={d.weightUnit} s={s} />
            <View style={[s.rule, { backgroundColor: hit ? colors.nutrition : colors.workout }]} />
        </View>
    )
}

/* ── 3 · Leading dot (color moves off the type entirely) ──────────────────────── */

export function CenteredDot(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    return (
        <View style={s.wrap}>
            {hit && <Text style={[s.caps, { color: colors.nutritionInk }]}>GOAL HIT</Text>}
            <View style={s.labelRow}>
                <View style={[s.dot, { backgroundColor: hit ? colors.nutrition : colors.workout }]} />
                <Text style={s.caps}>{capsLabel(d.state)}</Text>
            </View>
            <Numbers goal={displayGoal(d)} unit={d.weightUnit} s={s} />
        </View>
    )
}

/* ── 4 · Merged (a hit reads exactly like any other look-ahead) ───────────────── */

export function CenteredMerged(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} mergeHit />
            <Numbers goal={displayGoal(d)} unit={d.weightUnit} s={s} />
        </View>
    )
}

/* ── 5 · Tinted plate (numbers sit on a soft accent wash) ─────────────────────── */

export function CenteredTintedPlate(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} />
            <View style={[s.plate, { backgroundColor: hit ? colors.nutritionInk + '1A' : colors.iconChipBg }]}>
                <Numbers goal={displayGoal(d)} unit={d.weightUnit} s={s} />
            </View>
        </View>
    )
}

/* ── 6 · Numbers first (labels demoted below the target) ──────────────────────── */

export function CenteredNumbersFirst(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    return (
        <View style={s.wrap}>
            <Numbers goal={displayGoal(d)} unit={d.weightUnit} s={s} />
            <StateHeader d={d} s={s} labelStyle={s.capsBelow} />
        </View>
    )
}

/* ── 7 · Weight-forward (weight dominates, reps ride alongside) ───────────────── */

export function CenteredWeightForward(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const goal = displayGoal(d)

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} />
            <View style={s.numbersRow}>
                <Text style={s.valueXl}>{weightValue(goal.weight)}</Text>
                {goal.weight > 0 && <Text style={s.unit}>{d.weightUnit}</Text>}
                <Text style={s.repsChip}>× {goal.reps}</Text>
            </View>
        </View>
    )
}

/* ── 8 · Plate, light alpha raised to match dark ──────────────────────────────── */

/**
 * Riff 5's wash is tuned for dark: a 10% overlay of a bright ink on near-black separates far
 * more than the same 10% of a deep ink on light slate. Same structure, alpha lifted to ~17% on
 * light only, and both states now use their ink so the two themes stay symmetrical.
 */
export function CenteredPlateBalancedAlpha(d: ProgressIndicatorData) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    const wash = (hit ? colors.nutritionInk : colors.workoutInk) + (isDark ? '1A' : '2B')
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} />
            <View style={[s.plate, { backgroundColor: wash }]}>
                <Numbers goal={displayGoal(d)} unit={d.weightUnit} s={s} />
            </View>
        </View>
    )
}

/* ── 9 · Plate, per-theme tuned fills ─────────────────────────────────────────── */

/**
 * Opaque fills picked independently per theme instead of one alpha doing double duty. Values are
 * inline candidates on purpose — if this riff wins they move into colors.ts as a token pair.
 */
const PLATE_FILLS = {
    light: { base: '#D0D9EE', hit: '#CFE4D8' },
    dark: { base: '#17243A', hit: '#122E1D' },
} as const

export function CenteredPlateTunedFills(d: ProgressIndicatorData) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    const fills = PLATE_FILLS[isDark ? 'dark' : 'light']
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} />
            <View style={[s.plate, { backgroundColor: hit ? fills.hit : fills.base }]}>
                <Numbers goal={displayGoal(d)} unit={d.weightUnit} s={s} />
            </View>
        </View>
    )
}

/* ── 10 · Plate, solid inset with the accent on the numbers ───────────────────── */

/**
 * Drops translucency entirely. The plate is the existing middle-tier surface in both themes and
 * never changes colour; the state is carried by the numerals, so nothing has to be re-tuned when
 * the palette moves.
 */
export function CenteredPlateInset(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    const goal = displayGoal(d)
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} />
            <View style={[s.plate, { backgroundColor: colors.surfaceInset }]}>
                <View style={s.numbersRow}>
                    <Text style={[s.value, hit && { color: colors.nutritionInk }]}>{weightValue(goal.weight)}</Text>
                    {goal.weight > 0 && <Text style={[s.unit, hit && { color: colors.nutritionInk, opacity: 0.75 }]}>{d.weightUnit}</Text>}
                    <Text style={s.times}>×</Text>
                    <Text style={[s.value, hit && { color: colors.nutritionInk }]}>{goal.reps}</Text>
                </View>
            </View>
        </View>
    )
}

/* ── 11 · Plate, normal card surface ──────────────────────────────────────────── */

/**
 * The app's actual card colour, which already carries a deliberate light/dark lift (near-white on
 * slate, grey on near-black). Reads as a real card rather than a wash — the plainest option, and
 * the only one that needs no new colour decisions at all.
 */
export function CenteredPlateSurface(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])

    if (isCalibration(d.state)) return <CalibrationBlock d={d} s={s} />
    return (
        <View style={s.wrap}>
            <StateHeader d={d} s={s} />
            <View style={[s.plate, { backgroundColor: colors.surface }]}>
                <Numbers goal={displayGoal(d)} unit={d.weightUnit} s={s} />
            </View>
        </View>
    )
}

/* ── shared pieces ────────────────────────────────────────────────────────────── */

type SharedStyles = ReturnType<typeof makeShared>

// The numeric line shared by most riffs.
function Numbers({ goal, unit, s }: { goal: { weight: number; reps: number }; unit: string; s: SharedStyles }) {
    return (
        <View style={s.numbersRow}>
            <Text style={s.value}>{weightValue(goal.weight)}</Text>
            {goal.weight > 0 && <Text style={s.unit}>{unit}</Text>}
            <Text style={s.times}>×</Text>
            <Text style={s.value}>{goal.reps}</Text>
        </View>
    )
}

// Calibration renders the same way across riffs — the differences only matter once numbers exist.
// The two states ask for different things: a first-timer is setting a baseline, a returning lifter
// is replacing a stale one, so the prompts stay distinct.
function CalibrationBlock({ d, s }: { d: ProgressIndicatorData; s: SharedStyles }) {
    const prompt = d.state === 'calibrationReturn' ? 'Log a set to reset your bar' : 'Log a set to start'
    return (
        <View style={s.wrap}>
            <Text style={s.caps}>{capsLabel(d.state)}</Text>
            <Text style={s.prompt}>{prompt}</Text>
        </View>
    )
}

function makeShared(colors: Colors) {
    return StyleSheet.create({
        wrap: { alignItems: 'center', gap: 4 },
        labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        caps: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.8, color: colors.labelMuted },
        capsBelow: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.8, color: colors.labelMuted, marginTop: 1 },
        prompt: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, letterSpacing: -0.3 },
        numbersRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
        value: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.6, color: colors.text },
        valueXl: { fontFamily: fonts.extrabold, fontSize: 28, letterSpacing: -0.9, color: colors.text },
        unit: { fontFamily: fonts.medium, fontSize: 12, color: colors.labelMuted },
        times: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, marginHorizontal: 1 },
        repsChip: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textSecondary, marginLeft: 4 },
        rule: { width: 26, height: 2, borderRadius: 2, marginTop: 5 },
        dot: { width: 6, height: 6, borderRadius: 3 },
        plate: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: radius.chip },
    })
}
