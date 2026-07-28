import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { applyProgression, REP_CAP, REP_RESET, type DailyGoal, type ProgressionOptions } from '@/context/WorkoutContext/functions/progressionFunctions'
import { useMemo, useState, type ComponentType } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'
import type { ProgressIndicatorData, ProgressState } from './ProgressIndicatorVariants'
import {
    InlineAccentNumbers,
    InlineBare,
    InlineCentered,
    InlineDot,
    InlineIconOnly,
    InlineInsetFill,
    InlineMicroCaps,
    InlineTopRule,
    InlineTrailingPreview,
} from './ProgressInlineVariants'

/**
 * Second-round bench: riffs on the inline row after it won the first pass on minimalism.
 * Slot 0 is the version that won, so each riff is judged against it rather than in a vacuum.
 */

type ScenarioKey = 'mid' | 'cap' | 'heavy' | 'redirect' | 'bodyweight' | 'metric'

const SCENARIOS: Record<ScenarioKey, { goal: DailyGoal; options: ProgressionOptions }> = {
    mid: { goal: { weight: 190, reps: 8 }, options: { weightUnit: 'lbs' } },
    cap: { goal: { weight: 185, reps: REP_CAP }, options: { weightUnit: 'lbs' } },
    heavy: { goal: { weight: 225, reps: 9 }, options: { weightUnit: 'lbs' } },
    redirect: { goal: { weight: 190, reps: 6 }, options: { weightUnit: 'lbs' } },
    bodyweight: { goal: { weight: 0, reps: 11 }, options: { weightUnit: 'lbs' } },
    metric: { goal: { weight: 60, reps: 10 }, options: { weightUnit: 'kg' } },
}

const STATES: { label: string; value: ProgressState }[] = [
    { label: 'Suggested', value: 'suggested' },
    { label: 'Goal hit', value: 'hit' },
    { label: 'Preview', value: 'preview' },
    { label: 'New', value: 'calibrationNew' },
    { label: 'Returning', value: 'calibrationReturn' },
]

const VARIANTS: { name: string; Comp: ComponentType<ProgressIndicatorData> }[] = [
    { name: '0 · Inset fill (round-1 pick)', Comp: InlineInsetFill },
    { name: '1 · Bare — no container', Comp: InlineBare },
    { name: '2 · Top rule — hairline, no fill', Comp: InlineTopRule },
    { name: '3 · Accent dot — color off the text', Comp: InlineDot },
    { name: '4 · Icon only — no label words', Comp: InlineIconOnly },
    { name: '5 · Micro-caps label', Comp: InlineMicroCaps },
    { name: '6 · Accent numerals', Comp: InlineAccentNumbers },
    { name: '7 · Trailing preview — target + look-ahead', Comp: InlineTrailingPreview },
    { name: '8 · Centered — keeps today’s alignment', Comp: InlineCentered },
]

export default function ProgressInlineTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('mid')
    const [state, setState] = useState<ProgressState>('suggested')
    const [dense, setDense] = useState<'spaced' | 'dense'>('spaced')

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
            <Field label="Stage width">
                <Segmented
                    value={dense}
                    onChange={(v) => setDense(v as 'spaced' | 'dense')}
                    options={[
                        { label: 'Modal padding (24)', value: 'spaced' },
                        { label: 'Full bleed', value: 'dense' },
                    ]}
                />
            </Field>

            <Text style={styles.readout}>
                goal {goal.weight || 'BW'} × {goal.reps} → next {next.weight || 'BW'} × {next.reps}
            </Text>

            {VARIANTS.map(({ name, Comp }) => (
                <View key={name} style={styles.slot}>
                    <Text style={styles.slotLabel}>{name}</Text>
                    <View style={[styles.stage, dense === 'dense' && styles.stageDense]}>
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
            marginTop: 18,
        },
        slotLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 8,
            marginLeft: 2,
        },
        // Mirrors the logsModal surface + horizontal padding the indicator sits inside.
        stage: {
            paddingVertical: 16,
            paddingHorizontal: 24,
            backgroundColor: colors.background,
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        stageDense: {
            paddingHorizontal: 8,
        },
    })
}
