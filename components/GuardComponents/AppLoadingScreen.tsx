import { fonts, useColors, useLogo, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
    message?: string
    loadFailed?: boolean
    onRetry?: () => void
    onSignOut?: () => void
}

const MARK_AREA = 148
const OUTER_ORBIT = 144
const INNER_ORBIT = 116

export function AppLoadingScreen({ message = 'Loading your profile...', loadFailed = false, onRetry, onSignOut }: Props) {
    const colors = useColors()
    const logo = useLogo()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const logoIn = useRef(new Animated.Value(0)).current
    const ringsIn = useRef(new Animated.Value(0)).current
    const breathe = useRef(new Animated.Value(0)).current
    const outer = useRef(new Animated.Value(0)).current
    const inner = useRef(new Animated.Value(0)).current
    const messageIn = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const outerLoop = Animated.loop(
            Animated.timing(outer, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true })
        )
        const innerLoop = Animated.loop(
            Animated.timing(inner, { toValue: 1, duration: 2100, easing: Easing.linear, useNativeDriver: true })
        )
        const breatheLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(breathe, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(breathe, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        )
        const entrance = Animated.stagger(250, [
            Animated.timing(logoIn, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(ringsIn, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ])
        // Text stays hidden for the first second so fast loads never flash a caption.
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
        outerLoop.start()
        innerLoop.start()
        messageReveal.start()
        return () => {
            entrance.stop()
            outerLoop.stop()
            innerLoop.stop()
            breatheLoop.stop()
            messageReveal.stop()
        }
    }, [logoIn, ringsIn, breathe, outer, inner, messageIn])

    const outerSpin = outer.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    const innerSpin = inner.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    const entranceScale = logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] })
    const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] })
    const messageRise = messageIn.interpolate({ inputRange: [0, 1], outputRange: [6, 0] })
    // The motion already signals "in progress" — the caption doesn't need an ellipsis.
    const display = loadFailed ? 'Having trouble loading your data' : message.replace(/[.…]+$/, '')

    return (
        <View style={styles.container}>
            <View style={styles.markArea}>
                <Animated.View style={[styles.orbitRing, styles.outerRing, { opacity: ringsIn, transform: [{ rotate: outerSpin }] }]}>
                    <View style={[styles.orbitDot, styles.outerDot]} />
                </Animated.View>
                <Animated.View style={[styles.orbitRing, styles.innerRingPhase, { opacity: ringsIn }]}>
                    <Animated.View style={[styles.orbitRing, styles.innerRing, { transform: [{ rotate: innerSpin }] }]}>
                        <View style={[styles.orbitDot, styles.innerDot]} />
                    </Animated.View>
                </Animated.View>
                <Animated.View style={{ opacity: logoIn, transform: [{ scale: entranceScale }, { scale: breatheScale }] }}>
                    <Image source={logo} style={styles.logo} contentFit="contain" priority="high" />
                </Animated.View>
            </View>
            <Animated.Text style={[styles.message, { opacity: messageIn, transform: [{ translateY: messageRise }] }]}>
                {display}
            </Animated.Text>
            {loadFailed && onRetry && (
                <Animated.View style={[styles.linkRow, { opacity: messageIn, transform: [{ translateY: messageRise }] }]}>
                    <TouchableOpacity
                        onPress={onRetry}
                        activeOpacity={0.7}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Retry"
                        style={styles.linkTap}
                    >
                        <Text style={[styles.message, styles.retryLink]}>Tap to retry</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
            {loadFailed && onSignOut && (
                <Animated.View style={[styles.linkRow, { opacity: messageIn, transform: [{ translateY: messageRise }] }]}>
                    <TouchableOpacity
                        onPress={onSignOut}
                        activeOpacity={0.7}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Sign out"
                        style={styles.linkTap}
                    >
                        <Text style={[styles.message, styles.signOutLink]}>Sign out</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
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
        orbitRing: {
            position: 'absolute',
        },
        outerRing: {
            width: OUTER_ORBIT,
            height: OUTER_ORBIT,
        },
        innerRingPhase: {
            width: INNER_ORBIT,
            height: INNER_ORBIT,
            transform: [{ rotate: '150deg' }],
        },
        innerRing: {
            width: INNER_ORBIT,
            height: INNER_ORBIT,
        },
        orbitDot: {
            position: 'absolute',
            top: 0,
        },
        outerDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            left: OUTER_ORBIT / 2 - 4,
            backgroundColor: colors.workout,
        },
        innerDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            left: INNER_ORBIT / 2 - 3,
            backgroundColor: colors.nutrition,
        },
        logo: {
            width: 96,
            height: 96,
        },
        message: {
            color: colors.textSecondary,
            fontSize: 12.5,
            fontFamily: fonts.semibold,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
        },
        linkRow: {
            marginTop: 4,
        },
        // >=44pt tap target (Apple minimum) even though the label line is ~12.5pt.
        linkTap: {
            minHeight: 44,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 16,
        },
        retryLink: {
            color: colors.workout,
        },
        signOutLink: {
            color: colors.textSecondary,
        },
    })
}
