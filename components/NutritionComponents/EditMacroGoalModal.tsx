import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { validateMacro } from '@/context/SettingsContext/functions/validator'
import { LinearGradient } from 'expo-linear-gradient'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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

const openEasing = Easing.out(Easing.cubic)
const closeEasing = Easing.in(Easing.cubic)

export default function EditMacroGoalModal({ visible, kind, initialValue, onDismiss, onSave }: Props) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
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
                                    <TextInput style={styles.input} value={draft} onChangeText={setDraft} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.placeholder} selectTextOnFocus />
                                    <Text style={styles.consistencyNote}>Only this goal changes. Your other daily targets stay the same until you edit them.</Text>
                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                                            <Text style={styles.cancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                                            <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveGradient}>
                                                <Text style={styles.saveText}>Save</Text>
                                            </LinearGradient>
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

function makeStyles(colors: Colors) {
    return StyleSheet.create({
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
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            padding: 22,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        cardTitle: {
            fontSize: 20,
            color: colors.text,
            fontFamily: fonts.semibold,
            marginBottom: 4,
        },
        hint: {
            fontSize: 13,
            color: colors.textSecondary,
            fontFamily: fonts.regular,
            marginBottom: 14,
        },
        input: {
            backgroundColor: colors.surfaceInset,
            borderRadius: radius.card,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 18,
            color: colors.text,
            fontFamily: fonts.medium,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        consistencyNote: {
            fontSize: 12,
            color: colors.textSecondary,
            lineHeight: 17,
            fontFamily: fonts.medium,
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
            borderRadius: radius.cardLg,
            backgroundColor: colors.surfaceInset,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        cancelText: {
            fontSize: 16,
            color: colors.textMuted,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        saveBtn: {
            flex: 1,
            height: 60,
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
        },
        saveGradient: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
        },
        saveText: {
            fontSize: 16,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
    })
}
