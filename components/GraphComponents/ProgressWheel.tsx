import { fonts, useColors } from '@/context/ThemeContext'
import { useSettings } from '@/context/SettingsContext'
import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, StyleSheet, TextInput, View } from 'react-native'
import Reanimated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
// TextInput whose native `text` prop is driven on the UI thread, so the count-up number
// updates each frame without a React re-render (the ReText pattern).
const AnimatedTextInput = Reanimated.createAnimatedComponent(TextInput)

function lerpHex(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16)
    const g1 = parseInt(c1.slice(3, 5), 16)
    const b1 = parseInt(c1.slice(5, 7), 16)
    const r2 = parseInt(c2.slice(1, 3), 16)
    const g2 = parseInt(c2.slice(3, 5), 16)
    const b2 = parseInt(c2.slice(5, 7), 16)
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const ANIMATION_DURATION = 1000

interface ProgressWheelProps {
    percent: number
    size?: number
    strokeWidth?: number
    fontSize?: number
    /** Solid stroke color. When omitted, the mode-based gradient is used (legacy behavior). */
    color?: string
    /** Track color. Defaults to the theme's ringTrack token. */
    trackColor?: string
    /** Custom center content. When omitted, renders the rounded percentage. */
    children?: React.ReactNode
}

export default function ProgressWheel({ percent = 0, size = 120, strokeWidth = 12, fontSize = 32, color, trackColor, children }: ProgressWheelProps) {
    const actualPercent = isNaN(percent) || !isFinite(percent) ? 0 : Math.max(0, percent)
    const wheelPercent = Math.min(actualPercent, 100)
    const { mode } = useSettings()
    const colors = useColors()

    // Build 3-stop gradient from the theme's 2-stop brand gradients (start, lerped mid, end)
    // so the rings track the palette instead of hardcoded hexes.
    const gradientStops = useMemo(() => {
        const [start, end] = mode ? colors.workoutGradient : colors.nutritionGradient
        return [
            { offset: '0%', color: start },
            { offset: '50%', color: lerpHex(start, end, 0.5) },
            { offset: '100%', color: end },
        ]
    }, [mode, colors])

    // Arc fill: RN Animated value, native-driven (drives strokeDashoffset, never re-renders).
    const animatedValue = useRef(new Animated.Value(0)).current
    // Count-up number: Reanimated shared value animated on the UI thread — no per-frame setState.
    // Seeded to the rounded target so first paint (before the effect below starts the count-up)
    // already shows the right number, matching the native `defaultValue` seed below.
    const initialPercent = Math.round(actualPercent)
    const numberValue = useSharedValue(initialPercent)

    // Push the formatted number to the label's native `text` prop from the UI thread, so the
    // count-up updates without re-rendering the SVG/gradient tree each frame.
    const numberProps = useAnimatedProps<{ text: string; defaultValue: string }>(() => {
        const label = `${Math.round(numberValue.value)}%`
        return { text: label, defaultValue: label }
    })

    useEffect(() => {
        const arc = Animated.timing(animatedValue, {
            toValue: wheelPercent,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
        })
        arc.start()

        // Count the number up in lockstep with the arc: same duration and the same in-out ease
        // that RN's Animated.timing uses by default, so the motion is visually identical.
        numberValue.value = withTiming(actualPercent, { duration: ANIMATION_DURATION, easing: Easing.inOut(Easing.ease) })

        // Cancel both animations on unmount / dep-change so a torn-down wheel leaves no running
        // timer (prevents overlapping count-ups and keeps the jest worker from leaking the
        // Reanimated timing handle).
        return () => {
            arc.stop()
            cancelAnimation(numberValue)
        }
    }, [actualPercent, wheelPercent])

    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius

    // Marker position at current percentage (clockwise from right, 3 o'clock — rotated to top by the <G> below)
    const angle = (wheelPercent / 100) * 2 * Math.PI
    const markerX = size / 2 + radius * Math.cos(angle)
    const markerY = size / 2 + radius * Math.sin(angle)
    const markerRadius = Math.max(strokeWidth * 0.5, 4)

    // Interpolate marker color from gradient based on current percent
    const markerColor = useMemo(() => {
        const p = wheelPercent / 100
        if (p <= 0.5) {
            const t = p * 2 // 0->1 as p goes 0->0.5
            return lerpHex(gradientStops[0].color, gradientStops[1].color, t)
        } else {
            const t = (p - 0.5) * 2
            return lerpHex(gradientStops[1].color, gradientStops[2].color, t)
        }
    }, [wheelPercent, gradientStops])

    const strokeColor = color ?? 'url(#grad)'
    const track = trackColor ?? colors.ringTrack
    const markerFill = color ?? markerColor

    const strokeDashoffset = animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0],
        extrapolate: 'clamp',
    })

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size}>
                <Defs>
                    <LinearGradient id="grad" x1="100%" y1="50%" x2="0%" y2="0%">
                        {gradientStops.map((stop, index) => (
                            <Stop key={index} offset={stop.offset} stopColor={stop.color} />
                        ))}
                    </LinearGradient>
                </Defs>

                <Circle stroke={track} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />

                <G transform={`rotate(-90, ${size / 2}, ${size / 2})`}>
                    <AnimatedCircle stroke={strokeColor} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />

                    {wheelPercent === 0 && <Circle cx={markerX} cy={markerY} r={markerRadius} fill={markerFill} stroke="rgba(0,0,0,0.0)" strokeWidth={1} />}
                </G>
            </Svg>

            <View style={styles.percentContainer}>
                {children ?? (
                    <AnimatedTextInput
                        editable={false}
                        underlineColorAndroid="transparent"
                        defaultValue={`${initialPercent}%`}
                        animatedProps={numberProps}
                        style={[styles.percentText, styles.percentInput, { color: colors.text, fontSize, width: size }]}
                    />
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentText: {
        letterSpacing: -1,
        fontFamily: fonts.bold,
    },
    // Neutralize TextInput chrome so the animated label reads exactly like the old <Text>:
    // no default padding, centered across the wheel width, and never intercepting touches.
    percentInput: {
        padding: 0,
        textAlign: 'center',
        includeFontPadding: false,
        pointerEvents: 'none',
    },
})
