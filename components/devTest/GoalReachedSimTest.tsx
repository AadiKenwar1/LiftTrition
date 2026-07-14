import GoalReachedBanner from '@/components/NutritionComponents/GoalReachedBanner'
import GoalReachedPrompt from '@/components/NutritionComponents/GoalReachedPrompt'
import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { parseNumericInput } from '@/lib/utils/number'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'
import {
    applyAcceptRecalc,
    applyHandTuneMacros,
    applyKeepGoing,
    applySwitchToMaintenance,
    applyWeighIn,
    initSimState,
    isGoalReached,
    OVERSHOOT_DEADBAND,
    unitLabel,
    type PromptKind,
    type SimState,
    type WeighInOutcome,
} from './goalReachedLogic'

/**
 * Issue 8 — interactive sandbox for the weigh-in decision rules. Pick a scenario, then step
 * the scale with the ± buttons and watch: the weight track shows the goal + deadband zones,
 * crossings ask via the real prompt, the safety net acts, and the event log narrates every
 * decision. Custom setup lives at the bottom.
 */
type SimInit = Parameters<typeof initSimState>[0]

const SCENARIOS: { key: string; label: string; init: SimInit }[] = [
    { key: 'cutAbove', label: 'Cut — above goal', init: { unitSystem: 'imperial', goalType: 'lose', goalWeight: 170, goalPace: 1, bodyWeight: 175 } },
    { key: 'cutNear', label: 'Cut — near goal', init: { unitSystem: 'imperial', goalType: 'lose', goalWeight: 170, goalPace: 1, bodyWeight: 170.4 } },
    { key: 'bulkNear', label: 'Bulk — near goal', init: { unitSystem: 'imperial', goalType: 'gain', goalWeight: 170, goalPace: 0.5, bodyWeight: 169.6 } },
    { key: 'maintain', label: 'Maintain', init: { unitSystem: 'imperial', goalType: 'maintain', goalWeight: 170, goalPace: 0.5, bodyWeight: 170 } },
    { key: 'metricCut', label: 'Cut (kg)', init: { unitSystem: 'metric', goalType: 'lose', goalWeight: 77, goalPace: 0.5, bodyWeight: 79 } },
]

const QUICK_STEPS = [-1, -0.5, 0.5, 1]
const DECISION_LINE = /Safety net|Crossed|Keep Going|Switch to Maintenance/

const GOAL_DESCRIPTION = { lose: 'Losing', gain: 'Gaining', maintain: 'Maintaining' } as const

