import { Circle, Group, Text, useFont } from '@shopify/react-native-skia'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Area, CartesianChart, Line, useChartPressState } from 'victory-native'

interface Graph1Props {
    mode: boolean
    data: Array<{ day: string; value: number }>
    selectedRange: 7 | 14 | 21
}

export default function Graph1({ mode, data, selectedRange }: Graph1Props) {
    const font = useFont(require('@/assets/fonts/SpaceMono-Regular.ttf'), 11)
    const { state, isActive } = useChartPressState({ x: '', y: { value: 0 } })

    const chartColor = mode === true ? '#2f80ed' : '#22C933'

    // Show loading indicator while font is loading
    if (!font) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={chartColor} />
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
                    labelRotate: 45,
                    labelOffset: 0,
                    labelColor: '#D3D3D3',
                    formatXLabel: (value) => {
                        // ✅ Hide undefined/null labels
                        if (value === undefined || value === null || value === 'undefined') {
                            return ''
                        }
                        return `${value}`
                    },
                    lineColor: '#2a2a2a',
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
                        labelColor: '#D3D3D3',
                        formatYLabel: (value) => `${value}`, // No rounding needed - already integers
                        lineColor: '#2a2a2a',
                        lineWidth: 1,
                    },
                ]}
                renderOutside={({ canvasSize, chartBounds }) => {
                    const bucketSize = selectedRange / 7 // 2 for 14, 3 for 21
                    const timeUnit = mode ? 'lifts' : 'days'
                    const line1 = `Data is downsampled for every ${bucketSize} ${timeUnit}`
                    const line2 = "X-axis labels won't be shown"
                    const line1Width = font ? font.getTextWidth(line1) : 0
                    const line2Width = font ? font.getTextWidth(line2) : 0

                    return (
                        <>
                            {/* Downsampled data message when range is 14 or 21 */}
                            {selectedRange !== 7 && (
                                <>
                                    <Text x={(canvasSize.width - line1Width) / 2} y={chartBounds.bottom + 16} text={line1} font={font} color="#888888" style="fill" />
                                    <Text x={(canvasSize.width - line2Width) / 2} y={chartBounds.bottom + 30} text={line2} font={font} color="#888888" style="fill" />
                                </>
                            )}
                        </>
                    )
                }}
            >
                {({ points, chartBounds }) => (
                    <>
                        {/* Gradient area fill under the line */}
                        <Area points={points.value} y0={chartBounds.bottom} color={chartColor} opacity={0.15} curveType="monotoneX" />

                        {/* Main line */}
                        <Line points={points.value} color={chartColor} strokeWidth={3.5} curveType="monotoneX" />

                        {/* Render circles for each data point with white border */}
                        {points.value.map((point, index) => {
                            if (!point.y) return null
                            return (
                                <Group key={`point-${index}`}>
                                    {/* Outer white border */}
                                    <Circle cx={point.x} cy={point.y} r={8.5} color="#1e1e1e" opacity={1} />
                                    {/* Inner colored circle */}
                                    <Circle cx={point.x} cy={point.y} r={6.5} color={chartColor} opacity={1} />
                                </Group>
                            )
                        })}

                        {/* Highlight active point with enhanced effect */}
                        {isActive && state.y.value.position && (
                            <Group>
                                {/* Outer glow */}
                                <Circle cx={state.x.position} cy={state.y.value.position} r={16} color={chartColor} opacity={0.2} />
                                {/* Middle glow */}
                                <Circle cx={state.x.position} cy={state.y.value.position} r={12} color={chartColor} opacity={0.4} />
                                {/* Border */}
                                <Circle cx={state.x.position} cy={state.y.value.position} r={9.5} color="#1e1e1e" opacity={1} />
                                {/* Inner circle */}
                                <Circle cx={state.x.position} cy={state.y.value.position} r={7.5} color={chartColor} opacity={1} />
                            </Group>
                        )}
                    </>
                )}
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
