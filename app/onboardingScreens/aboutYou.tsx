import CompactDatePicker from '@/components/NeutralComponents/CompactDatePicker'
import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import PressableScale from '@/components/NeutralComponents/PressableScale'
import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { calculateAge } from '@/lib/utils/dateHelper'
import { cmToInches, feetInchesToInches, inchesToCm, inchesToFeetInches, kgToLbs, lbsToKg, weightUnitLabel } from '@/lib/utils/unitConversions'
import { onboardingStep } from '@/lib/onboarding/steps'
import { router } from 'expo-router'
import { ShieldCheck } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'

/**
 * Onboarding — merged About You. Persists gender + birthDate + height (total INCHES imperial / cm metric) +
 * bodyWeight + unitSystem, and calls handleUpdateBw to log the day-1 weight — parity with old onboarding2-4.
 * validateHeightWeight (Alert) + a 13+ age check run on Next.
 */
export default function OnboardingAboutYou() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { settings, setSettings, handleUpdateBw } = useSettings()
    const accent = colors.text
    const { current, total } = onboardingStep('aboutYou', settings.goalType)

    const [sex, setSex] = useState<'male' | 'female' | null>(null)
    const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1))
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

    const filled = sex != null && weight.trim() !== '' && (unitSystem === 'imperial' ? heightFt.trim() !== '' : height.trim() !== '')

    function handleNext() {
        if (sex == null) return
        const totalHeight = unitSystem === 'imperial' ? feetInchesToInches(Number(heightFt) || 0, Number(heightIn) || 0) : Number(height) || 0
        const w = Number(weight) || 0
        if (!validateHeightWeight(totalHeight, w, unitSystem)) return
        const age = calculateAge(birthDate)
        if (age < 13) {
            Alert.alert('Age Requirement', 'You must be at least 13 years old to use Plates.', [{ text: 'OK' }])
            return
        }
        setSettings({ ...settings, gender: sex, birthDate, height: totalHeight, bodyWeight: w, unitSystem })
        handleUpdateBw(w)
        router.push('/onboardingScreens/activity')
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <OnboardingScaffold step={current} total={total} title="About you" subtitle="A few details so we can personalize your calorie and macro targets." accent={accent} nextDisabled={!filled} onBack={() => router.back()} onNext={handleNext}>
                    <Text style={styles.label}>Biological sex</Text>
                    <View style={styles.row}>
                        {(['male', 'female'] as const).map((s) => (
                            <PressableScale key={s} style={[styles.sexButton, sex === s && { borderColor: accent, backgroundColor: accent + '10' }]} onPress={() => setSex(s)}>
                                <Text style={[styles.sexSymbol, sex === s && { color: accent }]}>{s === 'male' ? '♂' : '♀'}</Text>
                                <Text style={[styles.sexText, sex === s && { color: colors.text }]}>{s === 'male' ? 'Male' : 'Female'}</Text>
                            </PressableScale>
                        ))}
                    </View>

                    <Text style={styles.label}>Date of birth</Text>
                    <View style={{ marginBottom: 20 }}>
                        <CompactDatePicker selectedDate={birthDate} onDateChange={setBirthDate} accent={accent} />
                    </View>

                    <Text style={styles.label}>Height & weight</Text>
                    <View style={[styles.row, { marginBottom: 12 }]}>
                        {(['imperial', 'metric'] as const).map((u) => (
                            <PressableScale key={u} style={[styles.toggle, unitSystem === u && { borderColor: accent }]} onPress={() => handleUnitToggle(u)}>
                                <Text style={[styles.toggleText, unitSystem === u && { color: colors.text }]}>{u === 'imperial' ? 'Imperial' : 'Metric'}</Text>
                            </PressableScale>
                        ))}
                    </View>

                    {unitSystem === 'imperial' ?
                        <View style={styles.row}>
                            <View style={[styles.inputWrapper, { flex: 1 }]}>
                                <TextInput style={styles.input} placeholder="5" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={heightFt} onChangeText={setHeightFt} />
                                <Text style={styles.unit}>ft</Text>
                            </View>
                            <View style={[styles.inputWrapper, { flex: 1 }]}>
                                <TextInput style={styles.input} placeholder="11" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={heightIn} onChangeText={setHeightIn} />
                                <Text style={styles.unit}>in</Text>
                            </View>
                        </View>
                    :   <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder="178" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={height} onChangeText={setHeight} />
                            <Text style={styles.unit}>cm</Text>
                        </View>
                    }
                    <View style={[styles.inputWrapper, { marginTop: 12 }]}>
                        <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} />
                        <Text style={styles.unit}>{weightUnitLabel(unitSystem)}</Text>
                    </View>

                    <View style={styles.trustRow}>
                        <ShieldCheck size={15} color={colors.textMuted} strokeWidth={2.2} />
                        <Text style={styles.trustText}>Your data is never sold or shared</Text>
                    </View>
                </OnboardingScaffold>
            </View>
        </TouchableWithoutFeedback>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 },
        row: { flexDirection: 'row', gap: 12 },
        sexButton: { flex: 1, flexDirection: 'row', gap: 8, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border, marginBottom: 20 },
        sexSymbol: { fontFamily: fonts.semibold, fontSize: 22, color: colors.textMuted },
        sexText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted, letterSpacing: -0.3 },
        toggle: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border },
        toggleText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, letterSpacing: -0.3 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
        trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
        trustText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },
    })
}
