import { fonts, useColors, useLogo, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { Fragment, useEffect, useMemo, useRef, type ComponentProps, type ReactNode } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

/**
 * Candidate replacements for AppLoadingScreen, previewed via the Spinner Lab dev page.
 * No new dependencies — a winning variant can be promoted into
 * components/GuardComponents/AppLoadingScreen.tsx as-is.
 */

type AnimatedViewStyle = ComponentProps<typeof Animated.View>['style']
type AnimatedTextStyle = ComponentProps<typeof Animated.Text>['style']

export type TextTreatment = 'current' | 'tracked' | 'hidden'
export type BreatheLevel = 'off' | 'subtle' | 'visible' | 'strong'
export type SpinnerProps = { message: string; textTreatment?: TextTreatment; breatheLevel?: BreatheLevel }

const BREATHE_LEVELS: Record<Exclude<BreatheLevel, 'off'>, { scale: number; duration: number }> = {
    subtle: { scale: 1.03, duration: 2000 },
    visible: { scale: 1.06, duration: 1600 },
    strong: { scale: 1.12, duration: 1100 },
}

const MARK_AREA = 148

function Scaffold({
    children,
    message,
    messageStyle,
    textTreatment = 'current',
}: {
    children: ReactNode
    message: string
    messageStyle?: AnimatedTextStyle
    textTreatment?: TextTreatment
}) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const reveal = useRef(new Animated.Value(textTreatment === 'hidden' ? 0 : 1)).current

    useEffect(() => {
        if (textTreatment !== 'hidden') return
        const anim = Animated.timing(reveal, {
            toValue: 1,
            duration: 450,
            delay: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        })
        anim.start()
        return () => anim.stop()
    }, [textTreatment, reveal])

    const revealRise = reveal.interpolate({ inputRange: [0, 1], outputRange: [6, 0] })
    // The motion already signals "in progress" — strip trailing ellipses for the tighter treatments.
    const display = textTreatment === 'current' ? message : message.replace(/[.…]+$/, '')
    const baseStyle = textTreatment === 'current' ? styles.message : styles.messageTracked
    const revealStyle = textTreatment === 'hidden' ? { opacity: reveal, transform: [{ translateY: revealRise }] } : null

    return (
        <View style={styles.container}>
            <View style={styles.markArea}>{children}</View>
            <Animated.Text style={[baseStyle, messageStyle, revealStyle]}>{display}</Animated.Text>
        </View>
    )
}

function LogoMark({ size = 100, style }: { size?: number; style?: AnimatedViewStyle }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const logo = useLogo()
    return (
        <Animated.View style={[styles.logoCircle, { width: size, height: size, borderRadius: size / 2 }, style]}>
            <Image source={logo} style={styles.logo} contentFit="contain" priority="high" />
        </Animated.View>
    )
}

function ArcRing({
    size = 128,
    stroke = 3,
    sweep = 0.24,
    duration = 1100,
    color,
    track,
    style,
}: {
    size?: number
    stroke?: number
    sweep?: number
    duration?: number
    color: string
    track?: string
    style?: AnimatedViewStyle
}) {
    const rotation = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        )
        loop.start()
        return () => loop.stop()
    }, [rotation, duration])

    const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    const r = (size - stroke) / 2
    const circumference = 2 * Math.PI * r

    return (
        <Animated.View style={[{ position: 'absolute', width: size, height: size, transform: [{ rotate: spin }] }, style]}>
            <Svg width={size} height={size}>
                {track ? <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" /> : null}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference * sweep} ${circumference * (1 - sweep)}`}
                    fill="none"
                />
            </Svg>
        </Animated.View>
    )
}

export function SpinnerArc({ message }: { message: string }) {
    const colors = useColors()
    return (
        <Scaffold message={message}>
            <ArcRing color={colors.workout} track={colors.hairline} />
            <LogoMark />
        </Scaffold>
    )
}

export function SpinnerBreathe({ message }: { message: string }) {
    const scale = useRef(new Animated.Value(1)).current

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.04, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        )
        loop.start()
        return () => loop.stop()
    }, [scale])

    return (
        <Scaffold message={message}>
            <LogoMark style={{ transform: [{ scale }] }} />
        </Scaffold>
    )
}

