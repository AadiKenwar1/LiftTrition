import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { Trophy } from 'lucide-react-native'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Goal-reached prompt (Issue 8). Same scrim/card/animation pattern as EditHeightModal.
 * Level-triggered by weigh-ins at/past the goal (hosted globally by GoalPromptHost): it
 * asks on every such weigh-in until answered. Scrim tap is a plain dismiss — the banner
 * stays and it asks again on the next weigh-in past goal; only "Keep Going" stops the
 * asking. Automation never switches goals; "Switch to Maintenance" is the consented tap.
 */
const OPEN_MS = 260
const CLOSE_MS = 200
const openEasing = Easing.out(Easing.cubic)
const closeEasing = Easing.in(Easing.cubic)

type Props = {
    visible: boolean
    goalWeight: number
    unitLabel: 'lbs' | 'kg'
    onSwitchToMaintenance: () => void
    onSetNewGoal: () => void
    onKeepGoing: () => void
    onDismiss: () => void
}

export default function GoalReachedPrompt({ visible, goalWeight, unitLabel, onSwitchToMaintenance, onSetNewGoal, onKeepGoing, onDismiss }: Props) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const backdropOpacity = useRef(new Animated.Value(0)).current
    const cardAnim = useRef(new Animated.Value(0)).current
    const dismissingRef = useRef(false)

    const translateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })
    const scale = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })

    // Reset to hidden before paint; the enter animation itself starts in Modal onShow —
    // after the native modal has actually presented — so a fresh mount with visible=true
    // (the GoalPromptHost path) can't swallow the animation in a first-present race.
    useLayoutEffect(() => {
        if (!visible) return
        dismissingRef.current = false
        backdropOpacity.stopAnimation()
        cardAnim.stopAnimation()
        backdropOpacity.setValue(0)
        cardAnim.setValue(0)
    }, [visible])

    // Celebratory entrance: scrim fades, the card springs up with a slight overshoot.
    const startEnterAnimation = () => {
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 1, duration: OPEN_MS, easing: openEasing, useNativeDriver: true }),
            Animated.spring(cardAnim, { toValue: 1, friction: 7, tension: 65, useNativeDriver: true }),
        ]).start()
    }

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

    return (
        <Modal visible={visible} transparent animationType="none" onShow={startEnterAnimation} onRequestClose={() => animateOutThen()}>
            <View style={styles.layerStack}>
                <Animated.View style={[styles.scrim, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => animateOutThen()} accessibilityRole="button" accessibilityLabel="Dismiss" />
                </Animated.View>
                <View pointerEvents="box-none" style={styles.cardSlot}>
                    <Animated.View style={{ opacity: cardAnim, transform: [{ translateY }, { scale }] }}>
                        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.iconCircle}>
                                <Trophy size={30} color={colors.nutrition} strokeWidth={2.4} />
                            </View>
                            <Text style={styles.cardTitle}>Goal Reached!</Text>
                            <Text style={styles.message}>{`You're at your goal weight of ${goalWeight} ${unitLabel}. What's next?`}</Text>

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
