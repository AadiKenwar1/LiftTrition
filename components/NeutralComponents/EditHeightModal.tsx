import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { feetInchesToInches, inchesToFeetInches } from '@/lib/utils/unitConversions'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

/**
 * Inline height editor (sibling of EditMacroGoalModal — same scrim/card/animation pattern). Unit-aware:
 * imperial shows ft + in side-by-side, metric a single cm field. Validates with the shared
 * validateHeightWeight (Alert-style; stays open on failure) and only calls onSave with the TOTAL height
 * (inches or cm) when valid — the caller owns the macro recalc + setSettings commit.
 */
const OPEN_MS = 260
const CLOSE_MS = 200
const openEasing = Easing.out(Easing.cubic)
const closeEasing = Easing.in(Easing.cubic)

type Props = {
    visible: boolean
    unitSystem: 'imperial' | 'metric'
    initialHeight: number
    currentWeight: number
    onDismiss: () => void
    onSave: (totalHeight: number) => void
}

export default function EditHeightModal({ visible, unitSystem, initialHeight, currentWeight, onDismiss, onSave }: Props) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [heightFt, setHeightFt] = useState('')
    const [heightIn, setHeightIn] = useState('')
    const [heightCm, setHeightCm] = useState('')
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
        if (unitSystem === 'imperial') {
            const { feet, inches } = inchesToFeetInches(initialHeight)
            setHeightFt(feet.toString())
            setHeightIn(inches.toString())
        } else {
            setHeightCm(initialHeight.toString())
        }
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 1, duration: OPEN_MS, easing: openEasing, useNativeDriver: true }),
            Animated.timing(cardAnim, { toValue: 1, duration: OPEN_MS, easing: openEasing, useNativeDriver: true }),
        ]).start()
    }, [visible])

    const animateOutThen = (beforeDismiss?: () => void) => {
        if (dismissingRef.current) return
        dismissingRef.current = true
        Keyboard.dismiss()
        beforeDismiss?.()
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 0, duration: CLOSE_MS, easing: closeEasing, useNativeDriver: true }),
            Animated.timing(cardAnim, { toValue: 0, duration: CLOSE_MS, easing: closeEasing, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished) {
                dismissingRef.current = false
                onDismiss()
            }
        })
    }

    const handleSave = () => {
        const totalHeight = unitSystem === 'imperial' ? feetInchesToInches(Number(heightFt) || 0, Number(heightIn) || 0) : Number(heightCm) || 0
        if (!validateHeightWeight(totalHeight, currentWeight, unitSystem)) return
        animateOutThen(() => onSave(totalHeight))
    }

    const handleCancel = () => {
        animateOutThen()
    }

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardRoot}>
                <View style={styles.layerStack}>
                    <Animated.View style={[styles.scrim, { opacity: backdropOpacity }]}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} accessibilityRole="button" accessibilityLabel="Dismiss" />
                    </Animated.View>
                    <View pointerEvents="box-none" style={styles.cardSlot}>
                        <Animated.View style={{ opacity: cardAnim, transform: [{ translateY }, { scale }] }}>
                            <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                                <Text style={styles.cardTitle}>Edit Height</Text>
                                <Text style={styles.hint}>{unitSystem === 'imperial' ? 'Feet and inches' : 'Centimeters'}</Text>
                                {unitSystem === 'imperial' ?
                                    <View style={styles.ftInRow}>
                                        <View style={[styles.inputWrapper, { flex: 1 }]}>
                                            <TextInput style={styles.input} value={heightFt} onChangeText={setHeightFt} keyboardType="numeric" placeholder="5" placeholderTextColor={colors.placeholder} selectTextOnFocus />
                                            <Text style={styles.unitText}>ft</Text>
                                        </View>
                                        <View style={[styles.inputWrapper, { flex: 1 }]}>
                                            <TextInput style={styles.input} value={heightIn} onChangeText={setHeightIn} keyboardType="numeric" placeholder="11" placeholderTextColor={colors.placeholder} selectTextOnFocus />
                                            <Text style={styles.unitText}>in</Text>
                                        </View>
                                    </View>
                                :   <View style={styles.inputWrapper}>
                                        <TextInput style={styles.input} value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" placeholder="178" placeholderTextColor={colors.placeholder} selectTextOnFocus />
                                        <Text style={styles.unitText}>cm</Text>
                                    </View>
                                }
                                <Text style={styles.consistencyNote}>Your calorie and macro targets update automatically to match.</Text>
                                <View style={styles.actions}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                                        <Text style={styles.cancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                                        <Text style={styles.saveText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </Pressable>
                        </Animated.View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        keyboardRoot: { flex: 1 },
        layerStack: { flex: 1 },
        scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(63, 63, 63, 0.85)' },
        cardSlot: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', paddingHorizontal: 28 },
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        cardTitle: { fontSize: 20, color: colors.text, fontFamily: fonts.semibold, marginBottom: 4 },
        hint: { fontSize: 13, color: colors.textSecondary, fontFamily: fonts.regular, marginBottom: 14 },
        ftInRow: { flexDirection: 'row', gap: 12 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceInset, borderRadius: radius.card, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        input: { flex: 1, paddingVertical: 14, fontSize: 18, color: colors.text, fontFamily: fonts.medium },
        unitText: { fontSize: 14, color: colors.textMuted, marginLeft: 8, fontFamily: fonts.semibold },
        consistencyNote: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, fontFamily: fonts.medium, marginTop: 12 },
        actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
        cancelBtn: { flex: 1, height: 60, borderRadius: radius.cardLg, backgroundColor: colors.surfaceInset, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        cancelText: { fontSize: 16, color: colors.textMuted, letterSpacing: -0.5, fontFamily: fonts.semibold },
        saveBtn: { flex: 1, height: 60, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        saveText: { fontSize: 16, color: colors.background, letterSpacing: -0.5, fontFamily: fonts.semibold },
    })
}
