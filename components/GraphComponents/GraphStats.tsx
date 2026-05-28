import { StyleSheet, Text, View } from 'react-native';

type GraphType = 'orm' | 'sets' | 'calories' | 'protein' | 'carbs' | 'fats' | 'bodyweight'

interface GraphStatsProps {
    graphType: GraphType
    data: Array<{ day: string; value: number }>
    unitSystem: 'imperial' | 'metric'
    mode: boolean
    goalWeight?: number
}

interface StatChip {
    label: string
    value: string
}

function computeStats(graphType: GraphType, data: Array<{ day: string; value: number }>, unitSystem: 'imperial' | 'metric', goalWeight?: number): StatChip[] {
    const values = data.map((d) => d.value)
    const first = values[0]
    const last = values[values.length - 1]
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    const change = last - first
    const weightUnit = unitSystem === 'imperial' ? 'lbs' : 'kg'

    if (graphType === 'orm') {
        const changePercent = first !== 0 ? Math.round((change / first) * 100) : 0
        const sign = change >= 0 ? '+' : ''
        const arrow =
            change > 0 ? ' ↑'
            : change < 0 ? ' ↓'
            : ' →'
        const best = Math.max(...values)
        return [
            { label: 'ESTIMATED BEST', value: `${best} ${weightUnit}` },
            { label: 'CHANGE', value: `${sign}${Math.round(change)} ${weightUnit} (${sign}${changePercent}%)${arrow}` },
        ]
    }

    if (graphType === 'sets') {
        const total = Math.round(values.reduce((a, b) => a + b, 0))
        const activeDays = values.filter((v) => v > 0)
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

export default function GraphStats({ graphType, data, unitSystem, mode, goalWeight }: GraphStatsProps) {
    const chartColor = mode ? '#2f80ed' : '#22C933'

    if (data.length === 0) return null

    if (data.length < 2) return null

    const stats = computeStats(graphType, data, unitSystem, goalWeight)

    return (
        <View style={styles.container}>
            <View style={styles.chipsRow}>
                {stats.map((stat, i) => (
                    <View key={i} style={styles.chip}>
                        <Text style={styles.chipLabel}>{stat.label}</Text>
                        <Text style={styles.chipValue}>{stat.value}</Text>
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
        borderRadius: 10,
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
    fallback: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        paddingVertical: 8,
    },
})
