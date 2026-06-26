import { fonts, type Colors } from '@/context/ThemeContext'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, type SharedValue } from 'react-native-reanimated'

/**
 * Press read-out pill (value + date) overlaid on a chart. Driven by victory-native's
 * chartPressState: position tracks the press x via reanimated; the text is synced into
 * React state on the JS thread. Kept as an RN overlay (not Skia) because a variable-width
 * text pill is far simpler to lay out and clamp this way.
 *
 * Render as an absolute sibling of the chart inside a flex:1 relative wrapper.
 */

type PressState = {
    isActive: SharedValue<boolean>
    x: { value: SharedValue<string>; position: SharedValue<number> }
    y: { value: { value: SharedValue<number>; position: SharedValue<number> } }
}

interface ChartReadoutPillProps {
    state: PressState
    isActive: boolean
    containerWidth: number
    colors: Colors
    formatValue: (value: number) => string
}

export default function ChartReadoutPill({ state, isActive, containerWidth, colors, formatValue }: ChartReadoutPillProps) {
    const [readout, setReadout] = useState<{ label: string; value: number } | null>(null)
    const [pillWidth, setPillWidth] = useState(72)

    useAnimatedReaction(
        () => ({ active: state.isActive.value, label: state.x.value.value, value: state.y.value.value.value }),
        (cur, prev) => {
            if (cur.active && (prev == null || cur.label !== prev.label || cur.value !== prev.value)) {
                runOnJS(setReadout)({ label: cur.label, value: cur.value })
            }
        },
    )

    const pillStyle = useAnimatedStyle(() => {
        const clampedMax = Math.max(4, containerWidth - pillWidth - 4)
        let tx = state.x.position.value - pillWidth / 2
        if (tx < 4) tx = 4
        if (tx > clampedMax) tx = clampedMax
        return { transform: [{ translateX: tx }], opacity: state.isActive.value ? 1 : 0 }
    })

    if (!isActive || !readout) return null

    return (
        <Animated.View
            style={[styles.pill, { backgroundColor: colors.surfaceInset, borderColor: colors.hairline }, pillStyle]}
            onLayout={(e) => setPillWidth(e.nativeEvent.layout.width)}
        >
            <Text style={[styles.value, { color: colors.text }]}>{formatValue(readout.value)}</Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>{readout.label}</Text>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    pill: {
        position: 'absolute',
        top: 0,
        left: 0,
        borderRadius: 9,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 7,
        paddingHorizontal: 11,
        alignItems: 'center',
    },
    value: {
        fontFamily: fonts.extrabold,
        fontSize: 15,
        lineHeight: 16,
    },
    date: {
        fontFamily: fonts.semibold,
        fontSize: 10,
        marginTop: 3,
    },
})
