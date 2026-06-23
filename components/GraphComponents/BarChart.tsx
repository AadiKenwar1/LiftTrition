import { FONT_FAMILY, useColors } from '@/context/ThemeContext'
import { Archivo_400Regular, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { Poppins_400Regular, Poppins_800ExtraBold } from '@expo-google-fonts/poppins'
import { Text, useFont } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { CartesianChart, useChartPressState } from 'victory-native'
import ChartReadoutPill from './ChartReadoutPill'
import { BarRect, EndValueFlag, GoalLine } from './chartPrimitives'

interface BarChartProps {
    mode: boolean
    data: Array<{ day: string; value: number }>
    selectedRange: 7 | 14 | 21
    chartNote?: { lines: string[] }
    goal?: number
    formatValue?: (value: number) => string
    showEndFlag?: boolean
}

export default function BarChart({ mode, data, selectedRange, chartNote, goal, formatValue, showEndFlag = true }: BarChartProps) {
    const colors = useColors()
    const font = useFont(FONT_FAMILY === 'archivo' ? Archivo_400Regular : Poppins_400Regular, 12)
    const flagFont = useFont(FONT_FAMILY === 'archivo' ? Archivo_800ExtraBold : Poppins_800ExtraBold, 11)
    const { state, isActive } = useChartPressState({ x: '', y: { value: 0 } })

    const chartColor = mode === true ? colors.workout : colors.nutrition
    const flagTextColor = mode ? '#ffffff' : '#062a06'
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
                data={data}
                xKey="day"
                yKeys={['value']}
                chartPressState={state}
                domain={{ y: [0, topTick] }}
                padding={{ left: 10, right: 10, top: 10, bottom: 10 }}
                domainPadding={{ left: 24, right: 24, top: 20, bottom: 0 }}
                xAxis={{
                    font: selectedRange === 7 ? font : null,
                    labelRotate: data.length > 3 ? 45 : 0,
                    labelOffset: 0,
                    labelColor: colors.textSecondary,
                    formatXLabel: (value) => {
                        if (value === undefined || value === null || value === 'undefined') {
                            return ''
                        }
                        return `${value}`
                    },
                    lineColor: colors.ringTrack,
                    lineWidth: 1,
                }}
                yAxis={[
                    {
                        font,
                        tickValues: [0, topTick],
                        labelOffset: 8,
                        labelColor: colors.textSecondary,
                        formatYLabel: (value) => `${value}`,
                        lineColor: colors.ringTrack,
                        lineWidth: 1,
                    },
                ]}
                renderOutside={({ canvasSize, chartBounds }) => {
                    if (!chartNote) return null

                    const lineHeight = 14
                    const firstLineY = chartBounds.bottom + 16

                    return (
                        <>
                            {chartNote.lines.map((line, index) => {
                                const lineWidth = font.getTextWidth(line)
                                return (
                                    <Text
                                        key={index}
                                        x={(canvasSize.width - lineWidth) / 2}
                                        y={firstLineY + index * lineHeight}
                                        text={line}
                                        font={font}
                                        color={colors.labelMuted}
                                        style="fill"
                                    />
                                )
                            })}
                        </>
                    )
                }}
            >
                {({ points, chartBounds, canvasSize, yScale }) => {
                    const count = points.value.length || 1
                    const barWidth = Math.min(18, ((chartBounds.right - chartBounds.left) / count) * 0.55)

                    // Most-recent bar that actually exists (non-zero) → full accent + end flag anchor.
                    let lastBarIndex = -1
                    for (let i = points.value.length - 1; i >= 0; i--) {
                        const v = points.value[i].yValue
                        if (v != null && v > 0) {
                            lastBarIndex = i
                            break
                        }
                    }
                    const lastBar = lastBarIndex >= 0 ? points.value[lastBarIndex] : undefined

                    return (
                        <>
                            {points.value.map((p, i) => (
                                <BarRect
                                    key={`bar-${i}`}
                                    x={p.x}
                                    barWidth={barWidth}
                                    top={p.y ?? chartBounds.bottom}
                                    bottom={chartBounds.bottom}
                                    color={chartColor}
                                    isLast={i === lastBarIndex}
                                    index={i}
                                    matchedIndex={state.matchedIndex}
                                    isActive={isActive}
                                />
                            ))}

                            {goal != null && <GoalLine y={yScale(goal)} left={chartBounds.left} right={chartBounds.right} color={chartColor} />}

                            {showEndFlag && lastBar?.y != null && lastBar.yValue != null && (
                                <EndValueFlag
                                    x={lastBar.x}
                                    y={lastBar.y}
                                    value={fmt(lastBar.yValue)}
                                    color={chartColor}
                                    textColor={flagTextColor}
                                    font={flagFont}
                                    canvasWidth={canvasSize.width}
                                />
                            )}
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
