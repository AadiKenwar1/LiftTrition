import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import type { DailyGoal } from '@/context/WorkoutContext/functions/progressionFunctions'
import { Check, Dumbbell } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'
import { displayGoal, isCalibration, weightValue, type ProgressIndicatorData, type ProgressState } from './ProgressIndicatorVariants'

/**
 * Riffs on the inline row (variant 6 of the main bench) — the direction picked for its minimalism.
 * Every candidate keeps the same skeleton (quiet label on the left, numbers on the right) and
 * varies exactly one thing: the container, the label treatment, or where the color lands.
 * All 5 states are rendered by each, so nothing is designed in isolation.
 */

// Row label per state. Hit hands the eye to the next session, so its label says so.
function stateLabel(state: ProgressState, caps: boolean): string {
    const label =
        state === 'hit' ? 'Goal hit · next'
        : state === 'preview' ? 'Next session'
        : 'Suggested set'
    return caps ? label.toUpperCase() : label
}

// Short context word for the calibration states, so the row keeps its shape.
function calibrationLabel(state: ProgressState, caps: boolean): string {
    const label = state === 'calibrationNew' ? 'New exercise' : 'Been a while'
    return caps ? label.toUpperCase() : label
}

type NumbersProps = {
    goal: DailyGoal
    unit: string
    valueStyle: StyleProp<TextStyle>
    unitStyle: StyleProp<TextStyle>
    timesStyle: StyleProp<TextStyle>
}

// The numeric half of every inline row: "190 lbs × 8", or "BW × 11" when there is no external load.
function SetNumbers({ goal, unit, valueStyle, unitStyle, timesStyle }: NumbersProps) {
    return (
        <View style={numbersStyles.row}>
            <Text style={valueStyle}>{weightValue(goal.weight)}</Text>
            {goal.weight > 0 && <Text style={unitStyle}>{unit}</Text>}
            <Text style={timesStyle}>×</Text>
            <Text style={valueStyle}>{goal.reps}</Text>
        </View>
    )
}

const numbersStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
})

/* ── 0 · Inset fill (the one that won the first bench — baseline) ─────────────── */

export function InlineInsetFill(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk

    if (isCalibration(d.state)) {
        return (
            <View style={[s.row, s.filled]}>
                <Text style={s.label}>{calibrationLabel(d.state, false)}</Text>
                <Text style={s.prompt}>Log a set</Text>
            </View>
        )
    }
    return (
        <View style={[s.row, s.filled]}>
            <View style={s.labelRow}>
                {hit && <Check size={12} color={accent} strokeWidth={3} />}
                <Text style={[s.label, hit && { color: accent }]}>{stateLabel(d.state, false)}</Text>
            </View>
            <SetNumbers goal={displayGoal(d)} unit={d.weightUnit} valueStyle={s.value} unitStyle={s.unit} timesStyle={s.times} />
        </View>
    )
}

/* ── 1 · Bare (no container at all — the purest form) ─────────────────────────── */

export function InlineBare(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk

    if (isCalibration(d.state)) {
        return (
            <View style={s.row}>
                <Text style={s.label}>{calibrationLabel(d.state, false)}</Text>
                <Text style={s.prompt}>Log a set</Text>
            </View>
        )
    }
    return (
        <View style={s.row}>
            <View style={s.labelRow}>
                {hit && <Check size={12} color={accent} strokeWidth={3} />}
                <Text style={[s.label, hit && { color: accent }]}>{stateLabel(d.state, false)}</Text>
            </View>
            <SetNumbers goal={displayGoal(d)} unit={d.weightUnit} valueStyle={s.value} unitStyle={s.unit} timesStyle={s.times} />
        </View>
    )
}

/* ── 2 · Top rule (a hairline separates it from the inputs, no fill) ──────────── */

export function InlineTopRule(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk

    return (
        <View style={s.ruled}>
            {isCalibration(d.state) ?
                <View style={s.row}>
                    <Text style={s.label}>{calibrationLabel(d.state, false)}</Text>
                    <Text style={s.prompt}>Log a set</Text>
                </View>
            :   <View style={s.row}>
                    <View style={s.labelRow}>
                        {hit && <Check size={12} color={accent} strokeWidth={3} />}
                        <Text style={[s.label, hit && { color: accent }]}>{stateLabel(d.state, false)}</Text>
                    </View>
                    <SetNumbers goal={displayGoal(d)} unit={d.weightUnit} valueStyle={s.value} unitStyle={s.unit} timesStyle={s.times} />
                </View>
            }
        </View>
    )
}

/* ── 3 · Accent dot (color carried by a dot instead of the text) ──────────────── */

export function InlineDot(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'
    const dotColor =
        isCalibration(d.state) ? colors.ringTrack
        : hit ? colors.nutrition
        : colors.workout

    return (
        <View style={s.row}>
            <View style={s.labelRow}>
                <View style={[s.dot, { backgroundColor: dotColor }]} />
                <Text style={s.label}>{isCalibration(d.state) ? calibrationLabel(d.state, false) : stateLabel(d.state, false)}</Text>
            </View>
            {isCalibration(d.state) ?
                <Text style={s.prompt}>Log a set</Text>
            :   <SetNumbers goal={displayGoal(d)} unit={d.weightUnit} valueStyle={s.value} unitStyle={s.unit} timesStyle={s.times} />}
        </View>
    )
}

