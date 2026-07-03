import Graph1 from '@/components/GraphComponents/Graph1'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { formatDateMinimal, getDateKey } from '@/lib/utils/dateHelper'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

type DataKey = 'normal' | 'one' | 'two' | 'flat' | 'big' | 'empty' | 'daily' | 'short'
type GoalKey = 'off' | 'in' | 'below' | 'above'

/**
 * Mirrors getBodyWeightProgressData output: one point per day ending today (real M/D day keys),
 * "weigh-ins" every ~3 days with the value carried forward between — the honest steppy shape.
 * Deterministic (sinusoid + slow cut drift) so scenarios look the same on every reload.
 */
function genDailyBodyWeight(days: number): { day: string; value: number }[] {
    const out: { day: string; value: number }[] = []
    const today = new Date()
    let logged = 190
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const age = days - 1 - i
        if (age % 3 === 0) {
            const drift = -0.04 * age
            const wiggle = Math.sin(age / 9) * 1.6 + Math.sin(age / 2.7) * 0.5
            logged = Math.round((190 + drift + wiggle) * 10) / 10
        }
        out.push({ day: formatDateMinimal(getDateKey(d)), value: logged })
    }
    return out
}

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
    // Dense daily series (production shape) — slice by the Range control like progress.tsx does.
    daily: genDailyBodyWeight(365),
    // New account: 12 days of history — 3M+ ranges fall back to M/D ticks (no month boundaries yet).
    short: genDailyBodyWeight(12),
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
    const [range, setRange] = useState<number>(7)

    // Slice exactly like progress.tsx: the chart receives the last `range` points.
    const full = DATASETS[dataKey]
    const data = full.slice(Math.max(0, full.length - range))
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
                        { label: 'BW daily (1Y)', value: 'daily' },
                        { label: 'New user (12d)', value: 'short' },
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
                <Segmented
                    value={range}
                    onChange={setRange}
                    options={[
                        { label: '7', value: 7 },
                        { label: '14', value: 14 },
                        { label: '21', value: 21 },
                        { label: '1M', value: 30 },
                        { label: '3M', value: 90 },
                        { label: '6M', value: 180 },
                        { label: '1Y', value: 365 },
                    ]}
                />
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
