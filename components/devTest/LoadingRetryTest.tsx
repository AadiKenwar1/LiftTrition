import { FONT_FAMILY, radius, useColors, useLogo, type Colors } from '@/context/ThemeContext'
import { Image } from 'expo-image'
import { RotateCcw } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'
import MockupShell from './mockups/MockupShell'

/**
 * F6b preview: retry-affordance variants for AppLoadingScreen's error state
 * (audit issue 6). Pick a winner here, then implement it in the real component.
 */

const MARK_AREA = 148
const OUTER_ORBIT = 144
const INNER_ORBIT = 116

const VARIANTS = {
    quiet: 'Quiet line',
    pill: 'Pill',
    card: 'Card',
    mark: 'Mark',
} as const

type Variant = keyof typeof VARIANTS
type LoadState = 'loading' | 'error' | 'retrying'

const FAMILIES = {
    poppins: 'Poppins_600SemiBold',
    archivo: 'Archivo_600SemiBold',
} as const

type FontKey = keyof typeof FAMILIES

export default function LoadingRetryTest() {
    const [variant, setVariant] = useState<Variant>('quiet')
    const [state, setState] = useState<LoadState>('error')
    const [fontKey, setFontKey] = useState<FontKey>(FONT_FAMILY)
    const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(
        () => () => {
            if (retryTimer.current) clearTimeout(retryTimer.current)
        },
        [],
    )

    const setStateManually = (s: LoadState) => {
        if (retryTimer.current) clearTimeout(retryTimer.current)
        setState(s)
    }

    const simulateRetry = () => {
        if (retryTimer.current) clearTimeout(retryTimer.current)
        setState('retrying')
        retryTimer.current = setTimeout(() => setState('error'), 1600)
    }

    const controls = (
        <>
            <Field label="Variant">
                <Segmented
                    value={variant}
                    onChange={setVariant}
                    options={(Object.keys(VARIANTS) as Variant[]).map((v) => ({ label: VARIANTS[v], value: v }))}
                />
            </Field>
            <Field label="State">
                <Segmented
                    value={state}
                    onChange={setStateManually}
                    options={[
                        { label: 'Loading', value: 'loading' },
                        { label: 'Error', value: 'error' },
                        { label: 'Retrying', value: 'retrying' },
                    ]}
                />
            </Field>
            <Field label="Font">
                <Segmented
                    value={fontKey}
                    onChange={setFontKey}
                    options={[
                        { label: 'Poppins', value: 'poppins' },
                        { label: 'Archivo', value: 'archivo' },
                    ]}
                />
            </Field>
        </>
    )

    return (
        <MockupShell controls={controls}>
            <RetryPreview variant={variant} state={state} family={FAMILIES[fontKey]} onRetry={simulateRetry} />
        </MockupShell>
    )
}

function RetryPreview({ variant, state, family, onRetry }: { variant: Variant; state: LoadState; family: string; onRetry: () => void }) {
    const colors = useColors()
    const logo = useLogo()
    const styles = useMemo(() => makeStyles(colors, family), [colors, family])
    const outer = useRef(new Animated.Value(0)).current
    const inner = useRef(new Animated.Value(0)).current
    const affordanceIn = useRef(new Animated.Value(0)).current

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

    // Same fade+rise the real caption uses, replayed whenever the error state (re)appears.
    useEffect(() => {
        affordanceIn.setValue(0)
        if (state === 'error') {
            Animated.timing(affordanceIn, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
        }
    }, [state, variant, affordanceIn])

    const outerSpin = outer.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    const innerSpin = inner.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    const affordanceRise = affordanceIn.interpolate({ inputRange: [0, 1], outputRange: [6, 0] })
    const affordanceStyle = { opacity: affordanceIn, transform: [{ translateY: affordanceRise }] }

    const isError = state === 'error'
    const dimMark = isError && variant === 'pill'
    const hideDots = isError && variant === 'mark'
    const dimLogo = isError && variant === 'mark'

    const caption =
        state === 'loading' ? 'Loading your profile'
        : state === 'retrying' ? 'Retrying'
        : variant === 'card' ? ''
        : 'Having trouble loading your data'

    return (
        <View style={styles.container}>
            <View style={[styles.markArea, dimMark && styles.markDimmed]}>
                <Animated.View style={[styles.orbitRing, styles.outerRing, hideDots && styles.hidden, { transform: [{ rotate: outerSpin }] }]}>
                    <View style={[styles.orbitDot, styles.outerDot]} />
                </Animated.View>
                <View style={[styles.orbitRing, styles.innerRingPhase, hideDots && styles.hidden]}>
                    <Animated.View style={[styles.orbitRing, styles.innerRing, { transform: [{ rotate: innerSpin }] }]}>
                        <View style={[styles.orbitDot, styles.innerDot]} />
                    </Animated.View>
                </View>
                <Image source={logo} style={[styles.logo, dimLogo && styles.logoDimmed]} contentFit="contain" />
                {isError && variant === 'mark' && (
                    <Animated.View style={[StyleSheet.absoluteFill, styles.markButtonWrap, affordanceStyle]}>
                        <TouchableOpacity style={styles.markButton} onPress={onRetry} activeOpacity={0.7} hitSlop={8}>
                            <RotateCcw size={26} color={colors.workout} strokeWidth={2.2} />
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>

            {caption !== '' && <Text style={styles.message}>{caption}</Text>}

            {isError && variant === 'quiet' && (
                <Animated.View style={affordanceStyle}>
                    <TouchableOpacity onPress={onRetry} activeOpacity={0.7} hitSlop={10}>
                        <Text style={styles.quietLink}>Tap to retry</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {isError && variant === 'pill' && (
                <Animated.View style={affordanceStyle}>
                    <TouchableOpacity style={styles.pillButton} onPress={onRetry} activeOpacity={0.8}>
                        <Text style={styles.pillButtonText}>Retry</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {isError && variant === 'card' && (
                <Animated.View style={[styles.card, affordanceStyle]}>
                    <Text style={styles.cardText}>We're having trouble loading your data.</Text>
                    <TouchableOpacity style={styles.cardButton} onPress={onRetry} activeOpacity={0.7}>
                        <Text style={styles.cardButtonText}>Retry</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    )
}

function makeStyles(colors: Colors, family: string) {
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
        markDimmed: {
            opacity: 0.45,
        },
        hidden: {
            opacity: 0,
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
        logoDimmed: {
            opacity: 0.35,
        },
        markButtonWrap: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        markButton: {
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.workout,
            backgroundColor: colors.surface,
        },
        message: {
            color: colors.textSecondary,
            fontSize: 12.5,
            fontFamily: family,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
        },
        quietLink: {
            color: colors.workout,
            fontSize: 12.5,
            fontFamily: family,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            marginTop: 12,
        },
        pillButton: {
            marginTop: 18,
            paddingVertical: 12,
            paddingHorizontal: 28,
            borderRadius: 999,
            backgroundColor: colors.workout,
        },
        pillButtonText: {
            color: '#fff',
            fontSize: 14,
            fontFamily: family,
        },
        card: {
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        cardText: {
            flex: 1,
            color: colors.textSecondary,
            fontSize: 13,
            fontFamily: family,
        },
        cardButton: {
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: radius.chip,
            borderWidth: 1,
            borderColor: colors.workout,
        },
        cardButtonText: {
            color: colors.workout,
            fontSize: 13,
            fontFamily: family,
        },
    })
}