export function SpinnerPlate({ message }: { message: string }) {
    const colors = useColors()
    const rotation = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 1800,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        )
        loop.start()
        return () => loop.stop()
    }, [rotation])

    const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    const size = MARK_AREA
    const center = size / 2
    const rBody = 62
    const circumference = 2 * Math.PI * rBody
    const ticks = 32
    const tickPeriod = circumference / ticks

    return (
        <Scaffold message={message}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <Circle cx={center} cy={center} r={rBody} stroke={colors.surfaceInset} strokeWidth={16} fill="none" />
                <Circle cx={center} cy={center} r={rBody + 8} stroke={colors.hairline} strokeWidth={1} fill="none" />
                <Circle cx={center} cy={center} r={rBody - 8} stroke={colors.hairline} strokeWidth={1} fill="none" />
            </Svg>
            <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: spin }] }}>
                <Svg width={size} height={size}>
                    <Circle
                        cx={center}
                        cy={center}
                        r={rBody}
                        stroke={colors.border}
                        strokeWidth={10}
                        strokeDasharray={`2 ${tickPeriod - 2}`}
                        fill="none"
                    />
                    <Circle
                        cx={center}
                        cy={center}
                        r={rBody}
                        stroke={colors.workout}
                        strokeWidth={16}
                        strokeLinecap="round"
                        strokeDasharray={`${circumference * 0.16} ${circumference * 0.84}`}
                        fill="none"
                    />
                </Svg>
            </Animated.View>
            <LogoMark size={88} />
        </Scaffold>
    )
}

export function SpinnerRefined({ message }: { message: string }) {
    const colors = useColors()
    const logoIn = useRef(new Animated.Value(0)).current
    const arcIn = useRef(new Animated.Value(0)).current
    const messageIn = useRef(new Animated.Value(0)).current
    const breathe = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const breatheLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(breathe, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(breathe, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        )
        const entrance = Animated.stagger(250, [
            Animated.timing(logoIn, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(arcIn, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ])
        const messageReveal = Animated.timing(messageIn, {
            toValue: 1,
            duration: 450,
            delay: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        })
        entrance.start(({ finished }) => {
            if (finished) breatheLoop.start()
        })
        messageReveal.start()
        return () => {
            entrance.stop()
            messageReveal.stop()
            breatheLoop.stop()
        }
    }, [logoIn, arcIn, messageIn, breathe])

    const entranceScale = logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] })
    const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] })
    const messageRise = messageIn.interpolate({ inputRange: [0, 1], outputRange: [6, 0] })

    return (
        <Scaffold message={message} messageStyle={{ opacity: messageIn, transform: [{ translateY: messageRise }] }}>
            <ArcRing color={colors.workout} track={colors.hairline} style={{ opacity: arcIn }} />
            <LogoMark style={{ opacity: logoIn, transform: [{ scale: entranceScale }, { scale: breatheScale }] }} />
        </Scaffold>
    )
}

const BARBELL_W = 200
const BARBELL_H = 80
const PLATE_OFFSETS = [48, 61, 74]
const PLATE_HEIGHTS = [56, 42, 30]

export function SpinnerBarbell({ message }: { message: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const pairs = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(150),
                ...pairs.map((v) =>
                    Animated.timing(v, { toValue: 1, duration: 280, easing: Easing.out(Easing.back(1.7)), useNativeDriver: true })
                ),
                Animated.delay(650),
                Animated.parallel(
                    pairs.map((v) => Animated.timing(v, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }))
                ),
            ])
        )
        loop.start()
        return () => loop.stop()
    }, [pairs])

    return (
        <Scaffold message={message}>
            <View style={styles.barbellArea}>
                <View style={styles.bar} />
                <View style={[styles.collar, { left: BARBELL_W / 2 - 40 - 1.5 }]} />
                <View style={[styles.collar, { left: BARBELL_W / 2 + 40 - 1.5 }]} />
                {pairs.map((v, i) => {
                    const slideLeft = v.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] })
                    const slideRight = v.interpolate({ inputRange: [0, 1], outputRange: [22, 0] })
                    const top = (BARBELL_H - PLATE_HEIGHTS[i]) / 2
                    return (
                        <Fragment key={i}>
                            <Animated.View
                                style={[
                                    styles.plate,
                                    { height: PLATE_HEIGHTS[i], top, left: BARBELL_W / 2 - PLATE_OFFSETS[i] - 5, opacity: v, transform: [{ translateX: slideLeft }] },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.plate,
                                    { height: PLATE_HEIGHTS[i], top, left: BARBELL_W / 2 + PLATE_OFFSETS[i] - 5, opacity: v, transform: [{ translateX: slideRight }] },
                                ]}
                            />
                        </Fragment>
                    )
                })}
            </View>
        </Scaffold>
    )
}

