import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import type { DailyGoal } from '@/context/WorkoutContext/functions/progressionFunctions'
import { LinearGradient } from 'expo-linear-gradient'
import { Check, Dumbbell } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/**
 * Design candidates for the progression indicator that currently renders as a plain
 * centered text line in logsModal ("PLATES suggested set: 190 lbs × 8").
 *
 * Every variant renders the COMPLETE state space so nothing is designed in isolation:
 *   suggested          — a goal exists for today, not yet hit
 *   hit                — goal met today (celebration + next-session preview)
 *   preview            — no goal today, but a set was logged (next-session preview)
 *   calibrationNew     — exercise never trained
 *   calibrationReturn  — no sessions in 14 days; history shown as info, never as a target
 *
 * Copy stays glanceable (numbers + state), never explanatory sentences.
 */

export type ProgressState = 'suggested' | 'hit' | 'preview' | 'calibrationNew' | 'calibrationReturn'

export type ProgressIndicatorData = {
    state: ProgressState
    goal: DailyGoal
    next: DailyGoal
    weightUnit: 'lbs' | 'kg'
    lastSession?: { weight: number; reps: number; agoLabel: string }
    repReset: number
    repCap: number
}

// Full weight label; bodyweight exercises carry no number.
export function weightLabel(weight: number, unit: string): string {
    return weight > 0 ? `${weight} ${unit}` : 'Bodyweight'
}

// Compact weight for tight numeric cells ("190" / "BW").
export function weightValue(weight: number): string {
    return weight > 0 ? `${weight}` : 'BW'
}

// One-line set label, e.g. "190 lbs × 8".
export function setLabel(goal: DailyGoal, unit: string): string {
    return `${weightLabel(goal.weight, unit)} × ${goal.reps}`
}

// True when the variant should render a calibration prompt instead of numbers.
export function isCalibration(state: ProgressState): boolean {
    return state === 'calibrationNew' || state === 'calibrationReturn'
}

// The set a variant should display: preview states show the next session, others show today's goal.
export function shownGoal(d: ProgressIndicatorData): DailyGoal {
    return d.state === 'preview' ? d.next : d.goal
}

// The set a variant should PRESENT: a hit goal hands the eye to the next session's target.
export function displayGoal(d: ProgressIndicatorData): DailyGoal {
    return d.state === 'hit' ? d.next : shownGoal(d)
}

// Rep ticks for the current double-progression cycle, widened if a redirect walked the goal below the reset.
function repLadder(d: ProgressIndicatorData): number[] {
    const from = Math.min(d.repReset, shownGoal(d).reps)
    const ticks: number[] = []
    for (let r = from; r <= d.repCap; r++) ticks.push(r)
    return ticks
}

/* ── 0 · Current (what ships today, for side-by-side comparison) ─────────────── */

export function VariantCurrent(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeCurrent(colors), [colors])

    if (isCalibration(d.state)) return <Text style={s.empty}>Log a set to see your next progression goal</Text>
    if (d.state === 'hit') {
        return (
            <>
                <View style={s.hitRow}>
                    <Check size={14} color={colors.nutritionInk} strokeWidth={2.5} />
                    <Text style={s.hitText}>Goal hit!</Text>
                </View>
                <Text style={s.hitNext}>
                    <Text style={s.label}>Next session: </Text>
                    {setLabel(d.next, d.weightUnit)}
                </Text>
            </>
        )
    }
    return (
        <Text style={s.goal}>
            <Text style={s.label}>{d.state === 'preview' ? 'Next session: ' : 'PLATES suggested set: '}</Text>
            {setLabel(shownGoal(d), d.weightUnit)}
        </Text>
    )
}

function makeCurrent(colors: Colors) {
    return StyleSheet.create({
        goal: { fontSize: 13, color: colors.labelMuted, textAlign: 'center', fontFamily: fonts.medium, letterSpacing: -0.2 },
        label: { color: colors.workout, fontFamily: fonts.semibold },
        empty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', fontFamily: fonts.medium, letterSpacing: -0.2 },
        hitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
        hitText: { fontSize: 13, color: colors.nutritionInk, fontFamily: fonts.semibold, letterSpacing: -0.2 },
        hitNext: { marginTop: 3, fontSize: 13, color: colors.labelMuted, textAlign: 'center', fontFamily: fonts.medium, letterSpacing: -0.2 },
    })
}

