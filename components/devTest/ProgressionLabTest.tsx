import {
    getCalibrationMessage,
    getProgressionState,
    gradeSet,
    score,
    type GradeReason,
    type ProgressionOptions,
    type ProgressionState,
} from '@/context/WorkoutContext/functions/progressionFunctions'
import type { Log } from '@/context/WorkoutContext/types'
import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { addDays, daysBetween, getDateKey } from '@/lib/utils/dateHelper'
import { parseNumericInput } from '@/lib/utils/number'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

/**
 * Bench for the candidate progression engine (progressionEngineV2.ts), which is not wired into
 * the app.
 *
 * PLAY walks a real training block: you see the card a lifter would see, log a set, watch it get
 * graded, then jump to the next session and keep climbing. CHECK runs all 39 documented
 * scenarios at once and reports pass/fail — tap any row to drop it into Play and poke at it.
 */

const EXERCISE_ID = 'dev-exercise'

type SetSpec = { daysAgo: number; weight: number; reps: number }
type Entry = { date: Date; weight: number; reps: number }

type Scenario = {
    id: string
    title: string
    sets: SetSpec[]
    /** Goal as "190 × 8", or a calibration state: 'first time' | 'been a while' | 'low reps'. */
    expect: string
    expectGrade?: GradeReason
    unit?: 'lbs' | 'kg'
    isCompound?: boolean
    equipment?: string
}