export function SpinnerLogoDots({ message }: { message: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const logo = useLogo()
    const float = useRef(new Animated.Value(0)).current
    const driver = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const floatLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(float, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(float, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        )
        const dotLoop = Animated.loop(
            Animated.timing(driver, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
        )
        floatLoop.start()
        dotLoop.start()
        return () => {
            floatLoop.stop()
            dotLoop.stop()
        }
    }, [float, driver])

    const rise = float.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })

    return (
        <Scaffold message={message}>
            <Animated.View style={{ transform: [{ translateY: rise }] }}>
                <Image source={logo} style={styles.logoBare} contentFit="contain" priority="high" />
            </Animated.View>
            <View style={styles.dotsRow}>
                {[0, 1, 2].map((i) => {
                    const start = i * 0.15
                    const opacity = driver.interpolate({
                        inputRange: [start, start + 0.25, start + 0.5],
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp',
                    })
                    return <Animated.View key={i} style={[styles.dot, { opacity }]} />
                })}
            </View>
        </Scaffold>
    )
}

const WORDMARK_LETTERS = 'PLATES'.split('')

export function SpinnerWordmark({ message }: { message: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const driver = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(driver, { toValue: 1, duration: 1700, easing: Easing.linear, useNativeDriver: true })
        )
        loop.start()
        return () => loop.stop()
    }, [driver])

    return (
        <Scaffold message={message}>
            <View style={styles.wordmarkRow}>
                {WORDMARK_LETTERS.map((letter, i) => {
                    const start = i * 0.09
                    const lift = driver.interpolate({
                        inputRange: [start, start + 0.2, start + 0.4],
                        outputRange: [0, -7, 0],
                        extrapolate: 'clamp',
                    })
                    const opacity = driver.interpolate({
                        inputRange: [start, start + 0.2, start + 0.4],
                        outputRange: [0.45, 1, 0.45],
                        extrapolate: 'clamp',
                    })
                    return (
                        <Animated.Text key={i} style={[styles.wordmarkLetter, { opacity, transform: [{ translateY: lift }] }]}>
                            {letter}
                        </Animated.Text>
                    )
                })}
            </View>
        </Scaffold>
    )
}

export function SpinnerOrbit({ message }: { message: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const logo = useLogo()
    const outer = useRef(new Animated.Value(0)).current
    const inner = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const outerLoop = Animated.loop(
            Animated.timing(outer, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true })
        )
        const innerLoop = Animated.loop(
            Animated.timing(inner, { toValue: 1, duration: 2100, easing: Easing.linear, useNativeDriver: true })
        )
        outerLoop.start()
        innerLoop.start()
        return () => {
            outerLoop.stop()
            innerLoop.stop()
        }
    }, [outer, inner])

    const outerSpin = outer.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    const innerSpin = inner.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

    return (
        <Scaffold message={message}>
            <Animated.View style={[styles.orbitRing, { width: 144, height: 144, transform: [{ rotate: outerSpin }] }]}>
                <View style={[styles.orbitDot, { width: 8, height: 8, borderRadius: 4, left: 68, backgroundColor: colors.workout }]} />
            </Animated.View>
            <View style={[styles.orbitRing, { width: 116, height: 116, transform: [{ rotate: '150deg' }] }]}>
                <Animated.View style={[styles.orbitRing, { width: 116, height: 116, transform: [{ rotate: innerSpin }] }]}>
                    <View style={[styles.orbitDot, { width: 6, height: 6, borderRadius: 3, left: 55, backgroundColor: colors.nutrition }]} />
                </Animated.View>
            </View>
            <Image source={logo} style={styles.logoBareSmall} contentFit="contain" priority="high" />
        </Scaffold>
    )
}

