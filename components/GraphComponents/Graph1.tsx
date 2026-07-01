import { FONT_FAMILY, useColorScheme, useColors } from '@/context/ThemeContext'
import { Archivo_400Regular, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { Poppins_400Regular, Poppins_800ExtraBold } from '@expo-google-fonts/poppins'
import { Circle, Group, LinearGradient, useFont, vec } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Area, CartesianChart, Line, useChartPressState } from 'victory-native'
import ChartReadoutPill from './ChartReadoutPill'
import { EndValueFlag, GoalLine, PressDot, PressGuideline } from './chartPrimitives'

/** Rounds a raw step up to the nearest "nice" value (1/2/5 × 10ⁿ) for clean y-axis labels. */
function niceStep(raw: number): number {
    const mag = Math.pow(10, Math.floor(Math.log10(raw)))
    const norm = raw / mag
    return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag
}

interface Graph1Props {
    mode: boolean
    data: Array<{ day: string; value: number }>
    selectedRange: 7 | 14 | 21
    goal?: number
    formatValue?: (value: number) => string
    showEndFlag?: boolean
}

export default function Graph1({ mode, data, selectedRange, goal, formatValue, showEndFlag = true }: Graph1Props) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const font = useFont(FONT_FAMILY === 'archivo' ? Archivo_400Regular : Poppins_400Regular, 12)
    const flagFont = useFont(FONT_FAMILY === 'archivo' ? Archivo_800ExtraBold : Poppins_800ExtraBold, 11)
    const { state, isActive } = useChartPressState({ x: '', y: { value: 0 } })

    const chartColor = mode === true ? colors.workout : colors.nutrition
    // Remount the inner chart when data OR colors change so the persisted Skia canvas repaints
    // (victory-native won't refresh on a prop change alone — a theme switch changes colors, not data).
    const chartKey = `${chartColor}|${colors.textSecondary}|${colors.ringTrack}|` + data.map((d) => `${d.day}:${d.value}`).join('|')
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

    // Unified y-scale shared by the domain and the y-axis ticks so they stay aligned.
    // Includes the goal (so its line shows) and adds one `step` of headroom above the data
    // max, which gives the end-value flag room to sit above a peak last-point (e.g. a new PR)
    // without needing a large empty band on top. Degenerate single-point/all-equal ranges keep
    // a ±10 band so gridlines render and the dot sits mid-chart.
    const yScaleInfo = (() => {
        if (data.length === 0) return { domain: undefined as [number, number] | undefined, ticks: [0, 100, 200, 300] }
        const values = data.map((d) => d.value)
        let lo = Math.min(...values)
        let hi = Math.max(...values)
        if (goal != null) {
            lo = Math.min(lo, goal)
            hi = Math.max(hi, goal)
        }
        if (hi - lo < 1e-6) {
            const base = Math.max(0, lo - 10)
            return { domain: [base, lo + 10] as [number, number], ticks: [base, lo, lo + 10] }
        }
        // Nice rounded ticks, capped at 4 labels, with one step of headroom above the data max
        // (so the end-flag clears a peak last-point). Domain top = niceMax, no separate void band.
        const maxTicks = 4
        let step = niceStep((hi - lo) / (maxTicks - 1))
        let niceMin = Math.floor(lo / step) * step
        let niceMax = Math.ceil(hi / step) * step
        if (niceMax - hi < step * 0.5) niceMax += step
        while ((niceMax - niceMin) / step + 1 > maxTicks) {
            step = niceStep(step * 1.5)
            niceMin = Math.floor(lo / step) * step
            niceMax = Math.ceil(hi / step) * step
            if (niceMax - hi < step * 0.5) niceMax += step
        }
        const ticks: number[] = []
        for (let v = niceMin; v <= niceMax + step * 1e-6; v += step) ticks.push(Math.round(v * 100) / 100)
        return { domain: [niceMin, niceMax] as [number, number], ticks }
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
                key={chartKey}
                data={data}
                xKey="day"
                yKeys={['value']}
                chartPressState={state}
                domain={yScaleInfo.domain ? { y: yScaleInfo.domain } : undefined}
                padding={{ left: 10, right: 10, top: 6, bottom: 10 }}
                domainPadding={{ left: 20, right: 20, top: 10, bottom: 10 }}
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
                        tickValues: yScaleInfo.ticks,
                        labelOffset: 8,
                        labelColor: colors.textSecondary,
                        formatYLabel: (value) => `${value}`,
                        lineColor: colors.ringTrack,
                        lineWidth: 1,
                    },
                ]}
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