export default function GoalReachedSimTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    const [scenarioKey, setScenarioKey] = useState('cutAbove')
    const [setupGoalType, setSetupGoalType] = useState<SimState['goalType']>('lose')
    const [setupUnit, setSetupUnit] = useState<SimState['unitSystem']>('imperial')
    const [setupPace, setSetupPace] = useState(1)
    const [setupStart, setSetupStart] = useState('175')
    const [setupGoal, setSetupGoal] = useState('170')

    const [sim, setSim] = useState<SimState>(() => initSimState(SCENARIOS[0].init))
    const [log, setLog] = useState<string[]>([])
    const [prompt, setPrompt] = useState<PromptKind | null>(null)
    const [weighInput, setWeighInput] = useState('')

    const unit = unitLabel(sim)
    const deadband = OVERSHOOT_DEADBAND[sim.unitSystem]
    const parsedWeighIn = parseNumericInput(weighInput)

    const pushEvents = (events: string[]) => setLog((l) => [...events, ...l])
    const runOutcome = (outcome: WeighInOutcome) => {
        setSim(outcome.state)
        pushEvents(outcome.events)
        if (outcome.prompt) setPrompt(outcome.prompt)
    }

    const startFresh = (init: SimInit) => {
        const fresh = initSimState(init)
        setSim(fresh)
        setPrompt(null)
        setWeighInput('')
        setLog([`Simulation reset — ${fresh.goalType}${fresh.goalType !== 'maintain' ? ` @ ${fresh.goalPace} ${unitLabel(fresh)}/wk` : ''}, ${fresh.bodyWeight} → goal ${fresh.goalWeight} ${unitLabel(fresh)} · targets ${fresh.calorieGoal} kcal`])
    }

    const pickScenario = (key: string) => {
        const scenario = SCENARIOS.find((s) => s.key === key)
        if (!scenario) return
        setScenarioKey(key)
        setSetupGoalType(scenario.init.goalType)
        setSetupUnit(scenario.init.unitSystem)
        setSetupPace(scenario.init.goalPace)
        setSetupStart(String(scenario.init.bodyWeight))
        setSetupGoal(String(scenario.init.goalWeight))
        startFresh(scenario.init)
    }

    const applyCustomSetup = () => {
        const start = parseNumericInput(setupStart)
        const goal = parseNumericInput(setupGoal)
        if (start === null || goal === null || start <= 0 || goal <= 0) return
        setScenarioKey('custom')
        startFresh({ unitSystem: setupUnit, goalType: setupGoalType, goalWeight: goal, goalPace: setupPace, bodyWeight: start })
    }

    const logWeighIn = (weight: number) => {
        runOutcome(applyWeighIn(sim, Math.round(weight * 10) / 10))
        setWeighInput('')
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>

            <Field label="Scenario (tap to reset into it)">
                <Segmented value={scenarioKey} onChange={pickScenario} options={SCENARIOS.map((s) => ({ label: s.label, value: s.key }))} />
            </Field>
            <Text style={styles.hint}>Pick a scenario, then step the scale below. Custom setup is at the bottom.</Text>

            <View style={styles.stateCard}>
                {isGoalReached(sim) && <GoalReachedBanner onPress={() => pushEvents(['Banner tapped → adjustNutrition wizard (not part of this sandbox)'])} />}
                <View style={styles.weightRow}>
                    <Text style={styles.weightBig}>
                        {sim.bodyWeight} <Text style={styles.weightUnit}>{unit}</Text>
                    </Text>
                    <Text style={styles.goalSmall}>goal {sim.goalWeight} {unit}</Text>
                </View>
                <Text style={styles.stateLine}>
                    {GOAL_DESCRIPTION[sim.goalType]}{sim.goalType !== 'maintain' ? ` @ ${sim.goalPace} ${unit}/wk` : ''} · targets <Text style={styles.stateStrong}>{sim.calorieGoal} kcal</Text> · P{sim.proteinGoal} C{sim.carbsGoal} F{sim.fatsGoal}
                </Text>

                <WeightTrack sim={sim} />
                <Text style={styles.hint}>
                    {sim.goalType === 'maintain'
                        ? 'Maintaining — weigh-ins update targets only; nothing ever flips your goal.'
                        : `Light green = goal reached (asks) · dark green = ${deadband} ${unit} past goal (auto-maintain acts)`}
                </Text>

                {(sim.macrosCustomized || sim.goalOvershootAcknowledged) && (
                    <View style={styles.chipRow}>
                        {sim.macrosCustomized && <Text style={styles.flagChip}>Hand-tuned macros — protected</Text>}
                        {sim.goalOvershootAcknowledged && <Text style={styles.flagChip}>Keep Going — auto-switch off</Text>}
                    </View>
                )}
            </View>

            <Text style={styles.sectionLabel}>Step the scale</Text>
            <Field label="Quick weigh-ins (scale noise)">
                {QUICK_STEPS.map((d) => (
                    <TouchableOpacity key={d} style={styles.stepBtn} onPress={() => logWeighIn(sim.bodyWeight + d)} activeOpacity={0.7}>
                        <Text style={styles.stepBtnText}>{d > 0 ? `+${d}` : d}</Text>
                    </TouchableOpacity>
                ))}
            </Field>
            <Field label={`Or type a weight (${unit})`}>
                <TextInput style={styles.numInput} value={weighInput} onChangeText={setWeighInput} keyboardType="decimal-pad" placeholder={String(sim.bodyWeight)} placeholderTextColor={colors.placeholder} />
                <TouchableOpacity style={[styles.actionBtn, parsedWeighIn === null && styles.actionBtnDisabled]} onPress={() => parsedWeighIn !== null && logWeighIn(parsedWeighIn)} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>Log weigh-in</Text>
                </TouchableOpacity>
            </Field>
            <Field label="Macro edits">
                <TouchableOpacity style={styles.actionBtn} onPress={() => runOutcome(applyHandTuneMacros(sim))} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>Hand-tune macros</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => runOutcome(applyAcceptRecalc(sim))} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>Accept explicit recalc</Text>
                </TouchableOpacity>
            </Field>

            <View style={styles.logHeader}>
                <Text style={styles.sectionLabelInline}>Event log (newest first)</Text>
                {log.length > 0 && (
                    <TouchableOpacity onPress={() => setLog([])} activeOpacity={0.7}>
                        <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </View>
            {log.length === 0 && <Text style={styles.hint}>No events yet — step the scale above.</Text>}
            {log.map((line, i) => {
                const isHeader = line.startsWith('Weigh-in') || line.startsWith('Simulation reset')
                const isDecision = DECISION_LINE.test(line)
                return (
                    <Text key={`${log.length - i}-${line}`} style={[styles.logLine, isHeader && styles.logLineHeader, isDecision && styles.logLineDecision]}>
                        {isHeader ? line : `   ${line}`}
                    </Text>
                )
            })}

            <Text style={styles.sectionLabel}>Custom setup</Text>
            <Field label="Goal type">
                <Segmented value={setupGoalType} onChange={setSetupGoalType} options={[{ label: 'Lose', value: 'lose' }, { label: 'Gain', value: 'gain' }, { label: 'Maintain', value: 'maintain' }]} />
            </Field>
            <Field label="Units">
                <Segmented value={setupUnit} onChange={setSetupUnit} options={[{ label: 'Imperial (lb)', value: 'imperial' }, { label: 'Metric (kg)', value: 'metric' }]} />
            </Field>
            <Field label="Pace (per week)">
                <Segmented value={setupPace} onChange={setSetupPace} options={[{ label: '0.5', value: 0.5 }, { label: '1', value: 1 }, { label: '1.5', value: 1.5 }, { label: '2', value: 2 }]} />
            </Field>
            <Field label="Start weight / goal weight">
                <TextInput style={styles.numInput} value={setupStart} onChangeText={setSetupStart} keyboardType="decimal-pad" placeholder="175" placeholderTextColor={colors.placeholder} />
                <TextInput style={styles.numInput} value={setupGoal} onChangeText={setSetupGoal} keyboardType="decimal-pad" placeholder="170" placeholderTextColor={colors.placeholder} />
                <TouchableOpacity style={styles.actionBtn} onPress={applyCustomSetup} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>Apply & reset</Text>
                </TouchableOpacity>
            </Field>
            <Text style={styles.hint}>Profile behind the TDEE math: male, 28, {sim.unitSystem === 'imperial' ? `5'10"` : '178 cm'}, moderate activity.</Text>

            <GoalReachedPrompt
                visible={prompt !== null}
                variant={prompt ?? 'goalReached'}
                goalWeight={sim.goalWeight}
                unitLabel={unit}
                onSwitchToMaintenance={() => {
                    setPrompt(null)
                    runOutcome(applySwitchToMaintenance(sim))
                }}
                onSetNewGoal={() => {
                    setPrompt(null)
                    pushEvents(['User chose "Set a New Goal" → adjustNutrition wizard (not part of this sandbox)'])
                }}
                onKeepGoing={() => {
                    setPrompt(null)
                    runOutcome(applyKeepGoing(sim))
                }}
                onDismiss={() => {
                    setPrompt(null)
                    pushEvents(prompt === 'goalReached' ? ['Prompt dismissed → nothing changes; banner stays; safety net armed'] : ['Got It — already switched to maintenance'])
                }}
            />
        </ScrollView>
    )
}

