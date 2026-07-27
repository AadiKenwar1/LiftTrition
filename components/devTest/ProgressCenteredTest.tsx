import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { applyProgression, REP_CAP, REP_RESET, type DailyGoal, type ProgressionOptions } from '@/context/WorkoutContext/functions/progressionFunctions'
import { useMemo, useState, type ComponentType } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import {
    CenteredAccentNumbers,
    CenteredDot,
    CenteredLabelColor,
    CenteredMerged,
    CenteredNumbersFirst,
    CenteredPlateBalancedAlpha,
    CenteredPlateInset,
    CenteredPlateSurface,
    CenteredPlateTunedFills,
    CenteredTintedPlate,
    CenteredUnderline,
    CenteredWeightForward,
} from './ProgressCenteredVariants'
import { Field, Segmented } from './DevControls'
import type { ProgressIndicatorData, ProgressState } from './ProgressIndicatorVariants'

/**
 * Round 3 — centered layout (round-2 pick), no checkmarks. Each riff answers the same open
 * question differently: how loudly should a hit goal differ from a plain next-session preview,
 * given both show the same next target? Riff 4 argues they shouldn't differ at all.
 */

type ScenarioKey = 'mid' | 'cap' | 'heavy' | 'redirect' | 'bodyweight' | 'metric'

const SCENARIOS: Record<ScenarioKey, { goal: DailyGoal; options: ProgressionOptions }> = {
    mid: { goal: { weight: 190, reps: 8 }, options: { weightUnit: 'lbs', isCompound: true } },
    cap: { goal: { weight: 185, reps: REP_CAP }, options: { weightUnit: 'lbs', isCompound: true } },
    heavy: { goal: { weight: 225, reps: 9 }, options: { weightUnit: 'lbs', isCompound: true } },
    redirect: { goal: { weight: 190, reps: 6 }, options: { weightUnit: 'lbs', isCompound: true } },
    bodyweight: { goal: { weight: 0, reps: 11 }, options: { weightUnit: 'lbs', isCompound: false } },
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
    { name: '0 · Label color only (round-2 pick, check removed)', Comp: CenteredLabelColor },
    { name: '1 · Accent numerals — numbers carry the state', Comp: CenteredAccentNumbers },
    { name: '2 · Underline rule under the numbers', Comp: CenteredUnderline },
    { name: '3 · Leading dot — color off the type', Comp: CenteredDot },
    { name: '4 · Merged — a hit looks like any look-ahead', Comp: CenteredMerged },
    { name: '5 · Tinted plate — numbers on a soft wash', Comp: CenteredTintedPlate },
    { name: '6 · Numbers first — state word demoted below', Comp: CenteredNumbersFirst },
    { name: '7 · Weight-forward — weight dominates', Comp: CenteredWeightForward },
    { name: '8 · Plate — light alpha raised to match dark', Comp: CenteredPlateBalancedAlpha },
    { name: '9 · Plate — per-theme tuned fills', Comp: CenteredPlateTunedFills },
    { name: '10 · Plate — solid inset, accent on the numbers', Comp: CenteredPlateInset },
    { name: '11 · Plate — normal card surface', Comp: CenteredPlateSurface },
]

export default function ProgressCenteredTest() {
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
            <Text style={styles.hint}>Toggle Goal hit ⇄ Preview to see how far apart each riff pushes them.</Text>

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
        hint: {
            fontFamily: fonts.medium,
            fontSize: 11,
            color: colors.textFaint,
            marginTop: 3,
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
        // Mirrors the logsModal surface the indicator sits on — plain page background, no frame,
        // so each riff is judged against exactly what it will sit on in the real modal.
        stage: {
            paddingVertical: 16,
            paddingHorizontal: 24,
            backgroundColor: colors.background,
            borderRadius: 12,
        },
    })
}
