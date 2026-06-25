import { FONT_FAMILY, useColors } from '@/context/ThemeContext'
import { Archivo_400Regular, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { Poppins_400Regular, Poppins_800ExtraBold } from '@expo-google-fonts/poppins'
import { useFont } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { CartesianChart, useChartPressState } from 'victory-native'
import ChartReadoutPill from './ChartReadoutPill'
import { BarRect, EndValueFlag, GoalLine } from './chartPrimitives'

interface BarChartProps {
    mode: boolean
    data: Array<{ day: string; value: number }>
    goal?: number
    formatValue?: (value: number) => string
    showEndFlag?: boolean
    showXLabels?: boolean
    /** Index of "today" within the week (Sun-indexed) for the current week; -1 to feature the most recent logged bar. */
    highlightIndex?: number
}

export default function BarChart({ mode, data, goal, formatValue, showEndFlag = true, showXLabels = true, highlightIndex }: BarChartProps) {
    const colors = useColors()
    const font = useFont(FONT_FAMILY === 'archivo' ? Archivo_400Regular : Poppins_400Regular, 12)
    const flagFont = useFont(FONT_FAMILY === 'archivo' ? Archivo_800ExtraBold : Poppins_800ExtraBold, 11)
    const { state, isActive } = useChartPressState({ x: '', y: { value: 0 } })

    const chartColor = mode === true ? colors.workout : colors.nutrition
    const flagTextColor = '#ffffff'
    const fmt = formatValue ?? ((n: number) => Math.round(n).toLocaleString())
    const [minDelayDone, setMinDelayDone] = useState(false)
    const [containerWidth, setContainerWidth] = useState(0)

    useEffect(() => {
        setMinDelayDone(false)
        const id = setTimeout(() => setMinDelayDone(true), 200)
        return () => clearTimeout(id)
    }, [])

    // Bars sit on a 0 baseline; domain top includes the goal so its line stays in view.
    const maxValue = data.length > 0 ? Math.max(...data.map((d) => d.value), goal ?? 0) : 1
    const topTick = Math.max(1, Math.ceil(maxValue))

    // Value-based signature: remount the inner chart when the data changes so it repaints
    // (the persisted Skia canvas won't refresh on a data prop change alone). Scoped to the
    // chart, not the wrapper, so the loading spinner never re-triggers on week paging.
    const chartKey = data.map((d) => `${d.day}:${d.value}`).join('|')

    if (!font || !flagFont || !minDelayDone) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.labelMuted} />
            </View>
        )
    }

    return (
        <View style={styles.wrapper} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
            <CartesianChart
                key={chartKey}
                data={data}
                xKey="day"
                yKeys={['value']}
                chartPressState={state}
                domain={{ y: [0, topTick] }}
                padding={{ left: 10, right: 10, top: 14, bottom: 10 }}
                domainPadding={{ left: 24, right: 24, top: 48, bottom: 0 }}
                xAxis={{
                    font: showXLabels ? font : null,
                    tickCount: data.length,
                    labelRotate: 0,
                    labelOffset: 0,
                    labelColor: colors.textSecondary,
                    formatXLabel: (value) => {
                        if (value === undefined || value === null || value === 'undefined') {
                            return ''
                        }
                        return `${value}`
                    },
                    lineColor: colors.ringTrack,
                    lineWidth: 1, // vertical grid lines on
                }}
                yAxis={[
                    {
                        font,
                        tickValues: [0, topTick],
                        labelOffset: 8,
                        labelColor: colors.textSecondary,
                        formatYLabel: (value) => `${value}`,
                        lineColor: colors.ringTrack,
                        lineWidth: 0, // horizontal grid lines off (vertical-only on the bar chart)
                    },
                ]}
            >
                {({ points, chartBounds, yScale }) => {
                    const count = points.value.length || 1
                    const barWidth = Math.min(18, ((chartBounds.right - chartBounds.left) / count) * 0.55)

                    // Most-recent bar that actually has data (featured bar on past weeks).
                    let lastBarIndex = -1
                    for (let i = points.value.length - 1; i >= 0; i--) {
                        const v = points.value[i].yValue
                        if (v != null && v > 0) {
                            lastBarIndex = i
                            break
                        }
                    }

                    // Featured bar (full accent + end flag): today on the current week (only when logged),
                    // otherwise the most recent logged day (past weeks).
                    let featuredIndex = lastBarIndex
                    if (highlightIndex != null && highlightIndex >= 0) {
                        const todayVal = points.value[highlightIndex]?.yValue
                        featuredIndex = todayVal != null && todayVal > 0 ? highlightIndex : -1
                    }
                    const featuredBar = featuredIndex >= 0 ? points.value[featuredIndex] : undefined

                    return (
                        <>
                            {points.value.map((p, i) => (
                                <BarRect key={`bar-${i}`} x={p.x} barWidth={barWidth} top={p.y ?? chartBounds.bottom} bottom={chartBounds.bottom} color={chartColor} isLast={i === featuredIndex} index={i} matchedIndex={state.matchedIndex} isActive={isActive} />
                            ))}

                            {goal != null && <GoalLine y={yScale(goal)} left={chartBounds.left} right={chartBounds.right} color={chartColor} />}

                            {showEndFlag && featuredBar?.y != null && featuredBar.yValue != null && <EndValueFlag x={featuredBar.x} y={featuredBar.y} value={fmt(featuredBar.yValue)} color={chartColor} textColor={flagTextColor} font={flagFont} left={chartBounds.left} right={chartBounds.right} top={chartBounds.top} />}
                        </>
                    )
                }}
            </CartesianChart>

            <ChartReadoutPill state={state} isActive={isActive} containerWidth={containerWidth} colors={colors} formatValue={fmt} />
        </View>
    )
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        position: 'relative',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
})
