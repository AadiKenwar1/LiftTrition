import Graph1 from '@/components/GraphComponents/Graph1'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { getGraphChartNote } from '@/lib/utils/graphChartNote'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

type DataKey = 'normal' | 'one' | 'two' | 'flat' | 'big' | 'empty'
type GoalKey = 'off' | 'in' | 'below' | 'above'

const DATASETS: Record<DataKey, { day: string; value: number }[]> = {
    normal: [
        { day: '6/1', value: 182 },
        { day: '6/3', value: 185 },
        { day: '6/6', value: 184 },
        { day: '6/9', value: 188 },
        { day: '6/12', value: 190 },
        { day: '6/15', value: 189 },
        { day: '6/18', value: 193 },
    ],
    one: [{ day: '6/18', value: 188 }],
    two: [
        { day: '6/12', value: 185 },
        { day: '6/18', value: 191 },
    ],
    flat: [
        { day: '6/1', value: 185 },
        { day: '6/4', value: 185 },
        { day: '6/7', value: 185 },
        { day: '6/10', value: 185 },
        { day: '6/13', value: 185 },
        { day: '6/16', value: 185 },
        { day: '6/18', value: 185 },
    ],
    big: [
        { day: '6/1', value: 315 },
        { day: '6/4', value: 330 },
        { day: '6/7', value: 325 },
        { day: '6/10', value: 345 },
        { day: '6/13', value: 360 },
        { day: '6/16', value: 355 },
        { day: '6/18', value: 378 },
    ],
    empty: [],
}

function goalFor(data: { value: number }[], key: GoalKey): number | undefined {
    if (key === 'off' || data.length === 0) return undefined
    const vals = data.map((d) => d.value)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const span = Math.max(1, max - min)
    if (key === 'in') return Math.round((min + max) / 2)
    if (key === 'below') return Math.round(min - span * 0.6 - 5)
    return Math.round(max + span * 0.6 + 5) // above
}

export default function LineChartTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [dataKey, setDataKey] = useState<DataKey>('normal')
    const [goalKey, setGoalKey] = useState<GoalKey>('off')
    const [mode, setMode] = useState(true)
    const [range, setRange] = useState<7 | 14 | 21>(7)

    const data = DATASETS[dataKey]
    const goal = goalFor(data, goalKey)

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Data">
                <Segmented
                    value={dataKey}
                    onChange={setDataKey}
                    options={[
                        { label: 'Normal', value: 'normal' },
                        { label: '1 point', value: 'one' },
                        { label: '2 points', value: 'two' },
                        { label: 'Flat', value: 'flat' },
                        { label: 'Big #s', value: 'big' },
                        { label: 'Empty', value: 'empty' },
                    ]}
                />
            </Field>
            <Field label="Goal">
                <Segmented
                    value={goalKey}
                    onChange={setGoalKey}
                    options={[
                        { label: 'Off', value: 'off' },
                        { label: 'In range', value: 'in' },
                        { label: 'Far below', value: 'below' },
                        { label: 'Far above', value: 'above' },
                    ]}
                />
            </Field>
            <Field label="Mode">
                <Segmented value={mode ? 'lift' : 'nutrition'} onChange={(v) => setMode(v === 'lift')} options={[{ label: 'Lift', value: 'lift' }, { label: 'Nutrition', value: 'nutrition' }]} />
            </Field>
            <Field label="Range">
                <Segmented value={range} onChange={setRange} options={[{ label: '7', value: 7 }, { label: '14', value: 14 }, { label: '21', value: 21 }]} />
            </Field>

            <View style={styles.chartCard}>
                {data.length === 0 ?
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>Empty dataset — Progress shows its empty state instead of the chart.</Text>
                    </View>
                :   <Graph1
                        key={`${dataKey}-${goalKey}-${mode}-${range}`}
                        mode={mode}
                        data={data}
                        selectedRange={range}
                        goal={goal}
                        chartNote={getGraphChartNote(mode ? 'strength' : 'bodyweight', range)}
                        formatValue={(n) => `${Math.round(n)}`}
                    />
                }
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
        empty: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
        },
        emptyText: {
            fontFamily: fonts.regular,
            fontSize: 14,
            color: colors.labelMuted,
            textAlign: 'center',
        },
    })
}
