import { FONT_FAMILY, useColorScheme, useColors } from '@/context/ThemeContext'
import { Archivo_400Regular, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { Poppins_400Regular, Poppins_800ExtraBold } from '@expo-google-fonts/poppins'
import { Circle, Group, LinearGradient, Text, useFont, vec } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Area, CartesianChart, Line, useChartPressState } from 'victory-native'
import ChartReadoutPill from './ChartReadoutPill'
import { EndValueFlag, GoalLine, PressDot, PressGuideline } from './chartPrimitives'

interface Graph1Props {
    mode: boolean
    data: Array<{ day: string; value: number }>
    selectedRange: 7 | 14 | 21
    chartNote?: { lines: string[] }
    goal?: number
    formatValue?: (value: number) => string
    showEndFlag?: boolean
}

export default function Graph1({ mode, data, selectedRange, chartNote, goal, formatValue, showEndFlag = true }: Graph1Props) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const font = useFont(FONT_FAMILY === 'archivo' ? Archivo_400Regular : Poppins_400Regular, 12)
    const flagFont = useFont(FONT_FAMILY === 'archivo' ? Archivo_800ExtraBold : Poppins_800ExtraBold, 11)
    const { state, isActive } = useChartPressState({ x: '', y: { value: 0 } })

    const chartColor = mode === true ? colors.workout : colors.nutrition
    const flagTextColor = '#ffffff'
    const fmt = formatValue ?? ((n: number) => Math.round(n).toLocaleString())
    const [minDelayDone, setMinDelayDone] = useState(false)
    const [containerWidth, setContainerWidth] = useState(0)

    // Keep chart in a placeholder state briefly on mount/remount.
    // This smooths over a one-frame visual glitch during fast prop-driven remounts.
    useEffect(() => {
        setMinDelayDone(false)
        const id = setTimeout(() => setMinDelayDone(true), 200)
        return () => clearTimeout(id)
    }, [])

    // y-domain: include the goal (so its reference line shows) and widen a degenerate
    // single-point / all-equal range so the gridlines render instead of collapsing.
    const yDomain = (() => {
        if (data.length === 0) return undefined
        const values = data.map((d) => d.value)
        let lo = Math.min(...values)
        let hi = Math.max(...values)
        if (goal != null) {
            lo = Math.min(lo, goal)
            hi = Math.max(hi, goal)
        }
        if (hi - lo < 1e-6) {
            // Single point or all values equal — match the ±10 tick band so ~3 gridlines show
            // and the dot sits mid-chart instead of the range collapsing to nothing.
            return [Math.max(0, lo - 10), hi + 10] as [number, number]
        }
        return goal != null ? ([lo, hi] as [number, number]) : undefined
    })()

    // Show placeholder while fonts load, and for a minimum duration.
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
                domain={yDomain ? { y: yDomain } : undefined}
                padding={{ left: 10, right: 10, top: 14, bottom: 10 }}
                domainPadding={{ left: 20, right: 20, top: 48, bottom: 10 }}
                xAxis={{
                    font: selectedRange === 7 ? font : null, // Only show labels when range is 7
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
                    lineWidth: 0, // horizontal-only grid (no vertical lines); x labels kept
                }}
                yAxis={[
                    {
                        font,
                        tickValues: (() => {
                            if (data.length === 0) return [0, 100, 200, 300]

                            const values = data.map((d) => d.value)
                            const min = Math.floor(Math.min(...values))
                            const max = Math.ceil(Math.max(...values))
                            const range = max - min

                            let ticks: number[]

                            // All same value - show range around it
                            if (range === 0) {
                                ticks = [Math.max(0, min - 10), min, min + 10]
                            }
                            // Small range - show every integer (cap at 4 points)
                            else if (range <= 3) {
                                ticks = Array.from({ length: range + 1 }, (_, i) => min + i)
                            }
                            // Larger range - space by whole numbers (3 intervals -> max 4 points)
                            else {
                                const step = Math.max(1, Math.ceil(range / 3))
                                ticks = []
                                for (let i = min; i <= max; i += step) {
                                    ticks.push(i)
                                }
                                if (ticks[ticks.length - 1] !== max) {
                                    ticks.push(max)
                                }
                            }

                            // Remove duplicates and sort (fixes React key warning)
                            return Array.from(new Set(ticks)).sort((a, b) => a - b)
                        })(),
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
                                return <Text key={index} x={(canvasSize.width - lineWidth) / 2} y={firstLineY + index * lineHeight} text={line} font={font} color={colors.labelMuted} style="fill" />
                            })}
                        </>
                    )
                }}
            >
                {({ points, chartBounds, yScale }) => {
                    const lastPoint = [...points.value].reverse().find((p) => p.y != null)
                    return (
                        <>
                            {/* Gradient area fill under the line (accent 0.45 -> 0) */}
                            <Area points={points.value} y0={chartBounds.bottom} curveType="monotoneX">
                                <LinearGradient start={vec(0, chartBounds.top)} end={vec(0, chartBounds.bottom)} colors={[chartColor + '73', chartColor + '00']} />
                            </Area>

                            {/* Main line */}
                            <Line points={points.value} color={chartColor} strokeWidth={2.5} curveType="monotoneX" />

                            {/* Goal reference line */}
                            {goal != null && <GoalLine y={yScale(goal)} left={chartBounds.left} right={chartBounds.right} color={chartColor} />}

                            {/* End dot with a subtle glow (dark only) */}
                            {lastPoint?.y != null && (
                                <Group>
                                    {isDark && <Circle cx={lastPoint.x} cy={lastPoint.y} r={7} color={chartColor} opacity={0.22} />}
                                    <Circle cx={lastPoint.x} cy={lastPoint.y} r={4.5} color={chartColor} />
                                </Group>
                            )}

                            {/* End value flag */}
                            {showEndFlag && lastPoint?.y != null && lastPoint.yValue != null && <EndValueFlag x={lastPoint.x} y={lastPoint.y} value={fmt(lastPoint.yValue)} color={chartColor} textColor={flagTextColor} font={flagFont} left={chartBounds.left} right={chartBounds.right} top={chartBounds.top} />}

                            {/* Press read-out: thin guideline + single dot (pill rendered as RN overlay) */}
                            {isActive && (
                                <>
                                    <PressGuideline xPosition={state.x.position} top={chartBounds.top} bottom={chartBounds.bottom} color={chartColor} />
                                    <PressDot xPosition={state.x.position} yPosition={state.y.value.position} color={chartColor} ring={colors.surface} />
                                </>
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
