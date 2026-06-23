import { FONT_FAMILY, useColorScheme, useColors } from '@/context/ThemeContext'
import { Archivo_400Regular } from '@expo-google-fonts/archivo'
import { Poppins_400Regular } from '@expo-google-fonts/poppins'
import { Circle, Group, LinearGradient, Text, useFont, vec } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Area, CartesianChart, Line, useChartPressState } from 'victory-native'

interface Graph1Props {
    mode: boolean
    data: Array<{ day: string; value: number }>
    selectedRange: 7 | 14 | 21
    chartNote?: { lines: string[] }
}

export default function Graph1({ mode, data, selectedRange, chartNote }: Graph1Props) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const font = useFont(FONT_FAMILY === 'archivo' ? Archivo_400Regular : Poppins_400Regular, 12)
    const { state, isActive } = useChartPressState({ x: '', y: { value: 0 } })

    const chartColor = mode === true ? colors.workout : colors.nutrition
    const [minDelayDone, setMinDelayDone] = useState(false)

    // Keep chart in a placeholder state briefly on mount/remount.
    // This smooths over a one-frame visual glitch during fast prop-driven remounts.
    useEffect(() => {
        setMinDelayDone(false)
        const id = setTimeout(() => setMinDelayDone(true), 200)
        return () => clearTimeout(id)
    }, [])

    // Show placeholder while font is loading, and for a minimum duration.
    if (!font || !minDelayDone) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.labelMuted} />
            </View>
        )
    }

    return (
        <>
            <CartesianChart
                data={data}
                xKey="day"
                yKeys={['value']}
                chartPressState={state}
                padding={{ left: 10, right: 10, top: 10, bottom: 10 }}
                domainPadding={{ left: 20, right: 20, top: 20, bottom: 10 }}
                xAxis={{
                    font: selectedRange === 7 ? font : null, // Only show labels when range is 7
                    //tickCount: data.length,
                    labelRotate: data.length > 3 ? 45 : 0,
                    labelOffset: 0,
                    labelColor: colors.textSecondary,
                    formatXLabel: (value) => {
                        // ✅ Hide undefined/null labels
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
                        tickValues: (() => {
                            if (data.length === 0) return [0, 100, 200, 300, 400]

                            const values = data.map((d) => d.value)
                            const min = Math.floor(Math.min(...values))
                            const max = Math.ceil(Math.max(...values))
                            const range = max - min

                            let ticks: number[]

                            // All same value - show range around it
                            if (range === 0) {
                                ticks = [Math.max(0, min - 10), min, min + 10]
                            }
                            // Small range - show every integer
                            else if (range <= 4) {
                                ticks = Array.from({ length: range + 1 }, (_, i) => min + i)
                            }
                            // Larger range - space by whole numbers
                            else {
                                const step = Math.max(1, Math.ceil(range / 4))
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
                        formatYLabel: (value) => `${value}`, // No rounding needed - already integers
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
                {({ points, chartBounds }) => {
                    // Render a single dot at the most recent data point (handoff: end dot only).
                    const lastPoint = [...points.value].reverse().find((p) => p.y != null)
                    return (
                        <>
                            {/* Gradient area fill under the line (0.45 -> 0) */}
                            <Area points={points.value} y0={chartBounds.bottom} curveType="monotoneX">
                                <LinearGradient start={vec(0, chartBounds.top)} end={vec(0, chartBounds.bottom)} colors={[chartColor + '73', chartColor + '00']} />
                            </Area>

                            {/* Main line */}
                            <Line points={points.value} color={chartColor} strokeWidth={3} curveType="monotoneX" />

                            {/* End dot with a subtle glow (dark only) */}
                            {lastPoint?.y != null && (
                                <Group>
                                    {isDark && <Circle cx={lastPoint.x} cy={lastPoint.y} r={9} color={chartColor} opacity={0.25} />}
                                    <Circle cx={lastPoint.x} cy={lastPoint.y} r={5.5} color={chartColor} />
                                </Group>
                            )}

                            {/* Highlight active point with enhanced effect */}
                            {isActive && state.y.value.position && (
                                <Group>
                                    {/* Outer glow */}
                                    <Circle cx={state.x.position} cy={state.y.value.position} r={16} color={chartColor} opacity={0.2} />
                                    {/* Middle glow */}
                                    <Circle cx={state.x.position} cy={state.y.value.position} r={12} color={chartColor} opacity={0.4} />
                                    {/* Border */}
                                    <Circle cx={state.x.position} cy={state.y.value.position} r={9.5} color={colors.surface} opacity={1} />
                                    {/* Inner circle */}
                                    <Circle cx={state.x.position} cy={state.y.value.position} r={7.5} color={chartColor} opacity={1} />
                                </Group>
                            )}
                        </>
                    )
                }}
            </CartesianChart>
        </>
    )
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
})
