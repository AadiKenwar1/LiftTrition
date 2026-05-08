import {
    UploadFlushNotConnectedError,
    UploadFlushTimeoutError,
    flushUploadsOrThrow,
} from '@/lib/powersync/FlushUploads'
import { ensurePowerSyncConnected } from '@/lib/powersync/orchestrator'
import { useLayoutEffect, useRef } from 'react'
import {
    ActivityIndicator,
    Animated,
    Easing,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

const OPEN_MS = 260
const CLOSE_MS = 200
const openEasing = Easing.out(Easing.cubic)
const closeEasing = Easing.in(Easing.cubic)

const NOTE = 'Retries sync over the internet; Wi‑Fi is usually more reliable than cellular.'

export type SyncPopupPhase = 'loading' | 'success' | 'error'

type Props = {
    visible: boolean
    phase: SyncPopupPhase
    errorMessage?: string
    onClose: () => void
    onRetry: () => void
}

export async function runSyncRetry(
    userId: string | undefined,
    setPhase: (p: SyncPopupPhase) => void,
    setError: (msg: string | undefined) => void,
    onSuccess: () => void,
): Promise<void> {
    setPhase('loading')
    setError(undefined)

    if (!userId) {
        setPhase('error')
        setError('Sign in to sync your data.')
        return
    }

    try {
        await ensurePowerSyncConnected('settings_retry_update')
        await flushUploadsOrThrow({ timeoutMs: 60_000 })
        setPhase('success')
        onSuccess()
    } catch (e: unknown) {
        let msg = 'Could not finish updating. Try Wi‑Fi or check your connection.'
        if (e instanceof UploadFlushNotConnectedError) {
            msg = 'Not connected. Check your internet or try Wi‑Fi.'
        } else if (e instanceof UploadFlushTimeoutError) {
            msg = 'Timed out waiting for uploads. Try again on Wi‑Fi.'
        } else if (e instanceof Error && e.message) {
            msg = e.message
        }
        setPhase('error')
        setError(msg)
    }
}

export default function SyncPopup({ visible, phase, errorMessage, onClose, onRetry }: Props) {
    const backdropOpacity = useRef(new Animated.Value(0)).current
    const cardAnim = useRef(new Animated.Value(0)).current
    const dismissingRef = useRef(false)

    const translateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })
    const scale = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] })

    useLayoutEffect(() => {
        if (!visible) return
        dismissingRef.current = false
        backdropOpacity.stopAnimation()
        cardAnim.stopAnimation()
        backdropOpacity.setValue(0)
        cardAnim.setValue(0)
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: OPEN_MS,
                easing: openEasing,
                useNativeDriver: true,
            }),
            Animated.timing(cardAnim, {
                toValue: 1,
                duration: OPEN_MS,
                easing: openEasing,
                useNativeDriver: true,
            }),
        ]).start()
    }, [visible])

    const animateOutThen = (cb: () => void) => {
        if (dismissingRef.current) return
        dismissingRef.current = true
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: CLOSE_MS,
                easing: closeEasing,
                useNativeDriver: true,
            }),
            Animated.timing(cardAnim, {
                toValue: 0,
                duration: CLOSE_MS,
                easing: closeEasing,
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) {
                dismissingRef.current = false
                cb()
            }
        })
    }

    const handleClose = () => animateOutThen(onClose)

    const canDismissViaBackdrop = phase !== 'loading'

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={() => {
                if (canDismissViaBackdrop) handleClose()
            }}
        >
            <View style={styles.layerStack}>
                <Animated.View style={[styles.scrim, { opacity: backdropOpacity }]}>
                    {canDismissViaBackdrop ? (
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={handleClose}
                            accessibilityRole="button"
                            accessibilityLabel="Dismiss"
                        />
                    ) : null}
                </Animated.View>

                <View pointerEvents="box-none" style={styles.cardSlot}>
                    <Animated.View
                        style={{
                            opacity: cardAnim,
                            transform: [{ translateY }, { scale }],
                        }}
                    >
                        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
                            <Text style={styles.cardTitle}>Retry update</Text>
                            <Text style={styles.note}>{NOTE}</Text>

                            {phase === 'loading' ? (
                                <View style={styles.statusRow}>
                                    <ActivityIndicator color="#fff" />
                                    <Text style={styles.statusText}>Connecting and uploading changes…</Text>
                                </View>
                            ) : null}

                            {phase === 'success' ? (
                                <Text style={styles.successText}>You're up to date</Text>
                            ) : null}

                            {phase === 'error' ? (
                                <>
                                    <Text style={styles.errorText}>{errorMessage}</Text>
                                    <View style={styles.actions}>
                                        <TouchableOpacity
                                            style={styles.cancelBtn}
                                            onPress={handleClose}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.cancelText}>Dismiss</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.retryBtn}
                                            onPress={onRetry}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.retryText}>Try again</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : null}
                        </Pressable>
                    </Animated.View>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    layerStack: {
        flex: 1,
    },
    scrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(63, 63, 63, 0.85)',
    },
    cardSlot: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    card: {
        backgroundColor: '#121212',
        borderRadius: 16,
        padding: 22,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    cardTitle: {
        fontSize: 20,
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 4,
    },
    note: {
        fontSize: 13,
        color: '#aaa',
        fontFamily: 'Poppins_400Regular',
        lineHeight: 18,
        marginBottom: 18,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusText: {
        flex: 1,
        fontSize: 14,
        color: '#ccc',
        fontFamily: 'Poppins_400Regular',
    },
    successText: {
        fontSize: 15,
        color: '#7dcea0',
        fontFamily: 'Poppins_600SemiBold',
    },
    errorText: {
        fontSize: 14,
        color: '#f1948a',
        lineHeight: 20,
        fontFamily: 'Poppins_400Regular',
        marginBottom: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#242424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#242424',
    },
    cancelText: {
        fontSize: 15,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    retryBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#D4F5D4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryText: {
        fontSize: 15,
        color: '#000',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
