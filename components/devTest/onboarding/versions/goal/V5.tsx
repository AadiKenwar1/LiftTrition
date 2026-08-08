import { validateTargetWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { kgToLbs, lbsToKg, weightUnitLabel } from '@/lib/utils/unitConversions'
import { useRouter } from 'expo-router'
import { ShieldCheck } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useOnboardingFlow } from '../_shared/flowContext'
import PressableScale from '../_shared/PressableScale'
import V3Option from '../_shared/V3Option'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V5 goal screen — the reorder's centerpiece. Merges the eating phase with the weight numbers that
 * used to live on About You, so current and goal weight sit in ONE frame (the delta is the motivating part)
 * and validateTargetWeight can check direction against a current weight the user just typed instead of one
 * captured two screens back. Runs at step 4, right after the three tap screens.
 *
 * Progressive disclosure: the phase options are the only thing on screen until one is picked — the first
 * keyboard in the flow appears only after a commitment. Selected phase highlights nutrition-green. Nothing is
 * preselected, recommended, or badged: the three phases are presented flat and the user picks, so the app
 * never puts a calorie direction in their mouth and flow.data.phase can't disagree with the UI. The privacy
 * line travels with the weight fields, since this is now the flow's first sensitive question. Unit toggle
 * lives here too — About You inherits the choice for its height field. Inert.
 */
const PHASES = [
    { id: 'cut', label: 'Cut', sub: 'Eat in a deficit to lose fat' },
    { id: 'maintain', label: 'Maintain', sub: 'Eat at maintenance to recomp' },
    { id: 'bulk', label: 'Bulk', sub: 'Eat in a surplus to gain' },
] as const
type Phase = (typeof PHASES)[number]['id']

/** Mirrors the weight floors in the production validateHeightWeight — this screen asks weight before height, so it can't call the paired validator until About You. */
const MIN_WEIGHT = { imperial: 50, metric: 20 } as const

export default function GoalV5() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.text
    const [phase, setPhase] = useState<Phase | null>(null)
    const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial')
    const [weight, setWeight] = useState('')
    const [target, setTarget] = useState('')

    const unit = weightUnitLabel(unitSystem)
    const needsTarget = phase != null && phase !== 'maintain'
    const filled = phase != null && weight.trim() !== '' && (!needsTarget || target.trim() !== '')

    function choosePhase(p: Phase) {
        setPhase(p)
        flow?.setData('phase', p)
        if (p === 'maintain') setTarget('')
    }

    function handleUnitToggle(next: 'imperial' | 'metric') {
        if (next === unitSystem) return
        const convert = (v: string) => {
            const n = Number(v) || 0
            return n > 0 ? (next === 'metric' ? lbsToKg(n) : kgToLbs(n)).toString() : v
        }
        setWeight(convert(weight))
        setTarget(convert(target))
        setUnitSystem(next)
        flow?.setData('unit', next)
    }

    function handleBeforeNext(): boolean {
        const w = Number(weight) || 0
        const min = MIN_WEIGHT[unitSystem]
        if (w < min) {
            Alert.alert('Invalid Input', `Weight must be at least ${min} ${unit}`, [{ text: 'OK' }])
            return false
        }
        if (needsTarget) {
            const goal = phase === 'cut' ? 'lose' : 'gain'
            if (!validateTargetWeight(Number(target) || 0, w, goal, unitSystem)) return false
            flow?.setData('target', String(Number(target) || 0))
        } else {
            // Clear any target left over from a cut/bulk the user backed out of — otherwise the projection
            // and paywall would quote a goal weight the user is no longer chasing.
            flow?.setData('target', '')
        }
        flow?.setData('unit', unitSystem)
        flow?.setData('weight', String(w))
        return true
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <V4Screen step={3} totalSteps={8} eyebrow="Step 4 of 8" title="What's your goal?" subtitle="This sets your daily calories — and how fast you'll get there. You can switch phases anytime." accent={accent} nextDisabled={!filled} onBeforeNext={handleBeforeNext} onBack={() => router.back()} onNext={() => {}}>
                    <View style={{ gap: 12 }}>
                        {PHASES.map((p, i) => (
                            <V3Option key={p.id} index={i} label={p.label} sublabel={p.sub} accent={colors.nutrition} selected={phase === p.id} onPress={() => choosePhase(p.id)} />
                        ))}
                    </View>

                    {phase != null && (
                        <Animated.View entering={FadeInDown.duration(300)}>
                            <View style={styles.unitRow}>
                                {(['imperial', 'metric'] as const).map((u) => (
                                    <PressableScale key={u} style={[styles.toggle, unitSystem === u && { borderColor: accent }]} onPress={() => handleUnitToggle(u)}>
                                        <Text style={[styles.toggleText, unitSystem === u && { color: colors.text }]}>{u === 'imperial' ? 'Imperial' : 'Metric'}</Text>
                                    </PressableScale>
                                ))}
                            </View>

                            <Text style={styles.label}>Current weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '160' : '73'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} />
                                <Text style={styles.unit}>{unit}</Text>
                            </View>

                            {needsTarget && (
                                <>
                                    <Text style={styles.label}>Goal weight</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput style={styles.input} placeholder={phase === 'cut' ? (unitSystem === 'imperial' ? '150' : '68') : unitSystem === 'imperial' ? '176' : '80'} placeholderTextColor={colors.placeholder} keyboardType="numeric" value={target} onChangeText={setTarget} />
                                        <Text style={styles.unit}>{unit}</Text>
                                    </View>
                                </>
                            )}

                            <View style={styles.trustRow}>
                                <ShieldCheck size={15} color={colors.textMuted} strokeWidth={2.2} />
                                <Text style={styles.trustText}>Your data is never sold or shared</Text>
                            </View>
                        </Animated.View>
                    )}
                </V4Screen>
            </View>
        </TouchableWithoutFeedback>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        unitRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
        toggle: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: 2, borderColor: colors.border },
        toggleText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted, letterSpacing: -0.3 },
        label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
        trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
        trustText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },
    })
}
