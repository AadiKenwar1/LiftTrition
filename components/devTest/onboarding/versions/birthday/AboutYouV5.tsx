import { validateHeightWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { feetInchesToInches } from '@/lib/utils/unitConversions'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import CalendarDatePopup from '../_shared/CalendarDatePopup'
import { useOnboardingFlow } from '../_shared/flowContext'
import PressableScale from '../_shared/PressableScale'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V5 About You — sex + DOB + height only. Weight and the unit toggle moved to the step-4 goal screen,
 * so this is the flow's lightest ask, and it lands at step 5 directly after it. The three fields left here are
 * exactly the three the calorie math still needs (they're the BMR terms Mifflin-St Jeor takes beyond weight),
 * so the subtitle names that instead of asking to "personalize" in the abstract — the user has just committed
 * to a goal weight and is being told what's required to price it.
 *
 * Guardrail added: date of birth is no longer silently defaulted. V4 (and production's aboutYou.tsx) seeded a
 * date and left it out of the Next gate, so a user who never opened the picker had an invented age persisted
 * — and age feeds the BMR term of their real calorie target. Here the picker must be touched before Next
 * enables. Height is validated with the production validateHeightWeight against the weight captured at
 * step 4 (mock fallback for standalone previews), plus the 13+ age check. Inert.
 */
export default function AboutYouV5() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.text
    const [sex, setSex] = useState<'male' | 'female' | null>(null)
    const [birthDate, setBirthDate] = useState(new Date(2001, 0, 1))
    const [dobSet, setDobSet] = useState(false)
    const [heightFt, setHeightFt] = useState('')
    const [heightIn, setHeightIn] = useState('')
    const [height, setHeight] = useState('')

    const unitSystem = flow?.data.unit === 'metric' ? 'metric' : 'imperial'
    const imperial = unitSystem === 'imperial'
    // Read but never shown — validateHeightWeight is a paired check, so it needs the weight captured at step 4
    // to validate height. Standalone previews fall back to a mock so the production validator can still run.
    const weight = Number(flow?.data.weight) || (imperial ? 165 : 75)
    const filled = sex != null && dobSet && (imperial ? heightFt.trim() !== '' : height.trim() !== '')

    function handleDateChange(d: Date) {
        setBirthDate(d)
        setDobSet(true)
    }

    function handleBeforeNext(): boolean {
        const totalHeight = imperial ? feetInchesToInches(Number(heightFt) || 0, Number(heightIn) || 0) : Number(height) || 0
        if (!validateHeightWeight(totalHeight, weight, unitSystem)) return false
        const now = new Date()
        let age = now.getFullYear() - birthDate.getFullYear()
        const m = now.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--
        if (age < 13) {
            Alert.alert('Age Requirement', 'You must be at least 13 years old to use PLATES.', [{ text: 'OK' }])
            return false
        }
        return true
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <V4Screen step={4} totalSteps={8} eyebrow="Step 5 of 8" title="About you" subtitle="Age, height and biological sex change how many calories you burn — we need all three to build your calorie goals." accent={accent} nextDisabled={!filled} onBeforeNext={handleBeforeNext} onBack={() => router.back()} onNext={() => {}}>
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
                        <CalendarDatePopup selectedDate={birthDate} onDateChange={handleDateChange} accent={accent} />
                        {!dobSet && <Text style={styles.hint}>Tap to pick your date of birth</Text>}
                    </View>

                    <Text style={styles.label}>Height</Text>
                    {imperial ?
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
                </V4Screen>
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
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
        hint: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2, marginTop: 8 },
    })
}