export function SpinnerOrbitBreathe({ message, textTreatment, breatheLevel = 'subtle' }: SpinnerProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const logo = useLogo()
    const logoIn = useRef(new Animated.Value(0)).current
    const ringsIn = useRef(new Animated.Value(0)).current
    const breathe = useRef(new Animated.Value(0)).current
    const outer = useRef(new Animated.Value(0)).current
    const inner = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const outerLoop = Animated.loop(
            Animated.timing(outer, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true })
        )
        const innerLoop = Animated.loop(
            Animated.timing(inner, { toValue: 1, duration: 2100, easing: Easing.linear, useNativeDriver: true })
        )
        // Slow, and out of phase with the dots so the two rhythms read as separate systems.
        const level = breatheLevel === 'off' ? null : BREATHE_LEVELS[breatheLevel]
        const breatheLoop =
            level ?
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(breathe, { toValue: 1, duration: level.duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                        Animated.timing(breathe, { toValue: 0, duration: level.duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                    ])
                )
            :   null
        const entrance = Animated.stagger(250, [
            Animated.timing(logoIn, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(ringsIn, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ])
        entrance.start(({ finished }) => {
            if (finished) breatheLoop?.start()
        })
        outerLoop.start()
        innerLoop.start()
        return () => {
            entrance.stop()
            outerLoop.stop()
            innerLoop.stop()
            breatheLoop?.stop()
        }
    }, [logoIn, ringsIn, breathe, outer, inner, breatheLevel])

    const outerSpin = outer.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    const innerSpin = inner.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    const entranceScale = logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] })
    const breatheScale = breathe.interpolate({
        inputRange: [0, 1],
        outputRange: [1, breatheLevel === 'off' ? 1 : BREATHE_LEVELS[breatheLevel].scale],
    })

    return (
        <Scaffold message={message} textTreatment={textTreatment}>
            <Animated.View style={[styles.orbitRing, { width: 144, height: 144, opacity: ringsIn, transform: [{ rotate: outerSpin }] }]}>
                <View style={[styles.orbitDot, { width: 8, height: 8, borderRadius: 4, left: 68, backgroundColor: colors.workout }]} />
            </Animated.View>
            <Animated.View style={[styles.orbitRing, { width: 116, height: 116, opacity: ringsIn, transform: [{ rotate: '150deg' }] }]}>
                <Animated.View style={[styles.orbitRing, { width: 116, height: 116, transform: [{ rotate: innerSpin }] }]}>
                    <View style={[styles.orbitDot, { width: 6, height: 6, borderRadius: 3, left: 55, backgroundColor: colors.nutrition }]} />
                </Animated.View>
            </Animated.View>
            <Animated.View style={{ opacity: logoIn, transform: [{ scale: entranceScale }, { scale: breatheScale }] }}>
                <Image source={logo} style={styles.logoBareSmall} contentFit="contain" priority="high" />
            </Animated.View>
        </Scaffold>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
        },
        markArea: {
            width: MARK_AREA,
            height: MARK_AREA,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
        },
        logoCircle: {
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
        },
        logo: {
            width: '75%',
            height: '75%',
        },
        message: {
            color: colors.textMuted,
            fontSize: 15,
            fontFamily: fonts.regular,
            letterSpacing: 0.1,
        },
        messageTracked: {
            color: colors.textSecondary,
            fontSize: 12.5,
            fontFamily: fonts.semibold,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
        },
        barbellArea: {
            width: BARBELL_W,
            height: BARBELL_H,
        },
        bar: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: BARBELL_H / 2 - 2,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.border,
        },
        collar: {
            position: 'absolute',
            top: BARBELL_H / 2 - 7,
            width: 3,
            height: 14,
            borderRadius: 1.5,
            backgroundColor: colors.textMuted,
        },
        plate: {
            position: 'absolute',
            width: 10,
            borderRadius: 3,
            backgroundColor: colors.workout,
        },
        logoBare: {
            width: 112,
            height: 112,
        },
        logoBareSmall: {
            width: 96,
            height: 96,
        },
        dotsRow: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 18,
        },
        dot: {
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: colors.workout,
        },
        wordmarkRow: {
            flexDirection: 'row',
        },
        wordmarkLetter: {
            fontFamily: fonts.extrabold,
            fontSize: 30,
            color: colors.text,
            marginHorizontal: 2,
        },
        orbitRing: {
            position: 'absolute',
            justifyContent: 'flex-start',
        },
        orbitDot: {
            position: 'absolute',
            top: 0,
        },
    })
}
