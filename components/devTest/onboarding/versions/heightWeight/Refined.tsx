import { cmToInches, feetInchesToInches, inchesToCm, inchesToFeetInches, kgToLbs, lbsToKg } from '@/lib/utils/unitConversions'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import PressableScale from '../_shared/PressableScale'
import StepProgress from '../_shared/StepProgress'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/** Dev-only Refined Height & Weight screen — restyled per RESTYLE_PLAN (theme tokens, dark + light). Inert. */
export default function HeightWeightRefined() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.measurement
    const router = useRouter()
    const topPad = useScreenTopPad()
    const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial')
    const [heightFt, setHeightFt] = useState('')
    const [heightIn, setHeightIn] = useState('')
    const [height, setHeight] = useState('')
    const [weight, setWeight] = useState('')

    function handleUnitToggle(next: 'imperial' | 'metric') {
        if (next === unitSystem) return
        if (next === 'metric') {
            const totalIn = feetInchesToInches(Number(heightFt) || 0, Number(heightIn) || 0)
            if (totalIn > 0) setHeight(inchesToCm(totalIn).toString())
            const lbs = Number(weight) || 0
            if (lbs > 0) setWeight(lbsToKg(lbs).toString())
        } else {
            const cm = Number(height) || 0
            if (cm > 0) {
                const { feet, inches } = inchesToFeetInches(cmToInches(cm))
                setHeightFt(feet.toString())
                setHeightIn(inches.toString())
            }
            const kg = Number(weight) || 0
            if (kg > 0) setWeight(kgToLbs(kg).toString())
        }
        setUnitSystem(next)
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <LinearGradient colors={[accent + '14', 'transparent']} style={styles.topGradient} pointerEvents="none" />
                <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <StepProgress current={4} total={12} accent={accent} />

                    <View style={[styles.iconCircle, { borderColor: accent }]}>
                        <FontAwesome5 name="pencil-ruler" size={65} color={accent} />
                    </View>

                    <Text style={styles.titleText}>What's your Measurements?</Text>
                    <Text style={styles.subtitleText}>We use your height and weight for BMR and nutrition goal calculations.</Text>

                    <View style={styles.toggleContainer}>
                        {(['imperial', 'metric'] as const).map((u) => (
                            <PressableScale key={u} style={[styles.toggleButton, unitSystem === u && { borderColor: accent }]} onPress={() => handleUnitToggle(u)}>
                                <Text style={[styles.toggleText, unitSystem === u && { color: colors.text }]}>{u === 'imperial' ? 'Imperial' : 'Metric'}</Text>
                            </PressableScale>
                        ))}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Height</Text>
                        {unitSystem === 'imperial' ?
                            <View style={styles.ftInRow}>
                                <View style={[styles.inputWrapper, styles.ftInBox]}>
                                    <TextInput style={styles.input} placeholder="5" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={heightFt} onChangeText={setHeightFt} />
                                    <Text style={styles.unitText}>ft</Text>
                                </View>
                                <View style={[styles.inputWrapper, styles.ftInBox]}>
                                    <TextInput style={styles.input} placeholder="11" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={heightIn} onChangeText={setHeightIn} />
                                    <Text style={styles.unitText}>in</Text>
                                </View>
                            </View>
                        :   <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} placeholder="178" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={height} onChangeText={setHeight} />
                                <Text style={styles.unitText}>cm</Text>
                            </View>
                        }
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Weight</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} />
                            <Text style={styles.unitText}>{unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.85}>
                        <LinearGradient colors={colors.measurementGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
                            <Text style={styles.nextButtonText}>Next</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 25, paddingBottom: 50 },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
        scroll: { flex: 1 },
        scrollContent: { alignItems: 'center', paddingBottom: 16 },
        stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 28 },
        stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ringTrack },
        iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, marginBottom: 12 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text, letterSpacing: -0.5, marginBottom: 4, textAlign: 'center' },
        subtitleText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, letterSpacing: 0.2, marginBottom: 24, paddingHorizontal: 8 },
        toggleContainer: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 24 },
        toggleButton: { flex: 1, height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border },
        toggleText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted, letterSpacing: -0.5 },
        inputGroup: { width: '100%', marginBottom: 16 },
        inputLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSecondary, marginBottom: 8, paddingLeft: 4, letterSpacing: -0.5 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unitText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
        ftInRow: { flexDirection: 'row', gap: 12 },
        ftInBox: { flex: 1 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: '#1A1B1E', letterSpacing: -0.5 },
    })
}