/**
 * Weight number line: neutral track, goal + deadband markers, one accent dot for the current
 * weight. Zones are the same hue at two intensities (sequential emphasis): light = at/past
 * goal (prompt asks), dark = past the deadband (safety net acts). Weight increases left→right.
 */
function WeightTrack({ sim }: { sim: SimState }) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeTrackStyles(colors), [colors])

    const deadband = OVERSHOOT_DEADBAND[sim.unitSystem]
    const isLose = sim.goalType === 'lose'
    const edge = isLose ? sim.goalWeight - deadband : sim.goalWeight + deadband
    const points = sim.goalType === 'maintain' ? [sim.goalWeight, sim.bodyWeight] : [sim.goalWeight, edge, sim.bodyWeight]
    const lo = Math.min(...points) - deadband
    const hi = Math.max(...points) + deadband
    const pct = (v: number): `${number}%` => `${((v - lo) / (hi - lo)) * 100}%`
    const width = (a: number, b: number): `${number}%` => `${(Math.abs(b - a) / (hi - lo)) * 100}%`

    const askFill = colors.nutrition + (isDark ? '2E' : '3D')
    const actFill = colors.nutrition + (isDark ? '59' : '73')

    return (
        <View style={styles.wrap}>
            <View style={styles.trackArea}>
                <View style={styles.track}>
                    {sim.goalType !== 'maintain' && (
                        <>
                            <View style={[styles.zone, { backgroundColor: askFill, left: pct(Math.min(sim.goalWeight, edge)), width: width(sim.goalWeight, edge) }]} />
                            <View style={[styles.zone, { backgroundColor: actFill, left: isLose ? 0 : pct(edge), width: isLose ? pct(edge) : width(edge, hi) }]} />
                        </>
                    )}
                </View>
                {sim.goalType !== 'maintain' && <View style={[styles.marker, { left: pct(edge), backgroundColor: colors.labelMuted }]} />}
                <View style={[styles.marker, { left: pct(sim.goalWeight), backgroundColor: colors.text }]} />
                <View style={[styles.dot, { left: pct(sim.bodyWeight) }]} />
            </View>
            <View style={styles.labelRow}>
                {sim.goalType !== 'maintain' && (
                    <Text style={[styles.tickLabel, { left: pct(edge) }]} numberOfLines={1}>
                        {edge}
                    </Text>
                )}
                <Text style={[styles.tickLabel, styles.tickLabelStrong, { left: pct(sim.goalWeight) }]} numberOfLines={1}>
                    goal {sim.goalWeight}
                </Text>
            </View>
        </View>
    )
}

