import CompactDatePicker from '@/components/NeutralComponents/CompactDatePicker'
import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import PressableScale from '@/components/NeutralComponents/PressableScale'
import { useSettings } from '@/context/SettingsContext'
import { validateHeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { calculateAge } from '@/lib/utils/dateHelper'
import { feetInchesToInches } from '@/lib/utils/unitConversions'
import { onboardingStep } from '@/lib/utils/onboardingSteps'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'

/**
 * Onboarding — About You: sex + date of birth + height. Weight and the unit toggle belong to the goal screen
 * before this one, so these are exactly the three inputs the calorie math still needs — the BMR terms
 * Mifflin-St Jeor takes beyond weight — and the title and subtitle both name that rather than asking to
 * "personalize" in the abstract. A generic heading here would leave the subtitle carrying the whole reason
 * three personal questions are being asked, so the title states the payoff first. Persists gender + birthDate
 * + height (total INCHES imperial / cm metric); the unit comes from
 * settings, committed on the goal screen. validateHeight (Alert) + a 13+ age check run on Next.
 *
 * Date of birth is never silently defaulted: the picker must be opened before Next enables. A seeded date that
 * the user never touched would still feed the BMR term of their real calorie target.
 */
export default function OnboardingAboutYou() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { settings, setSettings } = useSettings()
    const accent = colors.text
    const { current, total } = onboardingStep('aboutYou', settings.goalType)

    const [sex, setSex] = useState<'male' | 'female' | null>(null)
    const [birthDate, setBirthDate] = useState(new Date(2001, 0, 1))
    const [dobSet, setDobSet] = useState(false)
    const [heightFt, setHeightFt] = useState('')
    const [heightIn, setHeightIn] = useState('')
    const [height, setHeight] = useState('')

    const unitSystem = settings.unitSystem
    const imperial = unitSystem === 'imperial'
    const filled = sex != null && dobSet && (imperial ? heightFt.trim() !== '' : height.trim() !== '')

    function handleDateChange(d: Date) {
        setBirthDate(d)
        setDobSet(true)
    }

    function handleNext() {
        if (sex == null) return
        const totalHeight = imperial ? feetInchesToInches(Number(heightFt) || 0, Number(heightIn) || 0) : Number(height) || 0
        if (!validateHeight(totalHeight, unitSystem)) return
        if (calculateAge(birthDate) < 13) {
            Alert.alert('Age Requirement', 'You must be at least 13 years old to use Plates.', [{ text: 'OK' }])
            return
        }
        setSettings({ ...settings, gender: sex, birthDate, height: totalHeight })
        router.push(settings.goalType === 'maintain' ? '/onboardingScreens/plan' : '/onboardingScreens/pace')
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <OnboardingScaffold step={current} total={total} title="Your calorie baseline" subtitle="Age, height and biological sex all change how many calories you burn. We need all three to set your targets." accent={accent} nextDisabled={!filled} onBack={() => router.back()} onNext={handleNext}>
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
                        <CompactDatePicker selectedDate={birthDate} onDateChange={handleDateChange} accent={accent} />
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
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
        hint: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2, marginTop: 8 },
    })
}
