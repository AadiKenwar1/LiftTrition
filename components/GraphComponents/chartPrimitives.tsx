import { Circle, DashPathEffect, Group, Line, RoundedRect, Text, vec, type SkFont } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'

/**
 * Shared Skia building blocks for the Progress charts. Each is a real component
 * (not a plain function) so it can own its own hooks — they are rendered INSIDE a
 * CartesianChart children render-prop, where calling hooks directly is unsafe.
 */

function textHeight(font: SkFont) {
    const m = font.getMetrics()
    const ascent = m.ascent ?? -font.getSize() * 0.8
    const descent = m.descent ?? font.getSize() * 0.2
    return { ascent, descent, height: descent - ascent }
}

// Vertical dashed guideline at the pressed x position (line charts).
export function PressGuideline({ xPosition, top, bottom, color }: { xPosition: SharedValue<number>; top: number; bottom: number; color: string }) {
    const p1 = useDerivedValue(() => vec(xPosition.value, top))
    const p2 = useDerivedValue(() => vec(xPosition.value, bottom))
    return (
        <Line p1={p1} p2={p2} color={color} strokeWidth={1} opacity={0.5}>
            <DashPathEffect intervals={[3, 3]} />
        </Line>
    )
}

// Solid dot with a surface-colored ring at the pressed point (line charts).
export function PressDot({ xPosition, yPosition, color, ring }: { xPosition: SharedValue<number>; yPosition: SharedValue<number>; color: string; ring: string }) {
    return (
        <Group>
            <Circle cx={xPosition} cy={yPosition} r={6} color={ring} />
            <Circle cx={xPosition} cy={yPosition} r={4.5} color={color} />
        </Group>
    )
}

// Small filled pill labelling the most-recent value, anchored above its point and clamped in-canvas.
export function EndValueFlag({ x, y, value, color, textColor, font, canvasWidth }: { x: number; y: number; value: string; color: string; textColor: string; font: SkFont; canvasWidth: number }) {
    const padH = 7
    const padV = 4
    const { ascent, height } = textHeight(font)
    const textW = font.getTextWidth(value)
    const pillW = textW + padH * 2
    const pillH = height + padV * 2
    const px = Math.max(2, Math.min(x - pillW / 2, canvasWidth - pillW - 2))
    const py = Math.max(2, y - pillH - 10)
    const baseline = py + padV - ascent
    return (
        <Group>
            <RoundedRect x={px} y={py} width={pillW} height={pillH} r={7} color={color} />
            <Text x={px + padH} y={baseline} text={value} font={font} color={textColor} />
        </Group>
    )
}

// Dashed horizontal reference line at a data value (no label).
export function GoalLine({ y, left, right, color }: { y: number; left: number; right: number; color: string }) {
    return (
        <Line p1={vec(left, y)} p2={vec(right, y)} color={color} strokeWidth={1.2} opacity={0.55}>
            <DashPathEffect intervals={[5, 4]} />
        </Line>
    )
}

// One bar (bar charts). Latest bar is full accent; earlier bars dim to 0.55; the pressed bar lifts to full.
// Returns null for zero/negative height (rest days) — the hook still runs so hook count stays stable.
export function BarRect({
    x,
    barWidth,
    top,
    bottom,
    color,
    isLast,
    index,
    matchedIndex,
    isActive,
}: {
    x: number
    barWidth: number
    top: number
    bottom: number
    color: string
    isLast: boolean
    index: number
    matchedIndex: SharedValue<number>
    isActive: boolean
}) {
    const opacity = useDerivedValue(() => {
        if (isActive && matchedIndex.value === index) return 1
        return isLast ? 1 : 0.55
    })
    const height = bottom - top
    if (height <= 0) return null
    return <RoundedRect x={x - barWidth / 2} y={top} width={barWidth} height={height} r={5} color={color} opacity={opacity} />
}