const SCENARIOS: Scenario[] = [
    { id: '1', title: 'Normal week-to-week progress', sets: [{ daysAgo: 3, weight: 185, reps: 8 }], expect: '185 × 9' },
    { id: '2', title: 'Hit 12 reps — the weight goes up', sets: [{ daysAgo: 3, weight: 185, reps: 12 }], expect: '190 × 8' },
    { id: '3', title: 'The 195×7 bug that started all this', sets: [{ daysAgo: 3, weight: 190, reps: 7 }, { daysAgo: 0, weight: 195, reps: 7 }], expect: '190 × 8', expectGrade: 'outWorked' },
    { id: '4', title: 'Lighter, more reps — still stronger', sets: [{ daysAgo: 3, weight: 190, reps: 7 }, { daysAgo: 0, weight: 185, reps: 10 }], expect: '190 × 8', expectGrade: 'outWorked' },
    { id: '4b', title: '…and next session the app follows you', sets: [{ daysAgo: 6, weight: 190, reps: 7 }, { daysAgo: 3, weight: 185, reps: 10 }], expect: '185 × 11' },
    { id: '5', title: 'You log your warmups', sets: [{ daysAgo: 3, weight: 135, reps: 10 }, { daysAgo: 3, weight: 155, reps: 8 }, { daysAgo: 3, weight: 190, reps: 8 }], expect: '190 × 9' },
    { id: '6', title: 'First time doing an exercise', sets: [], expect: 'first time' },
    { id: '7', title: 'One bad day — the bar holds', sets: [{ daysAgo: 6, weight: 190, reps: 8 }, { daysAgo: 3, weight: 135, reps: 10 }], expect: '190 × 9' },
    { id: '8', title: 'Two bad days — the app believes you', sets: [{ daysAgo: 6, weight: 135, reps: 10 }, { daysAgo: 3, weight: 135, reps: 10 }], expect: '135 × 11' },
    { id: '9', title: 'You fail a weight jump', sets: [{ daysAgo: 6, weight: 185, reps: 12 }, { daysAgo: 3, weight: 190, reps: 5 }], expect: '190 × 6' },
    { id: '10', title: 'Genuinely getting weaker — walks down with you', sets: [{ daysAgo: 6, weight: 190, reps: 8 }, { daysAgo: 3, weight: 190, reps: 7 }], expect: '190 × 8' },
    { id: '11', title: 'You deload on purpose — nudges once', sets: [{ daysAgo: 6, weight: 225, reps: 10 }, { daysAgo: 3, weight: 185, reps: 8 }], expect: '225 × 11' },
    { id: '12', title: 'Max double plus real working sets', sets: [{ daysAgo: 3, weight: 200, reps: 2 }, { daysAgo: 3, weight: 185, reps: 10 }], expect: '185 × 11' },
    { id: '13', title: 'You went heavier than planned, fewer reps', sets: [{ daysAgo: 6, weight: 185, reps: 12 }, { daysAgo: 3, weight: 195, reps: 5 }], expect: '195 × 6' },
    { id: '14', title: 'Two-plus weeks off', sets: [{ daysAgo: 15, weight: 190, reps: 8 }], expect: 'been a while' },
    { id: '15', title: 'Trains every ~10 days — never asks to recalibrate', sets: [{ daysAgo: 20, weight: 190, reps: 8 }, { daysAgo: 10, weight: 190, reps: 8 }], expect: '190 × 9' },
    { id: '16', title: 'Burnout finisher after heavy work', sets: [{ daysAgo: 3, weight: 225, reps: 8 }, { daysAgo: 3, weight: 185, reps: 20 }], expect: '225 × 9' },
    { id: '17', title: 'Gaming the goal with 135 × 35', sets: [{ daysAgo: 3, weight: 225, reps: 8 }, { daysAgo: 0, weight: 135, reps: 35 }], expect: '225 × 9', expectGrade: 'miss' },
    { id: '18', title: 'Bodyweight pull-ups', sets: [{ daysAgo: 6, weight: 0, reps: 9 }, { daysAgo: 3, weight: 0, reps: 11 }], expect: '0 × 12', equipment: 'Bodyweight' },
    { id: '19', title: 'A zero-rep log (the UI blocks it — belt and braces)', sets: [{ daysAgo: 3, weight: 190, reps: 0 }], expect: 'low reps' },
    { id: '20', title: 'Only heavy doubles', sets: [{ daysAgo: 3, weight: 200, reps: 2 }], expect: '200 × 3' },
    { id: '22', title: 'You trained twice in one day', sets: [{ daysAgo: 3, weight: 185, reps: 8 }, { daysAgo: 3, weight: 190, reps: 6 }], expect: '190 × 7' },
    { id: '23', title: 'Two identical sets — never flip-flops', sets: [{ daysAgo: 3, weight: 185, reps: 8 }, { daysAgo: 3, weight: 185, reps: 8 }], expect: '185 × 9' },
    { id: '24', title: 'You grind out a max single', sets: [{ daysAgo: 6, weight: 190, reps: 7 }, { daysAgo: 3, weight: 225, reps: 1 }], expect: '190 × 8' },
    { id: '25', title: 'Jump day still celebrates (carries the graph dip)', sets: [{ daysAgo: 3, weight: 185, reps: 12 }, { daysAgo: 0, weight: 190, reps: 8 }], expect: '190 × 8', expectGrade: 'suggestedSet' },
    { id: 'E1', title: 'A 13th rep counts, even past the formula cap', sets: [{ daysAgo: 3, weight: 170, reps: 12 }, { daysAgo: 0, weight: 170, reps: 13 }], expect: '175 × 8', expectGrade: 'moreRepsSameBar' },
    { id: 'E2', title: 'Repeating the exact same set is not beating it', sets: [{ daysAgo: 3, weight: 190, reps: 7 }, { daysAgo: 0, weight: 190, reps: 7 }], expect: '190 × 8', expectGrade: 'miss' },
    { id: 'E3', title: 'A dead-even trade (185×8 vs 190×7)', sets: [{ daysAgo: 3, weight: 190, reps: 7 }, { daysAgo: 0, weight: 185, reps: 8 }], expect: '190 × 8', expectGrade: 'miss' },
    { id: 'E4', title: 'Jump day, overshot — counts despite a lower e1RM', sets: [{ daysAgo: 3, weight: 185, reps: 12 }, { daysAgo: 0, weight: 195, reps: 8 }], expect: '190 × 8', expectGrade: 'suggestedSet' },
    { id: 'E5', title: 'A heavy double beats a rep bar', sets: [{ daysAgo: 3, weight: 190, reps: 8 }, { daysAgo: 0, weight: 250, reps: 2 }], expect: '190 × 9', expectGrade: 'outWorked' },
    { id: 'E6', title: 'A submaximal single does not', sets: [{ daysAgo: 3, weight: 190, reps: 8 }, { daysAgo: 0, weight: 225, reps: 1 }], expect: '190 × 9', expectGrade: 'miss' },
    { id: 'E7', title: 'Singles-only lifter — uncoached by design', sets: [{ daysAgo: 6, weight: 225, reps: 1 }, { daysAgo: 3, weight: 230, reps: 1 }], expect: 'low reps' },
    { id: 'E8', title: 'Doubles-only lifter — the hard floor catches it', sets: [{ daysAgo: 6, weight: 225, reps: 2 }, { daysAgo: 3, weight: 230, reps: 2 }], expect: '230 × 3' },
    { id: 'E9', title: 'Bodyweight at 12 — suggests a belt, rep still counts', sets: [{ daysAgo: 3, weight: 0, reps: 12 }, { daysAgo: 0, weight: 0, reps: 13 }], expect: '5 × 8', expectGrade: 'moreRepsSameBar', equipment: 'Bodyweight' },
    { id: 'E10', title: 'Bodyweight sick day — no hold protection (known gap)', sets: [{ daysAgo: 6, weight: 0, reps: 12 }, { daysAgo: 3, weight: 0, reps: 6 }], expect: '0 × 7', equipment: 'Bodyweight' },
    { id: 'E11', title: 'Only the last two sessions count', sets: [{ daysAgo: 6, weight: 190, reps: 8 }, { daysAgo: 4, weight: 135, reps: 10 }, { daysAgo: 3, weight: 135, reps: 10 }], expect: '135 × 11' },
    { id: 'E12', title: 'Belt plus bodyweight — clumsy hint, right celebration', sets: [{ daysAgo: 3, weight: 0, reps: 15 }, { daysAgo: 3, weight: 5, reps: 3 }, { daysAgo: 0, weight: 0, reps: 15 }], expect: '5 × 4', expectGrade: 'outWorked', equipment: 'Bodyweight' },
    { id: 'E13', title: 'Exactly 14 days out — still coached', sets: [{ daysAgo: 14, weight: 190, reps: 8 }], expect: '190 × 9' },
    { id: 'E14', title: 'Isolation lift — 2.5 lb jumps', sets: [{ daysAgo: 3, weight: 40, reps: 12 }], expect: '42.5 × 8', isCompound: false },
    { id: 'E15', title: 'Kilograms — 2.5 kg jumps', sets: [{ daysAgo: 3, weight: 100, reps: 12 }], expect: '102.5 × 8', unit: 'kg' },
]

