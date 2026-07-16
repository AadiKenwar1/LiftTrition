import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface PromptCardProps {
    icon: React.ComponentType<any>
    title: string
    message: string
    ctaLabel: string
    onPress: () => void
    onGoBack?: () => void
}

const OPEN_MS = 260
const CLOSE_MS = 200
const openEasing = Easing.out(Easing.cubic)
const closeEasing = Easing.in(Easing.cubic)

// Shared overlay prompt card (upsell / permission / settings) shown over any screen.
// Same entrance motion as GoalReachedPrompt: scrim fades, card springs up. Rendered
// inline (not a Modal) so the scrim respects the host sheet's rounded corners. The
// primary CTA fires immediately (it navigates away or re-renders the screen — e.g.
// camera requestPermission); only Go Back animates out first.
export default function PromptCard({ icon: Icon, title, message, ctaLabel, onPress, onGoBack }: PromptCardProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const backdropOpacity = useRef(new Animated.Value(0)).current
    const cardAnim = useRef(new Animated.Value(0)).current
    const dismissingRef = useRef(false)

    const translateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })
    const scale = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })

    useLayoutEffect(() => {
        backdropOpacity.setValue(0)
        cardAnim.setValue(0)
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 1, duration: OPEN_MS, easing: openEasing, useNativeDriver: true }),
            Animated.spring(cardAnim, { toValue: 1, friction: 7, tension: 65, useNativeDriver: true }),
        ]).start()
    }, [])

    const animateOutThen = (action: () => void) => {
        if (dismissingRef.current) return
        dismissingRef.current = true
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 0, duration: CLOSE_MS, easing: closeEasing, useNativeDriver: true }),
            Animated.timing(cardAnim, { toValue: 0, duration: CLOSE_MS, easing: closeEasing, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished) action()
        })
    }

    return (
        <View style={styles.layerStack}>
            <Animated.View style={[styles.scrim, { opacity: backdropOpacity }]} />
            <View pointerEvents="box-none" style={styles.cardSlot}>
                <Animated.View style={[styles.cardAnim, { opacity: cardAnim, transform: [{ translateY }, { scale }] }]}>
                    <View style={styles.card}>
                        <View style={styles.iconCircle}>
                            <Icon size={30} color={colors.nutrition} strokeWidth={2.4} />
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.ctaTouchable}>
                            <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                                <Text style={styles.ctaText}>{ctaLabel}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        {onGoBack && (
                            <TouchableOpacity onPress={() => animateOutThen(onGoBack)} style={styles.goBackButton} activeOpacity={0.5}>
                                <Text style={styles.goBackText}>Go Back</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        layerStack: {
            ...StyleSheet.absoluteFillObject,
        },
        scrim: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
        },
        cardSlot: {
            ...StyleSheet.absoluteFillObject,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
        },
        cardAnim: {
            width: '100%',
        },
        card: {
            width: '100%',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingVertical: 28,
            paddingHorizontal: 24,
        },
        iconCircle: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.nutrition + '1A',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
        },
        title: {
            fontSize: 22,
            color: colors.text,
            marginBottom: 6,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        message: {
            fontSize: 14,
            color: colors.labelMuted,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24,
            fontFamily: fonts.regular,
            letterSpacing: 0.2,
        },
        ctaTouchable: {
            width: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
        },
        cta: {
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ctaText: {
            fontSize: 17,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        goBackButton: {
            paddingVertical: 14,
            paddingHorizontal: 24,
            marginTop: 4,
        },
        goBackText: {
            fontSize: 16,
            color: colors.labelMuted,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
    })
}
