import { cmToInches, feetInchesToInches, inchesToCm, inchesToFeetInches, kgToLbs, lbsToKg } from '@/lib/utils/unitConversions'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import CompactDatePicker from '../_shared/CompactDatePicker'
import PressableScale from '../_shared/PressableScale'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/**
 * Dev-only redesign preview (version of Onboarding 3): merges Sex + DOB + Height/Weight onto one screen
 * to cut friction, restyled per RESTYLE_PLAN (theme tokens, dark + light) and using the new compact date
 * picker so it fits one screen. Self-contained / inert (Back returns to the versions list, Next no-op).
 */
export default function AboutYou() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.workout
    const router = useRouter()
    const topPad = useScreenTopPad()

    const [selectedSex, setSelectedSex] = useState<'male' | 'female' | null>(null)
    const [birthDate, setBirthDate] = useState(new Date(2001, 0, 1))
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
                <LinearGradient colors={[accent + '24', 'transparent']} style={styles.topGradient} pointerEvents="none" />
                <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={styles.titleText}>About You</Text>
                    <Text style={styles.subtitleText}>We use these to personalize your BMR, calorie, and macro targets.</Text>

                    {/* Biological Sex */}
                    <Text style={[styles.sectionLabel, { color: accent }]}>Biological Sex</Text>
                    <View style={styles.sexRow}>
                        <PressableScale style={[styles.sexButton, selectedSex === 'male' && { borderColor: accent, backgroundColor: accent + '14' }]} onPress={() => setSelectedSex('male')}>
                            <Text style={[styles.sexSymbol, selectedSex === 'male' && { color: colors.text }]}>♂</Text>
                            <Text style={[styles.sexText, selectedSex === 'male' && { color: colors.text }]}>Male</Text>
                        </PressableScale>
                        <PressableScale style={[styles.sexButton, selectedSex === 'female' && { borderColor: accent, backgroundColor: accent + '14' }]} onPress={() => setSelectedSex('female')}>
                            <Text style={[styles.sexSymbol, selectedSex === 'female' && { color: colors.text }]}>♀</Text>
                            <Text style={[styles.sexText, selectedSex === 'female' && { color: colors.text }]}>Female</Text>
                        </PressableScale>
                    </View>

                    {/* Date of Birth */}
                    <Text style={[styles.sectionLabel, { color: accent }]}>Date of Birth</Text>
                    <View style={{ marginBottom: 24 }}>
                        <CompactDatePicker selectedDate={birthDate} onDateChange={setBirthDate} accent={accent} />
                    </View>

                    {/* Height & Weight */}
                    <Text style={[styles.sectionLabel, { color: accent }]}>Height & Weight</Text>
                    <View style={styles.toggleContainer}>
                        <PressableScale style={[styles.toggleButton, unitSystem === 'imperial' && { borderColor: accent }]} onPress={() => handleUnitToggle('imperial')}>
                            <Text style={[styles.toggleText, unitSystem === 'imperial' && { color: colors.text }]}>Imperial</Text>
                        </PressableScale>
                        <PressableScale style={[styles.toggleButton, unitSystem === 'metric' && { borderColor: accent }]} onPress={() => handleUnitToggle('metric')}>
                            <Text style={[styles.toggleText, unitSystem === 'metric' && { color: colors.text }]}>Metric</Text>
                        </PressableScale>
                    </View>

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

                    <View style={[styles.inputWrapper, { marginTop: 12 }]}>
                        <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} />
                        <Text style={styles.unitText}>{unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                    </View>
                </ScrollView>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextButton} activeOpacity={0.85} onPress={() => {}}>
                        <LinearGradient colors={colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
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
        scrollContent: { paddingBottom: 16 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.text, letterSpacing: -0.5, marginBottom: 4 },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 21, letterSpacing: 0.2, marginBottom: 24 },
        sectionLabel: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.3, marginBottom: 10, textTransform: 'uppercase' },
        sexRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
        sexButton: { flex: 1, flexDirection: 'row', gap: 10, height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border },
        sexSymbol: { fontFamily: fonts.semibold, fontSize: 24, color: colors.textMuted },
        sexText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textMuted, letterSpacing: -0.5 },
        toggleContainer: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 12 },
        toggleButton: { flex: 1, height: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border },
        toggleText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, letterSpacing: -0.5 },
        ftInRow: { flexDirection: 'row', gap: 12 },
        ftInBox: { flex: 1 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unitText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12, paddingTop: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.5 },
    })
}
