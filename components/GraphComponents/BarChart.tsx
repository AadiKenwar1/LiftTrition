import { FONT_FAMILY, useColors } from '@/context/ThemeContext'
import { Archivo_400Regular, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { Poppins_400Regular, Poppins_800ExtraBold } from '@expo-google-fonts/poppins'
import { useFont } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { CartesianChart, useChartPressState } from 'victory-native'
import ChartReadoutPill from './ChartReadoutPill'
import { BarRect, EndValueFlag, GoalLine } from './chartPrimitives'

/** Builds a small "nice" 0-based y scale (rounded steps, ~3 ticks) so horizontal gridlines read cleanly. */
function niceScale(maxValue: number, targetCount = 3): { ticks: number[]; top: number } {
    const m = Math.max(1, Math.ceil(maxValue))
    const rawStep = m / targetCount
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const norm = rawStep / mag
    const step = Math.max(1, Math.round((norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag))
    const top = Math.ceil(m / step) * step
    const ticks: number[] = []
    for (let v = 0; v <= top; v += step) ticks.push(v)
    return { ticks, top }
}

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

    // Bars sit on a 0 baseline; a "nice" rounded scale (including the goal) drives the horizontal gridlines.
    const rawMax = data.length > 0 ? Math.max(...data.map((d) => d.value), goal ?? 0) : 1
    const { ticks: yTicks, top: yTop } = niceScale(rawMax)

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
                domain={{ y: [0, yTop] }}
                padding={{ left: 10, right: 10, top: 14, bottom: 10 }}
                domainPadding={{ left: 24, right: 24, top: 18, bottom: 0 }}
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
                    lineWidth: 0, // no vertical gridlines (weekday labels kept)
                }}
                yAxis={[
                    {
                        font,
                        tickValues: yTicks,
                        labelOffset: 8,
                        labelColor: colors.textSecondary,
                        formatYLabel: (value) => value.toLocaleString(),
                        lineColor: colors.ringTrack,
                        lineWidth: 1, // horizontal gridlines (value scale)
                    },
                ]}
            >
                {({ points, chartBounds, yScale }) => {
                    const count = points.value.length || 1
                    const barWidth = Math.min(18, ((chartBounds.right - chartBounds.left) / count) * 0.55)

                    // Featured bar (full accent + end flag) = TODAY on the current week, and only when
                    // logged. Past weeks have no "today", so nothing is featured (no flag, no bold bar).
                    const isCurrentWeek = highlightIndex != null && highlightIndex >= 0
                    const todayVal = isCurrentWeek ? points.value[highlightIndex]?.yValue : undefined
                    const featuredIndex = isCurrentWeek && todayVal != null && todayVal > 0 ? highlightIndex : -1
                    const featuredBar = featuredIndex >= 0 ? points.value[featuredIndex] : undefined
                    // Dim the other bars only when one bar is featured; otherwise the whole week reads full.
                    const dimOthers = featuredIndex >= 0

                    return (
                        <>
                            {points.value.map((p, i) => (
                                <BarRect key={`bar-${i}`} x={p.x} barWidth={barWidth} top={p.y ?? chartBounds.bottom} bottom={chartBounds.bottom} color={chartColor} isLast={i === featuredIndex} dimOthers={dimOthers} index={i} matchedIndex={state.matchedIndex} isActive={isActive} />
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