const STATUS_LABEL: Record<string, string> = { firstTime: 'first time', stale: 'been a while', lowReps: 'low reps' }

// Plain-English verdict for one logged set. Never shows the engine's rule names.
const GRADE_COPY: Record<GradeReason, string> = {
    suggestedSet: 'counted — that was the suggested set',
    moreRepsSameBar: 'counted — more reps on the same bar',
    heavierBar: 'counted — heavier bar, at most a rep off',
    outWorked: 'counted — more work than your bar',
    miss: "didn't beat it",
}

// Drops trailing zeros so 42.5 stays "42.5" and 190 stays "190".
function fmt(n: number): string {
    return String(Math.round(n * 100) / 100)
}

// "190 × 8", the way both the bar and the suggestion read on screen.
function fmtSet(weight: number, reps: number): string {
    return `${fmt(weight)} × ${reps}`
}

// "Today" / "Yesterday" / "6 days ago", relative to the simulated date.
function dayLabel(date: Date, today: Date): string {
    const diff = daysBetween(date, today)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return `${diff} days ago`
}

// Turns the editable entry list into Logs. Array order becomes `time`, so a later-logged set
// wins the tie-break between two otherwise identical sets.
function toLogs(entries: Entry[]): Log[] {
    return entries.map((e, i) => ({
        id: `dev-${i}`,
        userID: 'dev',
        workoutID: 'dev',
        exerciseID: EXERCISE_ID,
        date: e.date,
        time: i,
        weight: e.weight,
        reps: e.reps,
        rpe: 0,
        createdAt: e.date,
        updatedAt: e.date,
    }))
}

// Says in one sentence where the bar came from, so the card never looks arbitrary.
function explainBar(state: ProgressionState, today: Date): string {
    if (!state.anchor) return ''
    const when = dayLabel(state.anchor.date, today).toLowerCase()
    if (state.heldPrevSession) {
        return `Your last session was lighter and less work, so your best set from ${when} still holds.`
    }
    return `Your best set from ${when}.`
}