/* ── 4 · Icon only (no label words at all — fewest things to read) ────────────── */

export function InlineIconOnly(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk

    if (isCalibration(d.state)) {
        return (
            <View style={s.row}>
                <Dumbbell size={15} color={colors.textMuted} strokeWidth={2.5} />
                <Text style={s.prompt}>Log a set</Text>
            </View>
        )
    }
    return (
        <View style={s.row}>
            {hit ?
                <Check size={15} color={accent} strokeWidth={3} />
            :   <Dumbbell size={15} color={colors.labelMuted} strokeWidth={2.5} />}
            <SetNumbers goal={displayGoal(d)} unit={d.weightUnit} valueStyle={s.value} unitStyle={s.unit} timesStyle={s.times} />
        </View>
    )
}

/* ── 5 · Micro-caps label (letterspaced, quieter than sentence case) ──────────── */

export function InlineMicroCaps(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk

    return (
        <View style={s.row}>
            <View style={s.labelRow}>
                {hit && <Check size={11} color={accent} strokeWidth={3} />}
                <Text style={[s.caps, hit && { color: accent }]}>{isCalibration(d.state) ? calibrationLabel(d.state, true) : stateLabel(d.state, true)}</Text>
            </View>
            {isCalibration(d.state) ?
                <Text style={s.prompt}>Log a set</Text>
            :   <SetNumbers goal={displayGoal(d)} unit={d.weightUnit} valueStyle={s.value} unitStyle={s.unit} timesStyle={s.times} />}
        </View>
    )
}

/* ── 6 · Accent numerals (label stays muted, the numbers carry the color) ─────── */

export function InlineAccentNumbers(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk

    if (isCalibration(d.state)) {
        return (
            <View style={s.row}>
                <Text style={s.label}>{calibrationLabel(d.state, false)}</Text>
                <Text style={s.prompt}>Log a set</Text>
            </View>
        )
    }
    return (
        <View style={s.row}>
            <Text style={s.label}>{stateLabel(d.state, false)}</Text>
            <SetNumbers goal={displayGoal(d)} unit={d.weightUnit} valueStyle={[s.value, { color: accent }]} unitStyle={[s.unit, { color: accent, opacity: 0.75 }]} timesStyle={[s.times, { color: accent, opacity: 0.6 }]} />
        </View>
    )
}

/* ── 7 · Trailing preview (today's target plus a faded look-ahead) ────────────── */

export function InlineTrailingPreview(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk

    if (isCalibration(d.state)) {
        return (
            <View style={s.row}>
                <Text style={s.label}>{calibrationLabel(d.state, false)}</Text>
                <Text style={s.prompt}>Log a set</Text>
            </View>
        )
    }
    return (
        <View style={s.row}>
            <View style={s.labelRow}>
                {hit && <Check size={12} color={accent} strokeWidth={3} />}
                <Text style={[s.label, hit && { color: accent }]}>{stateLabel(d.state, false)}</Text>
            </View>
            <View style={s.trailGroup}>
                <SetNumbers goal={displayGoal(d)} unit={d.weightUnit} valueStyle={s.value} unitStyle={s.unit} timesStyle={s.times} />
                {!hit && d.state !== 'preview' && (
                    <Text style={s.trail}>
                        → {weightValue(d.next.weight)} × {d.next.reps}
                    </Text>
                )}
            </View>
        </View>
    )
}

/* ── 8 · Centered (keeps today's centered alignment, adds hierarchy) ──────────── */

export function InlineCentered(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk

    if (isCalibration(d.state)) {
        return (
            <View style={s.centered}>
                <Text style={s.prompt}>Log a set to start</Text>
            </View>
        )
    }
    return (
        <View style={s.centered}>
            <View style={s.labelRow}>
                {hit && <Check size={11} color={accent} strokeWidth={3} />}
                <Text style={[s.caps, hit && { color: accent }]}>{stateLabel(d.state, true)}</Text>
            </View>
            <View style={s.centeredNumbers}>
                <SetNumbers goal={displayGoal(d)} unit={d.weightUnit} valueStyle={s.valueLg} unitStyle={s.unit} timesStyle={s.times} />
            </View>
        </View>
    )
}

// One shared style sheet: the riffs differ by which pieces they use, not by their type scale.
function makeShared(colors: Colors) {
    return StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
        filled: { backgroundColor: colors.surfaceInset, borderRadius: radius.card, paddingVertical: 10, paddingHorizontal: 14 },
        ruled: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: 11 },
        labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.labelMuted, letterSpacing: -0.2 },
        caps: { fontFamily: fonts.semibold, fontSize: 10, color: colors.labelMuted, letterSpacing: 0.8 },
        prompt: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, letterSpacing: -0.2 },
        value: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.5, color: colors.text },
        valueLg: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.6, color: colors.text },
        unit: { fontFamily: fonts.medium, fontSize: 11, color: colors.labelMuted },
        times: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginHorizontal: 1 },
        dot: { width: 6, height: 6, borderRadius: 3 },
        trailGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
        trail: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
        centered: { alignItems: 'center', gap: 3 },
        centeredNumbers: { alignItems: 'center' },
    })
}
