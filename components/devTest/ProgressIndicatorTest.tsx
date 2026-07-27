import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { applyProgression, REP_CAP, REP_RESET, type DailyGoal, type ProgressionOptions } from '@/context/WorkoutContext/functions/progressionFunctions'
import { useMemo, useState, type ComponentType } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'
import {
    VariantCurrent,
    VariantGradientBand,
    VariantInlineRow,
    VariantPill,
    VariantRepLadder,
    VariantSplitCells,
    VariantTargetCard,
    type ProgressIndicatorData,
    type ProgressState,
} from './ProgressIndicatorVariants'

/**
 * Design bench for the progression indicator (see audit/progressFixes.md, rev 16).
 * Variant 0 is what ships today, so every candidate is judged against the plain text line
 * it would replace. Pick a scenario + state and compare all candidates at once.
 */

type ScenarioKey = 'mid' | 'cap' | 'heavy' | 'redirect' | 'bodyweight' | 'metric'

const SCENARIOS: Record<ScenarioKey, { goal: DailyGoal; options: ProgressionOptions }> = {
    // Mid-ladder: the everyday case, climbing reps at a fixed weight.
    mid: { goal: { weight: 190, reps: 8 }, options: { weightUnit: 'lbs', isCompound: true } },
    // At the rep cap: hitting this goal triggers the weight jump (reps reset to 8).
    cap: { goal: { weight: 185, reps: REP_CAP }, options: { weightUnit: 'lbs', isCompound: true } },
    // Wide numbers, to check layout when the weight is three digits.
    heavy: { goal: { weight: 225, reps: 9 }, options: { weightUnit: 'lbs', isCompound: true } },
    // Post-redirect: a failed jump walked the goal below the reset (tests the sub-8 rep ladder).
    redirect: { goal: { weight: 190, reps: 6 }, options: { weightUnit: 'lbs', isCompound: true } },
    // Bodyweight: no external load, so the weight axis must not render a bare "0".
    bodyweight: { goal: { weight: 0, reps: 11 }, options: { weightUnit: 'lbs', isCompound: false } },
    // Metric isolation: 1.25 kg increments and a two-character unit.
    metric: { goal: { weight: 60, reps: 10 }, options: { weightUnit: 'kg', isCompound: false } },
}

const STATES: { label: string; value: ProgressState }[] = [
    { label: 'Suggested', value: 'suggested' },
    { label: 'Goal hit', value: 'hit' },
    { label: 'Preview', value: 'preview' },
    { label: 'New', value: 'calibrationNew' },
    { label: 'Returning', value: 'calibrationReturn' },
]

const VARIANTS: { name: string; Comp: ComponentType<ProgressIndicatorData> }[] = [
    { name: '0 · Current (ships today)', Comp: VariantCurrent },
    { name: '1 · Target card — accent rail + big numerals', Comp: VariantTargetCard },
    { name: '2 · Split cells — matches GraphStats language', Comp: VariantSplitCells },
    { name: '3 · Accent pill — lowest visual weight', Comp: VariantPill },
    { name: '4 · Rep ladder — position in the 8→12 cycle', Comp: VariantRepLadder },
    { name: '5 · Gradient band — highest emphasis', Comp: VariantGradientBand },
    { name: '6 · Inline row — compact, label left / numbers right', Comp: VariantInlineRow },
]

export default function ProgressIndicatorTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('mid')
    const [state, setState] = useState<ProgressState>('suggested')

    const { goal, options } = SCENARIOS[scenarioKey]
    const next = applyProgression(goal.weight, goal.reps, options)
    const data: ProgressIndicatorData = {
        state,
        goal,
        next,
        weightUnit: options.weightUnit,
        lastSession: { weight: 190, reps: 8, agoLabel: '6 weeks ago' },
        repReset: REP_RESET,
        repCap: REP_CAP,
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented
                    value={isDark ? 'dark' : 'light'}
                    onChange={(v) => setColorScheme(v as 'light' | 'dark')}
                    options={[
                        { label: 'Light', value: 'light' },
                        { label: 'Dark', value: 'dark' },
                    ]}
                />
            </Field>
            <Field label="Scenario">
                <Segmented
                    value={scenarioKey}
                    onChange={(v) => setScenarioKey(v as ScenarioKey)}
                    options={[
                        { label: 'Mid', value: 'mid' },
                        { label: 'At cap', value: 'cap' },
                        { label: 'Heavy', value: 'heavy' },
                        { label: 'Redirect', value: 'redirect' },
                        { label: 'Bodyweight', value: 'bodyweight' },
                        { label: 'kg', value: 'metric' },
                    ]}
                />
            </Field>
            <Field label="State">
                <Segmented value={state} onChange={(v) => setState(v as ProgressState)} options={STATES} />
            </Field>

            <Text style={styles.readout}>
                goal {goal.weight || 'BW'} × {goal.reps} → next {next.weight || 'BW'} × {next.reps}
            </Text>

            {VARIANTS.map(({ name, Comp }) => (
                <View key={name} style={styles.slot}>
                    <Text style={styles.slotLabel}>{name}</Text>
                    <View style={styles.stage}>
                        <Comp {...data} />
                    </View>
                </View>
            ))}
        </ScrollView>
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
            paddingBottom: 80,
        },
        readout: {
            fontFamily: fonts.medium,
            fontSize: 11,
            color: colors.textMuted,
            marginTop: 14,
            marginLeft: 2,
        },
        slot: {
            marginTop: 20,
        },
        slotLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 8,
            marginLeft: 2,
        },
        // Mirrors the logsModal surface the indicator sits on, so contrast reads true.
        stage: {
            paddingVertical: 16,
            paddingHorizontal: 24,
            backgroundColor: colors.background,
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
    })
}