// Runs one scenario end to end. Shared by Check mode and by the pass badge in Play.
function evaluate(scenario: Scenario, base: Date): { actual: string; reason: GradeReason | null; pass: boolean } {
    const options: ProgressionOptions = {
        weightUnit: scenario.unit ?? 'lbs',
        isCompound: scenario.isCompound ?? true,
        equipment: scenario.equipment ?? 'Barbell',
        bodyWeight: 180,
    }
    const entries = scenario.sets.map((s) => ({ date: addDays(base, -s.daysAgo), weight: s.weight, reps: s.reps }))
    const logs = toLogs(entries)
    const state = getProgressionState(logs, EXERCISE_ID, base, options)

    const actual = state.goal ? fmtSet(state.goal.weight, state.goal.reps) : (STATUS_LABEL[state.status] ?? state.status)

    let reason: GradeReason | null = null
    if (state.anchor && state.goal) {
        const baseKey = getDateKey(base)
        const reasons = logs.filter((l) => getDateKey(l.date) === baseKey).map((l) => gradeSet(l, state.goal!, state.anchor!, options))
        reason = reasons.find((r) => r !== 'miss') ?? (reasons.length > 0 ? 'miss' : null)
    }

    const pass = actual === scenario.expect && (scenario.expectGrade === undefined || reason === scenario.expectGrade)
    return { actual, reason, pass }
}

