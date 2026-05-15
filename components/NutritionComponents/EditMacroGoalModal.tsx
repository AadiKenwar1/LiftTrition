import { validateMacro } from '@/context/SettingsContext/functions/validator'
import { useLayoutEffect, useRef, useState } from 'react'
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export type MacroGoalKind = 'calories' | 'protein' | 'carbs' | 'fats'

const META: Record<MacroGoalKind, { title: string; unitSuffix: string }> = {
    calories: { title: 'Calories', unitSuffix: ' kcal' },
    protein: { title: 'Protein', unitSuffix: ' g' },
    carbs: { title: 'Carbs', unitSuffix: ' g' },
    fats: { title: 'Fats', unitSuffix: ' g' },
}

const OPEN_MS = 260
const CLOSE_MS = 200

type Props = {
    visible: boolean
    kind: MacroGoalKind | null
    initialValue: number
    onDismiss: () => void
    onSave: (value: number) => void
}

const ACCENT = '#22C922'

const openEasing = Easing.out(Easing.cubic)
const closeEasing = Easing.in(Easing.cubic)

export default function EditMacroGoalModal({ visible, kind, initialValue, onDismiss, onSave, backgroundColor }: Props) {
    const [draft, setDraft] = useState('')
    const backdropOpacity = useRef(new Animated.Value(0)).current
    const cardAnim = useRef(new Animated.Value(0)).current
    const dismissingRef = useRef(false)

    const translateY = cardAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
    })
    const scale = cardAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.94, 1],
    })

    // useLayoutEffect: start enter animation before paint (useEffect waits until after paint → felt lag)
    useLayoutEffect(() => {
        if (!visible || kind == null) return
        dismissingRef.current = false
        backdropOpacity.stopAnimation()
        cardAnim.stopAnimation()
        backdropOpacity.setValue(0)
        cardAnim.setValue(0)
        setDraft(String(Math.round(initialValue)))
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
    }, [visible, kind])

    const animateOutThen = (beforeDismiss?: () => void) => {
        if (dismissingRef.current) return
        dismissingRef.current = true
        Keyboard.dismiss()
        beforeDismiss?.()
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
                onDismiss()
            }
        })
    }

    const handleSave = () => {
        const parsed = parseFloat(draft.trim())
        if (!validateMacro(parsed)) return
        animateOutThen(() => onSave(Math.round(parsed)))
    }

    const handleCancel = () => {
        animateOutThen()
    }

    const meta = kind != null ? META[kind] : null

    return (
        <Modal visible={visible && kind != null} transparent animationType="none" onRequestClose={handleCancel}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardRoot}>
                {meta ?
                    <View style={styles.layerStack}>
                        <Animated.View style={[styles.scrim, { opacity: backdropOpacity }]}>
                            <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} accessibilityRole="button" accessibilityLabel="Dismiss" />
                        </Animated.View>
                        <View pointerEvents="box-none" style={styles.cardSlot}>
                            <Animated.View
                                style={{
                                    opacity: cardAnim,
                                    transform: [{ translateY }, { scale }],
                                }}
                            >
                                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                                    <Text style={styles.cardTitle}>Edit {meta.title}</Text>
                                    <Text style={styles.hint}>Daily goal ({meta.unitSuffix.trim()})</Text>
                                    <TextInput style={styles.input} value={draft} onChangeText={setDraft} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#555" selectTextOnFocus />
                                    <Text style={styles.consistencyNote}>Only this goal changes. Your other daily targets stay the same until you edit them.</Text>
                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                                            <Text style={styles.cancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: backgroundColor ? backgroundColor : '#D4F5D4' }]} onPress={handleSave} activeOpacity={0.8}>
                                            <Text style={styles.saveText}>Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Pressable>
                            </Animated.View>
                        </View>
                    </View>
                :   null}
            </KeyboardAvoidingView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    keyboardRoot: {
        flex: 1,
    },
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
    hint: {
        fontSize: 13,
        color: '#aaa',
        fontFamily: 'Poppins_400Regular',
        marginBottom: 14,
    },
    input: {
        backgroundColor: '#242424',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        color: '#fff',
        fontFamily: 'Poppins_500Medium',
        borderWidth: 2,
        borderColor: '#333',
    },
    consistencyNote: {
        fontSize: 12,
        color: '#aaa',
        lineHeight: 17,
        fontFamily: 'Poppins_500Medium',
        marginTop: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    cancelBtn: {
        flex: 1,
        height: 60,
        borderRadius: 16,
        backgroundColor: '#242424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#242424',
    },
    cancelText: {
        fontSize: 16,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    saveBtn: {
        flex: 1,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    saveText: {
        fontSize: 16,
        color: '#000',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
