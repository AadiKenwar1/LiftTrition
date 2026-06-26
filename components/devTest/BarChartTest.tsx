import BarChart from '@/components/GraphComponents/BarChart'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Field, Segmented } from './DevControls'

type DataKey = 'normal' | 'allZero' | 'aboveGoal' | 'single'
type GoalKey = 'off' | 'in' | 'below'
type TodayKey = 'none' | 'thu' | 'sun'

const WEEK = (vals: number[]) => ['S', 'M', 'T', 'W', 'Th', 'F', 'S'].map((day, i) => ({ day, value: vals[i] ?? 0 }))

const DATASETS: Record<DataKey, { day: string; value: number }[]> = {
    normal: WEEK([0, 12, 16, 0, 14, 10, 0]),
    allZero: WEEK([0, 0, 0, 0, 0, 0, 0]),
    aboveGoal: WEEK([0, 12, 16, 0, 30, 10, 0]),
    single: WEEK([0, 0, 0, 0, 18, 0, 0]),
}

const GOALS: Record<GoalKey, number | undefined> = { off: undefined, in: 14, below: 6 }
const TODAY: Record<TodayKey, number> = { none: -1, thu: 4, sun: 0 }

export default function BarChartTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [dataKey, setDataKey] = useState<DataKey>('normal')
    const [goalKey, setGoalKey] = useState<GoalKey>('off')
    const [mode, setMode] = useState(true)
    const [todayKey, setTodayKey] = useState<TodayKey>('none')

    const data = DATASETS[dataKey]

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Data">
                <Segmented
                    value={dataKey}
                    onChange={setDataKey}
                    options={[
                        { label: 'Normal', value: 'normal' },
                        { label: 'All zero', value: 'allZero' },
                        { label: 'Bar > goal', value: 'aboveGoal' },
                        { label: 'Single day', value: 'single' },
                    ]}
                />
            </Field>
            <Field label="Goal">
                <Segmented value={goalKey} onChange={setGoalKey} options={[{ label: 'Off', value: 'off' }, { label: 'In range', value: 'in' }, { label: 'Below', value: 'below' }]} />
            </Field>
            <Field label="Mode">
                <Segmented value={mode ? 'lift' : 'nutrition'} onChange={(v) => setMode(v === 'lift')} options={[{ label: 'Lift', value: 'lift' }, { label: 'Nutrition', value: 'nutrition' }]} />
            </Field>
            <Field label="Today (highlight)">
                <Segmented value={todayKey} onChange={setTodayKey} options={[{ label: 'None', value: 'none' }, { label: 'Thu (logged)', value: 'thu' }, { label: 'Sun (empty)', value: 'sun' }]} />
            </Field>

            <View style={styles.chartCard}>
                <BarChart
                    key={`${dataKey}-${goalKey}-${mode}-${todayKey}`}
                    mode={mode}
                    data={data}
                    goal={GOALS[goalKey]}
                    formatValue={(n) => `${Math.round(n)}`}
                    showXLabels
                    highlightIndex={TODAY[todayKey]}
                />
            </View>
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
            paddingBottom: 60,
        },
        chartCard: {
            height: 320,
            marginTop: 8,
            padding: 12,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
    })
}
