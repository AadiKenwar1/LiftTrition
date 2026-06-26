import { fonts, useColors } from '@/context/ThemeContext'
import { useSettings } from '@/context/SettingsContext'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

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

    // Define gradient stops matching app theme
    const workoutStops = [
        { offset: '0%', color: '#4A95F3' },
        { offset: '50%', color: '#2F80ED' },
        { offset: '100%', color: '#1F6FD8' },
    ]

    const nutritionStops = [
        { offset: '0%', color: '#39D94B' },
        { offset: '50%', color: '#22C933' },
        { offset: '100%', color: '#1FB52E' },
    ]

    const gradientStops = useMemo(() => {
        return mode ? workoutStops : nutritionStops
    }, [mode])

    // Animated values
    const animatedValue = useRef(new Animated.Value(0)).current
    const numberValue = useRef(new Animated.Value(0)).current

    const [displayPercent, setDisplayPercent] = useState<number>(Math.round(actualPercent))

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: wheelPercent,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
        }).start()

        numberValue.setValue(displayPercent)
        Animated.timing(numberValue, {
            toValue: actualPercent,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
        }).start()

        const listener = numberValue.addListener(({ value }) => {
            setDisplayPercent(Math.round(value))
        })

        return () => {
            numberValue.removeListener(listener)
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
        const stops = mode ? workoutStops : nutritionStops
        if (p <= 0.5) {
            const t = p * 2 // 0->1 as p goes 0->0.5
            return lerpHex(stops[0].color, stops[1].color, t)
        } else {
            const t = (p - 0.5) * 2
            return lerpHex(stops[1].color, stops[2].color, t)
        }
    }, [wheelPercent, mode])

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

            <View style={styles.percentContainer}>{children ?? <Text style={[styles.percentText, { color: colors.text, fontSize }]}>{displayPercent}%</Text>}</View>
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
})
