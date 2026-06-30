import { cmToInches, feetInchesToInches, inchesToCm, inchesToFeetInches, kgToLbs, lbsToKg } from '@/lib/utils/unitConversions'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import PressableScale from '../_shared/PressableScale'
import V3Screen from '../_shared/V3Screen'

/** Dev-only V3 (black & white) Height & Weight — blue accent (body data). Inert. */
export default function HeightWeightV3() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const accent = colors.text
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
            <View style={{ flex: 1 }}>
                <V3Screen step={4} eyebrow="Step 5 of 12" title="Your height and weight" subtitle="The last numbers we need to calculate your targets." accent={accent} onBack={() => router.back()} onNext={() => {}}>
                    <View style={styles.toggleRow}>
                        {(['imperial', 'metric'] as const).map((u) => (
                            <PressableScale key={u} style={[styles.toggle, unitSystem === u && { borderColor: accent }]} onPress={() => handleUnitToggle(u)}>
                                <Text style={[styles.toggleText, unitSystem === u && { color: colors.text }]}>{u === 'imperial' ? 'Imperial' : 'Metric'}</Text>
                            </PressableScale>
                        ))}
                    </View>

                    <Text style={styles.label}>Height</Text>
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

                    <Text style={[styles.label, { marginTop: 18 }]}>Weight</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} />
                        <Text style={styles.unit}>{unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                    </View>
                </V3Screen>
            </View>
        </TouchableWithoutFeedback>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
        toggle: { flex: 1, height: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border },
        toggleText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, letterSpacing: -0.3 },
        label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 },
        row: { flexDirection: 'row', gap: 12 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
    })
}
