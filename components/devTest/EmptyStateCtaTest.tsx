import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { BicepsFlexed, Dumbbell, Utensils } from 'lucide-react-native'
import { useMemo, useState, type ComponentType } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'
import { CompactSoftPill, DashedSlot, GhostRow, HintBaseline, IconTileCard, OutlinePill, PressableHero, SoftPill, SoftPillWithHint, SolidPill, type EmptyStateData } from './EmptyStateCtaVariants'

/**
 * Empty-state CTA lab — the three screens that currently tell the user to "Tap the ⋮ button",
 * rendered with a button that just does it instead.
 *
 * Judge each riff on the same question: does the button read as an invitation or as pressure?
 * The scenario switch matters as much as the riff — the workout and exercise empty states own the
 * whole screen, while the nutrition one sits below a filled Daily Intake card, so a loud CTA has
 * more competition there. The "Meals · past date" scenario is the degenerate case: nothing to add,
 * so every riff must fall back to plain informational copy without leaving a hole in the layout.
 */

type ScenarioKey = 'workouts' | 'exercises' | 'mealsToday' | 'mealsPast'

// Copy candidates per screen — the button label is the whole message, so it carries the verb.
const SCENARIOS: Record<ScenarioKey, Omit<EmptyStateData, 'accent' | 'gradient' | 'onPress'>> = {
    workouts: {
        kind: 'workouts',
        Icon: BicepsFlexed,
        title: 'No Workouts Yet',
        cta: 'Add your first workout',
        hintSubtitle: 'Tap the ⋮ button to create your first workout',
    },
    exercises: {
        kind: 'exercises',
        Icon: Dumbbell,
        title: 'No Exercises Yet',
        cta: 'Add your first exercise',
        hintSubtitle: 'Tap the ⋮ button to add your first exercise and start logging your sets',
    },
    mealsToday: {
        kind: 'meals',
        Icon: Utensils,
        title: 'No Nutrition Logs Yet',
        cta: 'Add your first meal',
        hintSubtitle: 'Tap the ⋮ button to add your first meal',
    },
    mealsPast: {
        kind: 'meals',
        Icon: Utensils,
        title: 'No Nutrition Logs Recorded',
        cta: null,
        fallbackSubtitle: 'No nutrition entries recorded for Mar 14',
        hintSubtitle: 'No nutrition entries recorded for Mar 14',
    },
}

const VARIANTS: { name: string; Comp: ComponentType<EmptyStateData> }[] = [
    { name: '0 · Baseline — the ⋮ instruction shipping today', Comp: HintBaseline },
    { name: '1 · Soft pill — accent wash, accent label', Comp: SoftPill },
    { name: '2 · Solid gradient — the app-wide primary CTA fill', Comp: SolidPill },
    { name: '3 · Outline pill — surface fill, accent edge', Comp: OutlinePill },
    { name: '4 · Ghost row — quiet full-width card + chevron', Comp: GhostRow },
    { name: '5 · Dashed slot — an empty place waiting to be filled', Comp: DashedSlot },
    { name: '6 · Pressable hero — the circle itself is the button', Comp: PressableHero },
    { name: '7 · Icon-tile card — matches the app card language', Comp: IconTileCard },
    { name: '8 · Compact — no hero circle, button carries the screen', Comp: CompactSoftPill },
    { name: '9 · Soft pill + ⋮ footnote — keeps the FAB discoverable', Comp: SoftPillWithHint },
]

export default function EmptyStateCtaTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('workouts')

    const scenario = SCENARIOS[scenarioKey]
    const isNutrition = scenario.kind === 'meals'

    const data: EmptyStateData = {
        ...scenario,
        accent: isNutrition ? colors.nutrition : colors.workout,
        gradient: isNutrition ? colors.nutritionGradient : colors.workoutGradient,
        onPress: () => Alert.alert('Pressed', `Would open the ${scenario.kind === 'meals' ? 'add nutrition' : `add ${scenario.kind.slice(0, -1)}`} modal.`),
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
            <Field label="Screen">
                <Segmented
                    value={scenarioKey}
                    onChange={(v) => setScenarioKey(v as ScenarioKey)}
                    options={[
                        { label: 'Workouts', value: 'workouts' },
                        { label: 'Exercises', value: 'exercises' },
                        { label: 'Meals · today', value: 'mealsToday' },
                        { label: 'Meals · past date', value: 'mealsPast' },
                    ]}
                />
            </Field>

            <Text style={styles.hint}>
                {scenario.cta ?
                    'Each riff replaces the ⋮ instruction with a button. Tapping one alerts instead of navigating.'
                :   'Nothing can be added to a past date — every riff falls back to informational copy here.'}
            </Text>

            {VARIANTS.map(({ name, Comp }) => (
                <View key={name} style={styles.slot}>
                    <Text style={styles.slotLabel}>{name}</Text>
                    {/* Plain page background and the real 40pt gutter — the riffs sit on nothing else in the app. */}
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
        hint: {
            fontFamily: fonts.medium,
            fontSize: 11,
            color: colors.textFaint,
            marginTop: 6,
            marginLeft: 2,
        },
        slot: {
            marginTop: 22,
        },
        slotLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 8,
            marginLeft: 2,
        },
        stage: {
            paddingVertical: 28,
            backgroundColor: colors.background,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
    })
}