/* ── 1 · Target card (accent rail + big numerals) ─────────────────────────────── */

export function VariantTargetCard(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeTargetCard(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutrition : colors.workout
    const goal = shownGoal(d)

    if (isCalibration(d.state)) {
        return (
            <View style={s.card}>
                <View style={[s.rail, { backgroundColor: colors.ringTrack }]} />
                <View style={s.body}>
                    <Text style={s.kicker}>{d.state === 'calibrationNew' ? 'NEW EXERCISE' : 'BEEN A WHILE'}</Text>
                    <Text style={s.calibration}>Log a set</Text>
                    {d.state === 'calibrationReturn' && d.lastSession && (
                        <Text style={s.footNote}>
                            Last · {d.lastSession.agoLabel} · {weightLabel(d.lastSession.weight, d.weightUnit)} × {d.lastSession.reps}
                        </Text>
                    )}
                </View>
            </View>
        )
    }

    return (
        <View style={s.card}>
            <View style={[s.rail, { backgroundColor: accent }]} />
            <View style={s.body}>
                <View style={s.kickerRow}>
                    {hit && <Check size={13} color={accent} strokeWidth={3} />}
                    <Text style={[s.kicker, { color: accent }]}>
                        {hit ? 'GOAL HIT' : d.state === 'preview' ? 'NEXT SESSION' : 'SUGGESTED SET'}
                    </Text>
                </View>
                <View style={s.valueRow}>
                    <Text style={s.value}>{weightValue(hit ? d.next.weight : goal.weight)}</Text>
                    {(hit ? d.next.weight : goal.weight) > 0 && <Text style={s.unit}>{d.weightUnit}</Text>}
                    <Text style={s.times}>×</Text>
                    <Text style={s.value}>{hit ? d.next.reps : goal.reps}</Text>
                    <Text style={s.unit}>reps</Text>
                </View>
            </View>
        </View>
    )
}

function makeTargetCard(colors: Colors) {
    return StyleSheet.create({
        card: {
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            overflow: 'hidden',
        },
        rail: { width: 3 },
        body: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
        kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        kicker: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.8, color: colors.labelMuted },
        valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 5 },
        value: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.8, color: colors.text },
        unit: { fontFamily: fonts.medium, fontSize: 12, color: colors.labelMuted },
        times: { fontFamily: fonts.medium, fontSize: 16, color: colors.textMuted, marginHorizontal: 2 },
        calibration: { fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.5, color: colors.text, marginTop: 5 },
        footNote: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, marginTop: 3 },
    })
}

/* ── 2 · Split cells (mirrors the GraphStats language) ────────────────────────── */

export function VariantSplitCells(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeSplitCells(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workout
    const goal = hit ? d.next : shownGoal(d)

    if (isCalibration(d.state)) {
        return (
            <View style={s.row}>
                <View style={s.singleCell}>
                    <Text style={s.label}>{d.state === 'calibrationNew' ? 'NEW EXERCISE' : 'BEEN A WHILE'}</Text>
                    <Text style={s.calibration}>Log a set to start</Text>
                </View>
            </View>
        )
    }

    return (
        <View>
            <View style={s.headerRow}>
                {hit && <Check size={13} color={accent} strokeWidth={3} />}
                <Text style={[s.header, { color: accent }]}>
                    {hit ? 'GOAL HIT · NEXT SESSION' : d.state === 'preview' ? 'NEXT SESSION' : 'SUGGESTED SET'}
                </Text>
            </View>
            <View style={s.row}>
                <View style={s.half}>
                    <View style={s.cell}>
                        <Text style={s.label}>WEIGHT</Text>
                        <View style={s.valueRow}>
                            <Text style={s.value}>{weightValue(goal.weight)}</Text>
                            {goal.weight > 0 && <Text style={s.unit}>{d.weightUnit}</Text>}
                        </View>
                    </View>
                </View>
                <View style={s.half}>
                    <View style={s.divider} />
                    <View style={s.cell}>
                        <Text style={s.label}>REPS</Text>
                        <Text style={s.value}>{goal.reps}</Text>
                    </View>
                </View>
            </View>
        </View>
    )
}

function makeSplitCells(colors: Colors) {
    return StyleSheet.create({
        headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 6 },
        header: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.8 },
        row: { flexDirection: 'row', backgroundColor: colors.surfaceInset, borderRadius: radius.card, overflow: 'hidden' },
        half: { flex: 1, flexDirection: 'row' },
        divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
        cell: { flex: 1, paddingVertical: 10, paddingHorizontal: 16 },
        singleCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
        label: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.8, color: colors.labelMuted, marginBottom: 3 },
        valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
        value: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.6, color: colors.text },
        unit: { fontFamily: fonts.medium, fontSize: 12, color: colors.labelMuted },
        calibration: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, letterSpacing: -0.3 },
    })
}

