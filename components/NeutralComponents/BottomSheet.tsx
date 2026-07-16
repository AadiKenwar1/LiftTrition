import { useColors, type Colors } from '@/context/ThemeContext'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Animated bottom sheet: slides up on open, slides down on close, and can be
 * swiped away by dragging the handle down past a threshold (or with a flick).
 * Content-agnostic — pass any children. The consumer owns `visible`/`onClose`;
 * the exit animation runs before the sheet unmounts, so callers can flip
 * `visible` to false immediately (e.g. from a Confirm button) and still get the slide-out.
 */

const SCREEN_H = Dimensions.get('window').height
const CLOSE_DISTANCE = 120
const CLOSE_VELOCITY = 0.8

export default function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
    const colors = useColors()
    const insets = useSafeAreaInsets()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [mounted, setMounted] = useState(false)
    const translateY = useRef(new Animated.Value(SCREEN_H)).current
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        if (visible) setMounted(true)
    }, [visible])

    useEffect(() => {
        if (!mounted) return
        if (visible) {
            Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }).start()
        } else {
            Animated.timing(translateY, { toValue: SCREEN_H, duration: 240, useNativeDriver: true }).start(({ finished }) => {
                if (finished) setMounted(false)
            })
        }
    }, [visible, mounted, translateY])

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && g.dy > Math.abs(g.dx),
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) translateY.setValue(g.dy)
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
                    onCloseRef.current()
                } else {
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start()
                }
            },
        }),
    ).current

    const backdropOpacity = translateY.interpolate({
        inputRange: [0, SCREEN_H],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    })

    return (
        <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.root}>
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
                </Animated.View>
                <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 24, transform: [{ translateY }] }]}>
                    <View style={styles.handleZone} {...panResponder.panHandlers}>
                        <View style={styles.handle} />
                    </View>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        root: {
            flex: 1,
            justifyContent: 'flex-end',
        },
        backdrop: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
        },
        sheet: {
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
        },
        handleZone: {
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 8,
        },
        handle: {
            width: 40,
            height: 5,
            backgroundColor: colors.border,
            borderRadius: 3,
        },
    })
}
