import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { applyProgression, type DailyGoal, type ProgressionOptions } from '@/context/WorkoutContext/functions/progressionFunctions'
import { useMemo, useState, type ComponentType } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'
import { VariantChipGhost, VariantColdStart, VariantRepLadder, VariantRevealSwap, VariantStackedLines, VariantTwoCells, type SuggestSetData } from './SuggestSetVariants'

type ScenarioKey = 'mid' | 'cap' | 'heavy' | 'bodyweight'

const SCENARIOS: Record<ScenarioKey, { today: DailyGoal; options: ProgressionOptions }> = {
    mid: { today: { weight: 100, reps: 10 }, options: { weightUnit: 'lbs', isCompound: true } },
    cap: { today: { weight: 100, reps: 12 }, options: { weightUnit: 'lbs', isCompound: true } },
    heavy: { today: { weight: 225, reps: 9 }, options: { weightUnit: 'lbs', isCompound: true } },
    bodyweight: { today: { weight: 0, reps: 12 }, options: { weightUnit: 'lbs', isCompound: false } },
}

const VARIANTS: { name: string; Comp: ComponentType<SuggestSetData> }[] = [
    { name: '1 · Stacked lines', Comp: VariantStackedLines },
    { name: '2 · Chip → ghost chip', Comp: VariantChipGhost },
    { name: '3 · Rep ladder', Comp: VariantRepLadder },
    { name: '4 · Reveal after hit', Comp: VariantRevealSwap },
    { name: '5 · Two cells', Comp: VariantTwoCells },
    { name: '6 · Cold start (before = no logs, hit = first set logged, next day = day after)', Comp: VariantColdStart },
]

export default function SuggestSetTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('mid')
    const [stateKey, setStateKey] = useState<'before' | 'hit' | 'nextDay'>('before')

    const { today: base, options } = SCENARIOS[scenarioKey]
    const dayRolled = stateKey === 'nextDay'
    const today = dayRolled ? applyProgression(base.weight, base.reps, options) : base
    const next = applyProgression(today.weight, today.reps, options)
    const increment = options.isCompound ? 5 : 2.5
    const data: SuggestSetData = { today, next, weightUnit: options.weightUnit, increment, goalHit: stateKey === 'hit', dayRolled }

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
                    onChange={setScenarioKey}
                    options={[
                        { label: 'Mid ladder', value: 'mid' },
                        { label: 'At cap (+wt)', value: 'cap' },
                        { label: 'Heavy', value: 'heavy' },
                        { label: 'Bodyweight', value: 'bodyweight' },
                    ]}
                />
            </Field>
            <Field label="State">
                <Segmented
                    value={stateKey}
                    onChange={setStateKey}
                    options={[
                        { label: 'Before', value: 'before' },
                        { label: 'Goal hit', value: 'hit' },
                        { label: 'Next day', value: 'nextDay' },
                    ]}
                />
            </Field>

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
