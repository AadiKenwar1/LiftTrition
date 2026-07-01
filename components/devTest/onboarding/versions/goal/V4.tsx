import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import { useOnboardingFlow } from '../_shared/flowContext'
import V3Option from '../_shared/V3Option'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V4 eating-phase screen — the SELECTED phase highlights nutrition-green (the calorie decision is
 * the flow's core nutrition choice), mirroring Activity's blue selected state; screen chrome stays neutral.
 * Cut / Maintain / Bulk are single-select; target weight is hidden on Maintain and its unit follows the
 * user's earlier About You choice (via the flow's shared data). Inert.
 */
const PHASES = [
    { id: 'cut', label: 'Cut', sub: 'Eat in a deficit to lose fat' },
    { id: 'maintain', label: 'Maintain', sub: 'Eat at maintenance to recomp' },
    { id: 'bulk', label: 'Bulk', sub: 'Eat in a surplus to gain' },
] as const
type Phase = (typeof PHASES)[number]['id']

export default function GoalV4() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.text
    const [phase, setPhase] = useState<Phase>('cut')
    const [target, setTarget] = useState('')

    const metric = flow?.data.unit === 'metric'
    const unit = metric ? 'kg' : 'lb'
    const placeholder = phase === 'cut' ? (metric ? '68' : '150') : metric ? '80' : '176'

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <V4Screen step={4} totalSteps={9} eyebrow="Step 5 of 9" title="How do you want to eat?" subtitle="This sets your daily calories. You can switch phases anytime." accent={accent} onBack={() => router.back()} onNext={() => {}}>
                    <View style={{ gap: 12 }}>
                        {PHASES.map((p, i) => (
                            <V3Option key={p.id} index={i} label={p.label} sublabel={p.sub} accent={colors.nutrition} selected={phase === p.id} onPress={() => { setPhase(p.id); flow?.setData('phase', p.id) }} />
                        ))}
                    </View>

                    {phase !== 'maintain' && (
                        <>
                            <Text style={styles.label}>Target weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={target} onChangeText={setTarget} />
                                <Text style={styles.unit}>{unit}</Text>
                            </View>
                        </>
                    )}
                </V4Screen>
            </View>
        </TouchableWithoutFeedback>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
    })
}