/* ── 3 · Accent pill (lowest visual weight) ───────────────────────────────────── */

export function VariantPill(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makePill(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk

    if (isCalibration(d.state)) {
        return (
            <View style={s.wrap}>
                <View style={[s.pill, { backgroundColor: colors.surfaceInset }]}>
                    <Dumbbell size={14} color={colors.textMuted} strokeWidth={2.5} style={s.icon} />
                    <Text style={[s.text, { color: colors.textMuted }]}>Log a set to start</Text>
                </View>
            </View>
        )
    }

    return (
        <View style={s.wrap}>
            <View style={[s.pill, { backgroundColor: colors.iconChipBg }]}>
                {hit ?
                    <Check size={14} color={accent} strokeWidth={3} style={s.icon} />
                :   <Dumbbell size={14} color={accent} strokeWidth={2.5} style={s.icon} />}
                <Text style={[s.text, { color: accent }]}>{setLabel(hit ? d.next : shownGoal(d), d.weightUnit)}</Text>
            </View>
            {hit && <Text style={s.caption}>Goal hit — next session</Text>}
        </View>
    )
}

function makePill(colors: Colors) {
    return StyleSheet.create({
        wrap: { alignItems: 'center' },
        pill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.chip },
        icon: { marginRight: 6 },
        text: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: -0.2 },
        caption: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, marginTop: 5 },
    })
}

/* ── 4 · Rep ladder (shows position in the 8→12 cycle) ────────────────────────── */

export function VariantRepLadder(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeRepLadder(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutrition : colors.workout
    const goal = hit ? d.next : shownGoal(d)
    const ticks = repLadder({ ...d, goal, state: 'suggested' })

    if (isCalibration(d.state)) {
        return (
            <View style={s.card}>
                <Text style={s.calibration}>Log a set to start</Text>
                <View style={s.ladder}>
                    {[0, 1, 2, 3, 4].map((i) => (
                        <View key={i} style={[s.tick, { backgroundColor: colors.ringTrack }]} />
                    ))}
                </View>
            </View>
        )
    }

    return (
        <View style={s.card}>
            <View style={s.topRow}>
                <View style={s.valueRow}>
                    <Text style={s.value}>{weightValue(goal.weight)}</Text>
                    {goal.weight > 0 && <Text style={s.unit}>{d.weightUnit}</Text>}
                    <Text style={s.times}>×</Text>
                    <Text style={s.value}>{goal.reps}</Text>
                </View>
                {hit && (
                    <View style={s.hitChip}>
                        <Check size={11} color={accent} strokeWidth={3} />
                        <Text style={[s.hitChipText, { color: accent }]}>HIT</Text>
                    </View>
                )}
            </View>
            <View style={s.ladder}>
                {ticks.map((r) => {
                    const isTarget = r === goal.reps
                    // Reps already earned this cycle carry a faded accent; the target is solid, the rest are track.
                    const earned = r < goal.reps
                    return <View key={r} style={[s.tick, { backgroundColor: isTarget || earned ? accent : colors.ringTrack }, earned && s.tickEarned, isTarget && s.tickTarget]} />
                })}
                <Text style={s.capLabel}>{d.repCap}</Text>
            </View>
        </View>
    )
}

function makeRepLadder(colors: Colors) {
    return StyleSheet.create({
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingVertical: 12,
            paddingHorizontal: 14,
        },
        topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
        value: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.6, color: colors.text },
        unit: { fontFamily: fonts.medium, fontSize: 12, color: colors.labelMuted },
        times: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted, marginHorizontal: 2 },
        hitChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
        hitChipText: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.8 },
        ladder: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
        tick: { flex: 1, height: 5, borderRadius: 3 },
        tickEarned: { opacity: 0.35 },
        tickTarget: { height: 7 },
        capLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textMuted, marginLeft: 2 },
        calibration: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, letterSpacing: -0.3 },
    })
}

