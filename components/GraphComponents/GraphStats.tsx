import { StyleSheet, Text, View } from 'react-native';

type GraphType = 'orm' | 'sets' | 'calories' | 'protein' | 'carbs' | 'fats' | 'bodyweight'

interface GraphStatsProps {
    graphType: GraphType
    data: Array<{ day: string; value: number }>
    statsData?: Array<{ day: string; value: number }>
    unitSystem: 'imperial' | 'metric'
    mode: boolean
    goalWeight?: number
}

interface StatChip {
    label: string
    value: string
}

function computeStats(
    graphType: GraphType,
    data: Array<{ day: string; value: number }>,
    unitSystem: 'imperial' | 'metric',
    goalWeight?: number,
    statsData?: Array<{ day: string; value: number }>,
): StatChip[] {
    const values = data.map((d) => d.value)
    const rawValues = (statsData ?? data).map((d) => d.value)
    const first = values[0] ?? 0
    const last = values[values.length - 1] ?? 0
    const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
    const change = last - first
    const weightUnit = unitSystem === 'imperial' ? 'lbs' : 'kg'

    if (graphType === 'orm') {
        const best = rawValues.length > 0 ? Math.max(...rawValues) : 0
        const changePercent = first !== 0 ? Math.round((change / first) * 100) : 0
        const sign = change >= 0 ? '+' : ''
        const arrow =
            change > 0 ? ' ↑'
            : change < 0 ? ' ↓'
            : ' →'
        return [
            { label: 'ESTIMATED BEST', value: `${best} ${weightUnit}` },
            { label: 'CHANGE', value: `${sign}${Math.round(change)} ${weightUnit} (${sign}${changePercent}%)${arrow}` },
        ]
    }

    if (graphType === 'sets') {
        const total = Math.round(rawValues.reduce((a, b) => a + b, 0))
        const activeDays = rawValues.filter((v) => v > 0)
        const avgActive = activeDays.length > 0 ? Math.round(activeDays.reduce((a, b) => a + b, 0) / activeDays.length) : 0
        return [
            { label: 'AVG SETS / DAY', value: `${avgActive} sets` },
            { label: 'TOTAL SETS', value: `${total} sets` },
        ]
    }

    if (graphType === 'calories') {
        const trendPercent = first !== 0 ? Math.round((change / first) * 100) : 0
        const sign = trendPercent >= 0 ? '+' : ''
        const arrow =
            trendPercent > 2 ? '↑'
            : trendPercent < -2 ? '↓'
            : '→'
        return [
            { label: 'AVG INTAKE', value: `${avg} kcal / day` },
            { label: 'TREND', value: `${arrow} ${sign}${trendPercent}%` },
        ]
    }

    if (graphType === 'protein' || graphType === 'carbs' || graphType === 'fats') {
        const trendPercent = first !== 0 ? Math.round((change / first) * 100) : 0
        const sign = trendPercent >= 0 ? '+' : ''
        const arrow =
            trendPercent > 2 ? '↑'
            : trendPercent < -2 ? '↓'
            : '→'
        const macroLabel = graphType.charAt(0).toUpperCase() + graphType.slice(1)
        return [
            { label: `AVG ${macroLabel.toUpperCase()}`, value: `${avg} g / day` },
            { label: 'TREND', value: `${arrow} ${sign}${trendPercent}%` },
        ]
    }

    if (graphType === 'bodyweight') {
        const sign = change >= 0 ? '+' : ''
        const arrow =
            change > 0.5 ? ' ↑'
            : change < -0.5 ? ' ↓'
            : ' →'
        const toGoal = goalWeight != null ? Math.round((last - goalWeight) * 10) / 10 : null
        const toGoalValue =
            toGoal === null ? 'N/A'
            : toGoal === 0 ? `0 ${weightUnit} 🎉`
            : `${toGoal > 0 ? '+' : ''}${toGoal} ${weightUnit}`
        return [
            { label: 'TO GOAL', value: toGoalValue },
            { label: 'CHANGE', value: `${sign}${Math.round(change * 10) / 10} ${weightUnit}${arrow}` },
        ]
    }

    return []
}

export default function GraphStats({ graphType, data, statsData, unitSystem, mode, goalWeight }: GraphStatsProps) {
    const chartColor = mode ? '#2f80ed' : '#22C933'

    if (data.length === 0) return null

    const stats = computeStats(graphType, data, unitSystem, goalWeight, statsData)

    return (
        <View style={styles.container}>
            <View style={styles.chipsRow}>
                {stats.map((stat, i) => (
                    <View key={i} style={[styles.chip, { borderColor: chartColor + '44' }]}>
                        <Text style={styles.chipLabel}>{stat.label}</Text>
                        <Text style={styles.chipValue} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
                            {stat.value}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginTop: 4,
        marginBottom: 4,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    chip: {
        flex: 1,
        backgroundColor: '#252525',
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    chipLabel: {
        fontSize: 10,
        color: '#666',
        fontFamily: 'Poppins_500Medium',
        letterSpacing: 0.4,
        marginBottom: 3,
        textAlign: 'center',
    },
    chipValue: {
        fontSize: 13,
        color: '#ccc',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.3,
        textAlign: 'center',
    },
})
