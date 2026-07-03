import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import OptionCard from '@/components/NeutralComponents/OptionCard'
import { useSettings } from '@/context/SettingsContext'
import { validateTargetWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { onboardingStep } from '@/lib/onboarding/steps'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'

/**
 * Onboarding — eating phase (green selected). Persists goalType (cut→lose, maintain→maintain, bulk→gain) +
 * goalWeight (target, or current bodyWeight on maintain). Maintain skips Pace → straight to Timeline.
 */
const PHASES = [
    { id: 'cut', label: 'Cut', sub: 'Eat in a deficit to lose fat' },
    { id: 'maintain', label: 'Maintain', sub: 'Eat at maintenance to recomp' },
    { id: 'bulk', label: 'Bulk', sub: 'Eat in a surplus to gain' },
] as const
type Phase = (typeof PHASES)[number]['id']
const GOAL_TYPE: Record<Phase, 'lose' | 'gain' | 'maintain'> = { cut: 'lose', maintain: 'maintain', bulk: 'gain' }

export default function OnboardingGoal() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { settings, setSettings } = useSettings()
    const accent = colors.nutrition
    const [phase, setPhase] = useState<Phase | null>(null)
    const [target, setTarget] = useState('')
    const { current, total } = onboardingStep('goal', settings.goalType)

    const metric = settings.unitSystem === 'metric'
    const unit = metric ? 'kg' : 'lb'
    const placeholder = phase === 'cut' ? (metric ? '68' : '150') : metric ? '80' : '176'

    function handleNext() {
        if (phase == null) return
        const goalType = GOAL_TYPE[phase]
        const goalWeight = goalType === 'maintain' ? settings.bodyWeight : Number(target) || 0
        if (!validateTargetWeight(goalWeight, settings.bodyWeight, goalType, settings.unitSystem)) return
        setSettings({ ...settings, goalType, goalWeight })
        router.push(goalType === 'maintain' ? '/onboardingScreens/timeline' : '/onboardingScreens/pace')
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <OnboardingScaffold step={current} total={total} title="How do you want to eat?" subtitle="This sets your daily calories. You can switch phases anytime." accent={colors.text} nextDisabled={phase == null || (phase !== 'maintain' && target.trim() === '')} onBack={() => router.back()} onNext={handleNext}>
                    <View style={{ gap: 12 }}>
                        {PHASES.map((p, i) => (
                            <OptionCard key={p.id} index={i} label={p.label} sublabel={p.sub} accent={accent} selected={phase === p.id} onPress={() => setPhase(p.id)} />
                        ))}
                    </View>

                    {phase != null && phase !== 'maintain' && (
                        <>
                            <Text style={styles.label}>Target weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={target} onChangeText={setTarget} />
                                <Text style={styles.unit}>{unit}</Text>
                            </View>
                        </>
                    )}
                </OnboardingScaffold>
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
