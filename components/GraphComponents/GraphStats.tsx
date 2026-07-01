import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

type GraphType = 'orm' | 'sets' | 'calories' | 'protein' | 'carbs' | 'fats' | 'bodyweight'
type Tone = 'good' | 'neutral'

interface GraphStatsProps {
    graphType: GraphType
    data: Array<{ day: string; value: number }>
    statsData?: Array<{ day: string; value: number }>
    unitSystem: 'imperial' | 'metric'
    mode: boolean
    goalWeight?: number
    goal?: number
}

interface StatChip {
    label: string
    value: string
    trend?: { dir: 'up' | 'down' | 'flat'; tone: Tone }
}

// On-target calories/macros read as positive (green); anything off-target is neutral — never red/amber,
// since being under goal (e.g. an intentional deficit) shouldn't look like a mistake.
function targetTone(avg: number, goal?: number): Tone {
    if (goal == null || goal === 0) return 'neutral'
    return Math.abs(avg - goal) / goal <= 0.1 ? 'good' : 'neutral'
}

function computeStats(graphType: GraphType, data: Array<{ day: string; value: number }>, unitSystem: 'imperial' | 'metric', goalWeight?: number, statsData?: Array<{ day: string; value: number }>, goal?: number): StatChip[] {
    const values = data.map((d) => d.value)
    const rawValues = (statsData ?? data).map((d) => d.value)
    const first = values[0] ?? 0
    const last = values[values.length - 1] ?? 0
    const change = last - first
    const weightUnit = unitSystem === 'imperial' ? 'lb' : 'kg'

    // For per-day nutrition metrics, average/trend over days actually logged (ignore unlogged 0 days).
    const loggedValues = values.filter((v) => v > 0)
    const loggedAvg = loggedValues.length > 0 ? Math.round(loggedValues.reduce((a, b) => a + b, 0) / loggedValues.length) : 0
    const firstLogged = loggedValues[0] ?? 0
    const lastLogged = loggedValues[loggedValues.length - 1] ?? 0
    const loggedChange = lastLogged - firstLogged

    if (graphType === 'orm') {
        const best = rawValues.length > 0 ? Math.max(...rawValues) : 0
        const sign = change >= 0 ? '+' : ''
        const dir =
            change > 0 ? 'up'
            : change < 0 ? 'down'
            : 'flat'
        // Up = positive (green); a decrease is shown neutral, not red — consistent with the other graphs.
        const tone: Tone = dir === 'up' ? 'good' : 'neutral'
        return [
            { label: 'Estimated max', value: `${best} ${weightUnit}` },
            { label: 'Change', value: `${sign}${Math.round(change)} ${weightUnit}`, trend: { dir, tone } },
        ]
    }

    if (graphType === 'sets') {
        const total = Math.round(rawValues.reduce((a, b) => a + b, 0))
        const activeDays = rawValues.filter((v) => v > 0)
        const avgActive = activeDays.length > 0 ? Math.round(activeDays.reduce((a, b) => a + b, 0) / activeDays.length) : 0
        return [
            { label: 'Avg / training day', value: `${avgActive} sets` },
            { label: 'Total sets', value: `${total} sets` },
        ]
    }

    if (graphType === 'calories') {
        const trendPercent = firstLogged !== 0 ? Math.round((loggedChange / firstLogged) * 100) : 0
        const sign = trendPercent >= 0 ? '+' : ''
        const dir =
            trendPercent > 2 ? 'up'
            : trendPercent < -2 ? 'down'
            : 'flat'
        return [
            { label: 'Avg intake', value: `${loggedAvg.toLocaleString()} kcal` },
            { label: 'Trend', value: `${sign}${trendPercent}%`, trend: { dir, tone: targetTone(loggedAvg, goal) } },
        ]
    }

    if (graphType === 'protein' || graphType === 'carbs' || graphType === 'fats') {
        const trendPercent = firstLogged !== 0 ? Math.round((loggedChange / firstLogged) * 100) : 0
        const sign = trendPercent >= 0 ? '+' : ''
        const dir =
            trendPercent > 2 ? 'up'
            : trendPercent < -2 ? 'down'
            : 'flat'
        const macroLabel = graphType.charAt(0).toUpperCase() + graphType.slice(1)
        return [
            { label: `Avg ${macroLabel.toLowerCase()}`, value: `${loggedAvg} g` },
            { label: 'Trend', value: `${sign}${trendPercent}%`, trend: { dir, tone: targetTone(loggedAvg, goal) } },
        ]
    }

    if (graphType === 'bodyweight') {
        const dir =
            change > 0.5 ? 'up'
            : change < -0.5 ? 'down'
            : 'flat'
        // Goal-aware: moving toward goalWeight reads as positive (green); moving away is neutral, not red —
        // whether "down" is good depends on the user's goal, so we never flag body weight as bad.
        let tone: Tone = 'neutral'
        if (goalWeight != null && dir !== 'flat') {
            tone = Math.abs(last - goalWeight) < Math.abs(first - goalWeight) ? 'good' : 'neutral'
        }
        const toGoal = goalWeight != null ? Math.round((last - goalWeight) * 10) / 10 : null
        const toGoalValue =
            toGoal === null ? 'N/A'
            : toGoal === 0 ? `0 ${weightUnit} 🎉`
            : `${toGoal > 0 ? '+' : ''}${toGoal} ${weightUnit}`
        return [
            { label: 'To goal', value: toGoalValue },
            { label: 'Change', value: `${Math.abs(Math.round(change * 10) / 10)} ${weightUnit}`, trend: { dir, tone } },
        ]
    }

    return []
}

function TrendArrow({ dir, color }: { dir: 'up' | 'down' | 'flat'; color: string }) {
    if (dir === 'up') return <ArrowUp size={14} color={color} strokeWidth={3} />
    if (dir === 'down') return <ArrowDown size={14} color={color} strokeWidth={3} />
    return <ArrowRight size={14} color={color} strokeWidth={3} />
}

export default function GraphStats({ graphType, data, statsData, unitSystem, goalWeight, goal }: GraphStatsProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    if (data.length === 0) return null

    const stats = computeStats(graphType, data, unitSystem, goalWeight, statsData, goal)

    const toneColor = (tone: Tone): string => {
        if (tone === 'good') return colors.nutrition
        return colors.text
    }

    return (
        <View style={styles.row}>
            {stats.map((stat, i) => {
                const valueColor = stat.trend ? toneColor(stat.trend.tone) : colors.text
                return (
                    <View key={i} style={styles.half}>
                        {i > 0 && <View style={styles.divider} />}
                        <View style={styles.cell}>
                            <Text style={styles.label}>{stat.label}</Text>
                            <View style={styles.valueRow}>
                                {stat.trend && <TrendArrow dir={stat.trend.dir} color={valueColor} />}
                                <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                    {stat.value}
                                </Text>
                            </View>
                        </View>
                    </View>
                )
            })}
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        row: {
            flexDirection: 'row',
            backgroundColor: colors.surfaceInset,
            borderRadius: 10,
            overflow: 'hidden',
            marginTop: 4,
            marginBottom: 4,
        },
        half: {
            flex: 1,
            flexDirection: 'row',
        },
        divider: {
            width: StyleSheet.hairlineWidth,
            backgroundColor: colors.hairline,
        },
        cell: {
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 16,
        },
        label: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 4,
        },
        valueRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
        },
        value: {
            fontFamily: fonts.extrabold,
            fontSize: 20,
            letterSpacing: -0.4,
            flexShrink: 1,
        },
    })
}
