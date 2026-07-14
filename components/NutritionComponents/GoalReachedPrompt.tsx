import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { ShieldCheck, Trophy } from 'lucide-react-native'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Goal-crossing prompt (Issue 8). Same scrim/card/animation pattern as EditHeightModal.
 * Two variants:
 * - 'goalReached': fired the moment a weigh-in crosses goalWeight — the user chooses what's
 *   next. Scrim tap is a plain dismiss (banner stays, safety net stays armed); only the
 *   explicit "Keep Going" disarms the auto-maintain net.
 * - 'autoMaintain': announces the safety-net switch to maintenance after the user passed
 *   their goal by the deadband without answering.
 */
const OPEN_MS = 260
const CLOSE_MS = 200
const openEasing = Easing.out(Easing.cubic)
const closeEasing = Easing.in(Easing.cubic)

export type GoalReachedPromptVariant = 'goalReached' | 'autoMaintain'

type Props = {
    visible: boolean
    variant: GoalReachedPromptVariant
    goalWeight: number
    unitLabel: 'lbs' | 'kg'
    onSetNewGoal: () => void
    onDismiss: () => void
    onSwitchToMaintenance?: () => void
    onKeepGoing?: () => void
}

export default function GoalReachedPrompt({ visible, variant, goalWeight, unitLabel, onSetNewGoal, onDismiss, onSwitchToMaintenance, onKeepGoing }: Props) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const backdropOpacity = useRef(new Animated.Value(0)).current
    const cardAnim = useRef(new Animated.Value(0)).current
    const dismissingRef = useRef(false)

    const translateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })
    const scale = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] })

    // useLayoutEffect: start enter animation before paint (useEffect waits until after paint → felt lag)
    useLayoutEffect(() => {
        if (!visible) return
        dismissingRef.current = false
        backdropOpacity.stopAnimation()
        cardAnim.stopAnimation()
        backdropOpacity.setValue(0)
        cardAnim.setValue(0)
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 1, duration: OPEN_MS, easing: openEasing, useNativeDriver: true }),
            Animated.timing(cardAnim, { toValue: 1, duration: OPEN_MS, easing: openEasing, useNativeDriver: true }),
        ]).start()
    }, [visible])

    const animateOutThen = (action?: () => void) => {
        if (dismissingRef.current) return
        dismissingRef.current = true
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 0, duration: CLOSE_MS, easing: closeEasing, useNativeDriver: true }),
            Animated.timing(cardAnim, { toValue: 0, duration: CLOSE_MS, easing: closeEasing, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished) {
                dismissingRef.current = false
                action ? action() : onDismiss()
            }
        })
    }

    const isCrossing = variant === 'goalReached'
    const Icon = isCrossing ? Trophy : ShieldCheck
    const title = isCrossing ? 'Goal Reached!' : 'Goal Passed — Now Maintaining'
    const message = isCrossing
        ? `You're at your goal weight of ${goalWeight} ${unitLabel}. What's next?`
        : `You've passed your goal weight of ${goalWeight} ${unitLabel}, so we've switched you to maintenance to hold steady here. Set a new goal anytime.`

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={() => animateOutThen()}>
            <View style={styles.layerStack}>
                <Animated.View style={[styles.scrim, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => animateOutThen()} accessibilityRole="button" accessibilityLabel="Dismiss" />
                </Animated.View>
                <View pointerEvents="box-none" style={styles.cardSlot}>
                    <Animated.View style={{ opacity: cardAnim, transform: [{ translateY }, { scale }] }}>
                        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.iconCircle}>
                                <Icon size={30} color={colors.nutrition} strokeWidth={2.4} />
                            </View>
                            <Text style={styles.cardTitle}>{title}</Text>
                            <Text style={styles.message}>{message}</Text>

                            {isCrossing ?
                                <View style={styles.actions}>
                                    <TouchableOpacity onPress={() => animateOutThen(onSwitchToMaintenance)} activeOpacity={0.8} style={styles.primaryTouchable}>
                                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                                            <Text style={styles.primaryText}>Switch to Maintenance</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => animateOutThen(onSetNewGoal)} activeOpacity={0.8} style={styles.secondaryBtn}>
                                        <Text style={styles.secondaryText}>Set a New Goal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => animateOutThen(onKeepGoing)} activeOpacity={0.7} style={styles.ghostBtn}>
                                        <Text style={styles.ghostText}>Keep Going</Text>
                                    </TouchableOpacity>
                                </View>
                            :   <View style={styles.actions}>
                                    <TouchableOpacity onPress={() => animateOutThen()} activeOpacity={0.8} style={styles.primaryTouchable}>
                                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                                            <Text style={styles.primaryText}>Got It</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => animateOutThen(onSetNewGoal)} activeOpacity={0.8} style={styles.secondaryBtn}>
                                        <Text style={styles.secondaryText}>Set a New Goal</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                        </Pressable>
                    </Animated.View>
                </View>
            </View>
        </Modal>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        layerStack: { flex: 1 },
        scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(63, 63, 63, 0.85)' },
        cardSlot: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', paddingHorizontal: 28 },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            padding: 22,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            alignItems: 'center',
        },
        iconCircle: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.nutrition + '1A',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
        },
        cardTitle: {
            fontSize: 20,
            color: colors.text,
            fontFamily: fonts.semibold,
            letterSpacing: -0.5,
            textAlign: 'center',
            marginBottom: 6,
        },
        message: {
            fontSize: 14,
            color: colors.textSecondary,
            fontFamily: fonts.regular,
            lineHeight: 20,
            textAlign: 'center',
        },
        actions: {
            alignSelf: 'stretch',
            marginTop: 20,
            gap: 10,
        },
        primaryTouchable: {
            borderRadius: radius.cardLg,
            overflow: 'hidden',
        },
        primaryBtn: {
            height: 54,
            borderRadius: radius.cardLg,
            justifyContent: 'center',
            alignItems: 'center',
        },
        primaryText: {
            fontSize: 16,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        secondaryBtn: {
            height: 54,
            borderRadius: radius.cardLg,
            backgroundColor: colors.surfaceInset,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        secondaryText: {
            fontSize: 16,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        ghostBtn: {
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
        },
        ghostText: {
            fontSize: 15,
            color: colors.textMuted,
            letterSpacing: -0.3,
            fontFamily: fonts.semibold,
        },
    })
}