/* ── 5 · Gradient band (highest emphasis) ─────────────────────────────────────── */

export function VariantGradientBand(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeGradientBand(colors), [colors])
    const hit = d.state === 'hit'
    const goal = hit ? d.next : shownGoal(d)

    if (isCalibration(d.state)) {
        return (
            <View style={s.flatBand}>
                <Text style={s.flatText}>Log a set to start</Text>
            </View>
        )
    }

    return (
        <LinearGradient colors={hit ? colors.nutritionGradient : colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.band}>
            <View style={s.kickerRow}>
                {hit && <Check size={12} color="#FFF" strokeWidth={3} />}
                <Text style={s.kicker}>{hit ? 'GOAL HIT · NEXT' : d.state === 'preview' ? 'NEXT SESSION' : 'SUGGESTED SET'}</Text>
            </View>
            <View style={s.valueRow}>
                <Text style={s.value}>{weightValue(goal.weight)}</Text>
                {goal.weight > 0 && <Text style={s.unit}>{d.weightUnit}</Text>}
                <Text style={s.times}>×</Text>
                <Text style={s.value}>{goal.reps}</Text>
            </View>
        </LinearGradient>
    )
}

function makeGradientBand(colors: Colors) {
    return StyleSheet.create({
        band: { borderRadius: radius.card, paddingVertical: 12, paddingHorizontal: 14 },
        kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        kicker: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.8, color: 'rgba(255,255,255,0.85)' },
        valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
        value: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.8, color: '#FFF' },
        unit: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
        times: { fontFamily: fonts.medium, fontSize: 15, color: 'rgba(255,255,255,0.7)', marginHorizontal: 2 },
        flatBand: {
            borderRadius: radius.card,
            paddingVertical: 12,
            paddingHorizontal: 14,
            backgroundColor: colors.surfaceInset,
            alignItems: 'center',
        },
        flatText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, letterSpacing: -0.2 },
    })
}

/* ── 6 · Inline row (compact, left label / right numbers) ─────────────────────── */

export function VariantInlineRow(d: ProgressIndicatorData) {
    const colors = useColors()
    const s = useMemo(() => makeInlineRow(colors), [colors])
    const hit = d.state === 'hit'
    const accent = hit ? colors.nutritionInk : colors.workoutInk
    const goal = hit ? d.next : shownGoal(d)

    if (isCalibration(d.state)) {
        return (
            <View style={s.row}>
                <Text style={s.label}>{d.state === 'calibrationNew' ? 'New exercise' : 'Been a while'}</Text>
                <Text style={s.calibration}>Log a set</Text>
            </View>
        )
    }

    return (
        <View>
            <View style={s.row}>
                <View style={s.labelRow}>
                    {hit && <Check size={12} color={accent} strokeWidth={3} />}
                    <Text style={[s.label, hit && { color: accent }]}>{hit ? 'Goal hit · next' : d.state === 'preview' ? 'Next session' : 'Suggested set'}</Text>
                </View>
                <View style={s.valueRow}>
                    <Text style={s.value}>{weightValue(goal.weight)}</Text>
                    {goal.weight > 0 && <Text style={s.unit}>{d.weightUnit}</Text>}
                    <Text style={s.times}>×</Text>
                    <Text style={s.value}>{goal.reps}</Text>
                </View>
            </View>
        </View>
    )
}

function makeInlineRow(colors: Colors) {
    return StyleSheet.create({
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surfaceInset,
            borderRadius: radius.card,
            paddingVertical: 10,
            paddingHorizontal: 14,
        },
        labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.labelMuted, letterSpacing: -0.2 },
        valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
        value: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.5, color: colors.text },
        unit: { fontFamily: fonts.medium, fontSize: 11, color: colors.labelMuted },
        times: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginHorizontal: 1 },
        calibration: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, letterSpacing: -0.2 },
    })
}