export default function ProgressionLabTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    // Frozen at mount so "days ago" arithmetic can't drift mid-session.
    const base = useMemo(() => new Date(), [])

    const [mode, setMode] = useState<'play' | 'check'>('play')
    const [scenarioId, setScenarioId] = useState('1')
    const [elapsed, setElapsed] = useState(0)
    const [entries, setEntries] = useState<Entry[]>(() => SCENARIOS[0].sets.map((s) => ({ date: addDays(new Date(), -s.daysAgo), weight: s.weight, reps: s.reps })))
    const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs')
    const [isCompound, setIsCompound] = useState(true)
    const [equipment, setEquipment] = useState('Barbell')
    const [showInternals, setShowInternals] = useState(false)

    const [weightInput, setWeightInput] = useState('190')
    const [repsInput, setRepsInput] = useState('8')

    const today = useMemo(() => addDays(base, elapsed), [base, elapsed])
    const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]

    const options: ProgressionOptions = useMemo(
        () => ({ weightUnit: unit, isCompound, equipment, bodyWeight: 180 }),
        [unit, isCompound, equipment]
    )

    const logs = useMemo(() => toLogs(entries), [entries])
    const state = useMemo(() => getProgressionState(logs, EXERCISE_ID, today, options), [logs, today, options])
    const nextState = useMemo(() => getProgressionState(logs, EXERCISE_ID, addDays(today, 1), options), [logs, today, options])

    const todayKey = getDateKey(today)
    const gradedToday = useMemo(() => {
        if (!state.anchor || !state.goal) return []
        return logs.filter((l) => getDateKey(l.date) === todayKey).map((l) => ({ log: l, reason: gradeSet(l, state.goal!, state.anchor!, options) }))
    }, [logs, state, options, todayKey])

    const hit = gradedToday.find((g) => g.reason !== 'miss')

    const loadScenario = (s: Scenario) => {
        setScenarioId(s.id)
        setElapsed(0)
        setEntries(s.sets.map((spec) => ({ date: addDays(base, -spec.daysAgo), weight: spec.weight, reps: spec.reps })))
        setUnit(s.unit ?? 'lbs')
        setIsCompound(s.isCompound ?? true)
        setEquipment(s.equipment ?? 'Barbell')
        setMode('play')
    }

    const logSet = () => {
        const w = parseNumericInput(weightInput)
        const r = parseNumericInput(repsInput)
        if (w === null || r === null) return
        setEntries((prev) => [...prev, { date: today, weight: Math.max(0, w), reps: Math.max(0, Math.round(r)) }])
    }

    // Pre-fills the logger with the suggestion so the common path is one tap.
    const useSuggestion = () => {
        if (!state.goal) return
        setWeightInput(fmt(state.goal.weight))
        setRepsInput(String(state.goal.reps))
    }

    const removeEntry = (index: number) => {
        setEntries((prev) => prev.filter((_, i) => i !== index))
    }

    // Journal rows: newest first, each set tagged with the day it belongs to.
    const journal = useMemo(() => {
        return entries
            .map((e, index) => ({ ...e, index }))
            .sort((a, b) => b.date.getTime() - a.date.getTime() || b.index - a.index)
    }, [entries])

    const results = useMemo(() => SCENARIOS.map((s) => ({ scenario: s, ...evaluate(s, base) })), [base])
    const passCount = results.filter((r) => r.pass).length

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.topBar}>
                <View style={styles.modeSwitch}>
                    {(['play', 'check'] as const).map((m) => (
                        <TouchableOpacity
                            key={m}
                            onPress={() => setMode(m)}
                            activeOpacity={0.7}
                            style={[styles.modeButton, mode === m && { backgroundColor: colors.workout }]}
                        >
                            <Text style={[styles.modeText, { color: mode === m ? '#FFF' : colors.textSecondary }]}>{m === 'play' ? 'Play' : `Check  ${passCount}/${results.length}`}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity onPress={() => setColorScheme(isDark ? 'light' : 'dark')} activeOpacity={0.6} style={styles.themeButton}>
                    <Text style={styles.themeText}>{isDark ? 'Dark' : 'Light'}</Text>
                </TouchableOpacity>
            </View>

            {mode === 'check' ? (
                <>
                    <Text style={styles.hint}>Every documented scenario, run at once. Tap one to open it in Play.</Text>
                    <View style={styles.card}>
                        {results.map(({ scenario: s, actual, pass }) => (
                            <TouchableOpacity key={s.id} style={styles.checkRow} onPress={() => loadScenario(s)} activeOpacity={0.6}>
                                <Text style={[styles.checkMark, pass ? styles.good : styles.bad]}>{pass ? '✓' : '✗'}</Text>
                                <View style={styles.checkBody}>
                                    <Text style={styles.checkTitle} numberOfLines={2}>
                                        {s.title}
                                    </Text>
                                    {!pass && (
                                        <Text style={styles.checkDetail}>
                                            expected {s.expect} · got {actual}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            ) : (
                <>
                    <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                    <Text style={styles.hint}>
                        {equipment === 'Bodyweight' ? 'Bodyweight · ' : ''}
                        {isCompound ? 'Compound' : 'Isolation'} · {unit}
                        {elapsed > 0 ? ` · ${elapsed} days into the block` : ''}
                    </Text>

                    {/* The card a lifter actually sees. */}
                    <View style={styles.suggestCard}>
                        {state.goal && state.anchor ? (
                            hit ? (
                                <>
                                    <Text style={styles.cardEyebrowHit}>GOAL HIT</Text>
                                    <Text style={styles.cardBig}>{fmtSet(hit.log.weight, hit.log.reps)}</Text>
                                    <Text style={styles.cardSub}>
                                        beat your bar of {fmtSet(state.anchor.weight, state.anchor.reps)}
                                    </Text>
                                    {nextState.goal && nextState.anchor && (
                                        <Text style={styles.cardNext}>
                                            Next session — to beat {fmtSet(nextState.anchor.weight, nextState.anchor.reps)}, try {fmtSet(nextState.goal.weight, nextState.goal.reps)}
                                        </Text>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Text style={styles.cardEyebrow}>TO BEAT</Text>
                                    <Text style={styles.cardBig}>{fmtSet(state.anchor.weight, state.anchor.reps)}</Text>
                                    <Text style={styles.cardSub}>
                                        Try <Text style={styles.cardSubStrong}>{fmtSet(state.goal.weight, state.goal.reps)}</Text> — or anything stronger
                                    </Text>
                                </>
                            )
                        ) : (
                            <>
                                <Text style={styles.cardEyebrow}>NO BAR YET</Text>
                                <Text style={styles.cardCalibration}>{getCalibrationMessage(state.status)}</Text>
                            </>
                        )}
                    </View>

                    {state.anchor && <Text style={styles.why}>{explainBar(state, today)}</Text>}

                    {/* Log a set the way the real modal would. */}
                    <Text style={styles.sectionTitle}>Log a set</Text>
                    <View style={styles.logRow}>
                        <TextInput style={styles.input} value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" placeholder="weight" placeholderTextColor={colors.placeholder} />
                        <Text style={styles.times}>×</Text>
                        <TextInput style={styles.input} value={repsInput} onChangeText={setRepsInput} keyboardType="decimal-pad" placeholder="reps" placeholderTextColor={colors.placeholder} />
                        <TouchableOpacity style={styles.primaryButton} onPress={logSet} activeOpacity={0.8}>
                            <Text style={styles.primaryButtonText}>Log</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.actionRow}>
                        {state.goal && (
                            <TouchableOpacity style={styles.secondaryButton} onPress={useSuggestion} activeOpacity={0.7}>
                                <Text style={styles.secondaryButtonText}>Fill the suggestion</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => setElapsed((e) => e + 3)} activeOpacity={0.7}>
                            <Text style={styles.secondaryButtonText}>Next session →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => setElapsed((e) => e + 15)} activeOpacity={0.7}>
                            <Text style={styles.secondaryButtonText}>Skip 15 days</Text>
                        </TouchableOpacity>
                    </View>

                    {gradedToday.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Today&apos;s sets</Text>
                            <View style={styles.card}>
                                {gradedToday.map(({ log, reason }, i) => (
                                    <View key={i} style={styles.gradeRow}>
                                        <Text style={styles.gradeSet}>{fmtSet(log.weight, log.reps)}</Text>
                                        <Text style={[styles.gradeVerdict, reason === 'miss' ? styles.warn : styles.good]}>{GRADE_COPY[reason]}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    <Text style={styles.sectionTitle}>Training log</Text>
                    <View style={styles.card}>
                        {journal.length === 0 && <Text style={styles.emptyText}>Nothing logged yet.</Text>}
                        {journal.map((e) => (
                            <View key={e.index} style={styles.journalRow}>
                                <Text style={styles.journalDay}>{dayLabel(e.date, today)}</Text>
                                <Text style={styles.journalSet}>{fmtSet(e.weight, e.reps)}</Text>
                                <TouchableOpacity onPress={() => removeEntry(e.index)} activeOpacity={0.6} style={styles.removeButton}>
                                    <Text style={styles.removeText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Start from a scenario</Text>
                    <View style={styles.card}>
                        {SCENARIOS.map((s) => (
                            <TouchableOpacity key={s.id} style={styles.pickRow} onPress={() => loadScenario(s)} activeOpacity={0.6}>
                                <Text style={[styles.pickTitle, s.id === scenarioId && styles.pickActive]} numberOfLines={1}>
                                    {s.title}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity onPress={() => setShowInternals((v) => !v)} activeOpacity={0.6} style={styles.disclosure}>
                        <Text style={styles.disclosureText}>{showInternals ? '▾' : '▸'} Engine internals</Text>
                    </TouchableOpacity>

                    {showInternals && (
                        <View style={styles.card}>
                            <Internal label="status" value={state.status} />
                            <Internal label="anchor" value={state.anchor ? fmtSet(state.anchor.weight, state.anchor.reps) : '—'} />
                            <Internal label="anchor score (capped e1RM)" value={state.anchor ? score(state.anchor.weight, state.anchor.reps, options).toFixed(2) : '—'} />
                            <Internal label="held previous session" value={state.heldPrevSession ? 'yes' : 'no'} />
                            <Internal label="suggestion" value={state.goal ? fmtSet(state.goal.weight, state.goal.reps) : '—'} />
                            {gradedToday.map(({ log, reason }, i) => (
                                <Internal key={i} label={`today ${fmtSet(log.weight, log.reps)} → score`} value={`${score(log.weight, log.reps, options).toFixed(2)}  ·  ${reason}`} />
                            ))}
                            <View style={styles.internalDivider} />
                            <View style={styles.toggleRow}>
                                <Toggle label="lbs" active={unit === 'lbs'} onPress={() => setUnit('lbs')} />
                                <Toggle label="kg" active={unit === 'kg'} onPress={() => setUnit('kg')} />
                                <Toggle label="Compound" active={isCompound} onPress={() => setIsCompound(true)} />
                                <Toggle label="Isolation" active={!isCompound} onPress={() => setIsCompound(false)} />
                                <Toggle label="Barbell" active={equipment === 'Barbell'} onPress={() => setEquipment('Barbell')} />
                                <Toggle label="Bodyweight" active={equipment === 'Bodyweight'} onPress={() => setEquipment('Bodyweight')} />
                            </View>
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    )
}

// One label/value line in the collapsed internals panel.
function Internal({ label, value }: { label: string; value: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.gradeRow}>
            <Text style={styles.internalLabel}>{label}</Text>
            <Text style={styles.internalValue}>{value}</Text>
        </View>
    )
}

// Small on/off chip for the internals panel's option switches.
function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.toggle, active && { backgroundColor: colors.workout, borderColor: colors.workout }]}>
            <Text style={[styles.toggleText, { color: active ? '#FFF' : colors.textSecondary }]}>{label}</Text>
        </TouchableOpacity>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 16,
            paddingBottom: 60,
        },
        topBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 8,
        },
        modeSwitch: {
            flexDirection: 'row',
            gap: 6,
            flexShrink: 1,
        },
        modeButton: {
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
        },
        modeText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
        },
        themeButton: {
            paddingVertical: 8,
            paddingHorizontal: 12,
        },
        themeText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.textMuted,
        },
        scenarioTitle: {
            fontFamily: fonts.semibold,
            fontSize: 17,
            color: colors.text,
            marginBottom: 2,
        },
        hint: {
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.textMuted,
            marginBottom: 14,
        },
        suggestCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingVertical: 24,
            paddingHorizontal: 20,
            alignItems: 'center',
        },
        cardEyebrow: {
            fontFamily: fonts.semibold,
            fontSize: 11,
            letterSpacing: 1.2,
            color: colors.labelMuted,
            marginBottom: 8,
        },
        cardEyebrowHit: {
            fontFamily: fonts.semibold,
            fontSize: 11,
            letterSpacing: 1.2,
            color: colors.workout,
            marginBottom: 8,
        },
        cardBig: {
            fontFamily: fonts.semibold,
            fontSize: 36,
            color: colors.text,
            marginBottom: 10,
        },
        cardSub: {
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        cardSubStrong: {
            fontFamily: fonts.semibold,
            color: colors.text,
        },
        cardNext: {
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 10,
        },
        cardCalibration: {
            fontFamily: fonts.regular,
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        why: {
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 10,
            paddingHorizontal: 12,
        },
        sectionTitle: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginTop: 22,
            marginBottom: 8,
            marginLeft: 2,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: 16,
            paddingVertical: 4,
        },
        logRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        times: {
            fontFamily: fonts.regular,
            fontSize: 16,
            color: colors.textMuted,
        },
        input: {
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            fontFamily: fonts.semibold,
            textAlign: 'center',
        },
        primaryButton: {
            backgroundColor: colors.workout,
            borderRadius: radius.card,
            paddingVertical: 13,
            paddingHorizontal: 20,
        },
        primaryButtonText: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: '#FFF',
        },
        actionRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 10,
        },
        secondaryButton: {
            paddingVertical: 9,
            paddingHorizontal: 14,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
        },
        secondaryButtonText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.textSecondary,
        },
        gradeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 11,
            gap: 12,
        },
        gradeSet: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.text,
        },
        gradeVerdict: {
            fontFamily: fonts.regular,
            fontSize: 13,
            flexShrink: 1,
            textAlign: 'right',
        },
        journalRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 11,
            gap: 12,
        },
        journalDay: {
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.textMuted,
            width: 92,
        },
        journalSet: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.text,
            flex: 1,
        },
        emptyText: {
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.textMuted,
            paddingVertical: 12,
        },
        removeButton: {
            paddingHorizontal: 6,
            paddingVertical: 4,
        },
        removeText: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: colors.textMuted,
        },
        pickRow: {
            paddingVertical: 11,
        },
        pickTitle: {
            fontFamily: fonts.regular,
            fontSize: 14,
            color: colors.textSecondary,
        },
        pickActive: {
            fontFamily: fonts.semibold,
            color: colors.text,
        },
        checkRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 11,
            gap: 12,
        },
        checkMark: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            width: 16,
        },
        checkBody: {
            flex: 1,
        },
        checkTitle: {
            fontFamily: fonts.regular,
            fontSize: 14,
            color: colors.text,
        },
        checkDetail: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.destructive,
            marginTop: 2,
        },
        disclosure: {
            marginTop: 22,
            marginBottom: 8,
            paddingVertical: 6,
        },
        disclosureText: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
        },
        internalLabel: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.textMuted,
            flexShrink: 1,
        },
        internalValue: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.textSecondary,
        },
        internalDivider: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.hairline,
            marginVertical: 8,
        },
        toggleRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            paddingVertical: 8,
        },
        toggle: {
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        toggleText: {
            fontFamily: fonts.semibold,
            fontSize: 12,
        },
        good: {
            color: colors.workout,
        },
        warn: {
            color: colors.textMuted,
        },
        bad: {
            color: colors.destructive,
        },
    })
}
