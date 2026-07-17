import { radius, useColors, type Colors } from '@/context/ThemeContext'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native'

/**
 * Centered popup: fades (and gently scales) in to the middle of the screen instead
 * of sliding from the bottom. The card sizes to its content — it does not fill the
 * screen. Content-agnostic; the consumer owns `visible`/`onClose`. The exit
 * animation runs before unmount, so callers may flip `visible` to false immediately.
 */

export default function CenterPopup({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [mounted, setMounted] = useState(false)
    const progress = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (visible) setMounted(true)
    }, [visible])

    useEffect(() => {
        if (!mounted) return
        if (visible) {
            Animated.timing(progress, { toValue: 1, duration: 200, useNativeDriver: true }).start()
        } else {
            Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
                if (finished) setMounted(false)
            })
        }
    }, [visible, mounted, progress])

    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] })

    return (
        <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.root}>
                <Animated.View style={[styles.backdrop, { opacity: progress }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
                </Animated.View>
                <Animated.View style={[styles.card, { opacity: progress, transform: [{ scale }] }]}>{children}</Animated.View>
            </View>
        </Modal>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        root: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
        },
        backdrop: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
        },
        card: {
            maxWidth: 380,
            backgroundColor: colors.background,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingVertical: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 12,
        },
    })
}
