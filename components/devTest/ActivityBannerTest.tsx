import type { NutritionStreakState } from '@/context/NutritionContext/types'
import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useMemo, useState, type ComponentType } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import ActivityBanner from '@/components/GraphComponents/ActivityBanner'
import { VariantBigNumber, VariantMinimal, VariantSlim, VariantWeekDots, type BannerData } from './ActivityBannerVariants'
import { Field, Segmented } from './DevControls'

type TrainedKey = 'none' | 'few' | 'most' | 'all'
type StreakKey = 'none' | 'yesterday' | 'today1' | 'today12'

const TRAINED: Record<TrainedKey, boolean[]> = {
    none: [false, false, false, false, false, false, false],
    few: [true, false, true, false, false, false, false],
    most: [true, true, true, false, true, true, false],
    all: [true, true, true, true, true, true, true],
}

const STREAK: Record<StreakKey, NutritionStreakState> = {
    none: { loggedToday: false, streakIncludingToday: 0, streakThroughYesterday: 0 },
    yesterday: { loggedToday: false, streakIncludingToday: 0, streakThroughYesterday: 3 },
    today1: { loggedToday: true, streakIncludingToday: 1, streakThroughYesterday: 0 },
    today12: { loggedToday: true, streakIncludingToday: 12, streakThroughYesterday: 11 },
}

const VARIANTS: { name: string; Comp: ComponentType<BannerData> }[] = [
    { name: 'Current (shipping)', Comp: ActivityBanner },
    { name: '1 · Minimal line', Comp: VariantMinimal },
    { name: '2 · Slim pill', Comp: VariantSlim },
    { name: '3 · Week dots', Comp: VariantWeekDots },
    { name: '4 · Big number', Comp: VariantBigNumber },
]

export default function ActivityBannerTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [mode, setMode] = useState(true)
    const [trainedKey, setTrainedKey] = useState<TrainedKey>('most')
    const [streakKey, setStreakKey] = useState<StreakKey>('today12')

    const data: BannerData = { mode, trainedDays: TRAINED[trainedKey], nutritionStreak: STREAK[streakKey] }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            <Field label="Mode">
                <Segmented value={mode ? 'lift' : 'nutrition'} onChange={(v) => setMode(v === 'lift')} options={[{ label: 'Workout', value: 'lift' }, { label: 'Nutrition', value: 'nutrition' }]} />
            </Field>
            <Field label="Workout — trained days">
                <Segmented value={trainedKey} onChange={setTrainedKey} options={[{ label: 'None', value: 'none' }, { label: 'Few (2)', value: 'few' }, { label: 'Most (5)', value: 'most' }, { label: 'All (7)', value: 'all' }]} />
            </Field>
            <Field label="Nutrition — streak">
                <Segmented value={streakKey} onChange={setStreakKey} options={[{ label: 'None', value: 'none' }, { label: 'Yest. (3)', value: 'yesterday' }, { label: 'Today (1)', value: 'today1' }, { label: 'Today (12)', value: 'today12' }]} />
            </Field>

            {VARIANTS.map(({ name, Comp }) => (
                <View key={name} style={styles.slot}>
                    <Text style={styles.slotLabel}>{name}</Text>
                    <Comp {...data} />
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
    })
}