function makeTrackStyles(colors: Colors) {
    return StyleSheet.create({
        wrap: {
            marginTop: 10,
            marginBottom: 2,
        },
        trackArea: {
            height: 20,
            justifyContent: 'center',
        },
        track: {
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.ringTrack,
            overflow: 'hidden',
        },
        zone: {
            position: 'absolute',
            top: 0,
            bottom: 0,
        },
        marker: {
            position: 'absolute',
            top: 0,
            width: 2,
            height: 20,
            borderRadius: 1,
            marginLeft: -1,
        },
        dot: {
            position: 'absolute',
            top: 2,
            width: 16,
            height: 16,
            borderRadius: 8,
            marginLeft: -8,
            backgroundColor: colors.nutrition,
            borderWidth: 2,
            borderColor: colors.surface,
        },
        labelRow: {
            height: 16,
            marginTop: 3,
        },
        tickLabel: {
            position: 'absolute',
            width: 72,
            marginLeft: -36,
            textAlign: 'center',
            fontFamily: fonts.medium,
            fontSize: 10.5,
            color: colors.labelMuted,
        },
        tickLabelStrong: {
            fontFamily: fonts.bold,
            color: colors.text,
        },
    })
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 16,
            paddingBottom: 100,
        },
        sectionLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginTop: 20,
            marginBottom: 8,
            marginLeft: 2,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        sectionLabelInline: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        hint: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.labelMuted,
            lineHeight: 17,
            marginTop: 4,
            marginBottom: 4,
        },
        stateCard: {
            marginTop: 14,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 14,
        },
        weightRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
        },
        weightBig: {
            fontFamily: fonts.extrabold,
            fontSize: 28,
            color: colors.text,
            letterSpacing: -0.8,
        },
        weightUnit: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.textMuted,
            letterSpacing: 0,
        },
        goalSmall: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.textSecondary,
        },
        stateLine: {
            fontFamily: fonts.medium,
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 19,
            marginTop: 2,
        },
        stateStrong: {
            fontFamily: fonts.bold,
            color: colors.text,
        },
        chipRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 8,
        },
        flagChip: {
            fontFamily: fonts.semibold,
            fontSize: 11.5,
            color: colors.nutritionInk,
            backgroundColor: colors.nutrition + '1A',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: radius.chip,
            overflow: 'hidden',
        },
        stepBtn: {
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
        },
        stepBtnText: {
            fontFamily: fonts.bold,
            fontSize: 15,
            color: colors.text,
        },
        numInput: {
            minWidth: 76,
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.text,
        },
        actionBtn: {
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
            justifyContent: 'center',
        },
        actionBtnDisabled: {
            opacity: 0.4,
        },
        actionBtnText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.text,
        },
        logHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
            marginBottom: 8,
            marginLeft: 2,
        },
        clearText: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.textMuted,
        },
        logLine: {
            fontFamily: fonts.medium,
            fontSize: 12.5,
            color: colors.textSecondary,
            lineHeight: 19,
            marginBottom: 2,
        },
        logLineHeader: {
            fontFamily: fonts.bold,
            color: colors.text,
            marginTop: 6,
        },
        logLineDecision: {
            fontFamily: fonts.bold,
            color: colors.nutritionInk,
        },
    })
}
