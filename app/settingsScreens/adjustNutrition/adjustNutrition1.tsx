import OptionCard from '@/components/NeutralComponents/OptionCard'
import StepProgress from '@/components/NeutralComponents/StepProgress'
import { useSettings } from '@/context/SettingsContext'
import { validateHeightWeight, validateTargetWeight } from '@/context/SettingsContext/functions/validator'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { useScreenBottomPad } from '@/lib/hooks/useScreenBottomPad'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const PHASES = [
    { value: 'lose' as const, label: 'Cut', sub: 'Eat in a deficit to lose fat' },
    { value: 'maintain' as const, label: 'Maintain', sub: 'Eat at maintenance to recomp' },
    { value: 'gain' as const, label: 'Bulk', sub: 'Eat in a surplus to gain' },
]

export default function AdjustNutrition1Screen() {
    const { settings } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const bottomPad = useScreenBottomPad(6)

    const [goal, setGoal] = useState<'lose' | 'gain' | 'maintain' | null>(settings.goalType)
    const [targetWeight, setTargetWeight] = useState(settings.goalWeight.toString())

    function handleNext() {
        if (!validateHeightWeight(Number(settings.height), Number(settings.bodyWeight), settings.unitSystem as 'imperial' | 'metric')) return
        if (!validateTargetWeight(Number(targetWeight), Number(settings.bodyWeight), goal, settings.unitSystem as 'imperial' | 'metric')) return
        const commonParams = {
            height: settings.height.toString(),
            weight: settings.bodyWeight.toString(),
            unitSystem: settings.unitSystem,
            goal: goal as string,
            targetWeight: goal === 'maintain' ? settings.bodyWeight.toString() : targetWeight,
        }
        if (goal === 'maintain') {
            router.push({
                pathname: '/settingsScreens/adjustNutrition/adjustNutrition3',
                params: { ...commonParams, goalPace: '0' },
            })
        } else {
            router.push({ pathname: '/settingsScreens/adjustNutrition/adjustNutrition2', params: commonParams })
        }
    }

    return (
        <View style={[styles.container, { paddingBottom: bottomPad }]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScrollBeginDrag={Keyboard.dismiss}>
                <StepProgress current={0} total={goal === 'maintain' ? 3 : 4} accent={colors.text} />
                <Text style={styles.titleText}>What's your goal?</Text>
                <Text style={styles.subtitleText}>This sets your daily calories. You can switch anytime.</Text>

                <View style={styles.options}>
                    {PHASES.map((p, i) => (
                        <OptionCard key={p.value} index={i} label={p.label} sublabel={p.sub} accent={colors.nutrition} selected={goal === p.value} onPress={() => setGoal(p.value)} />
                    ))}
                </View>

                {goal != null && goal !== 'maintain' && (
                    <>
                        <Text style={styles.inputLabel}>Target weight</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder="150" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} />
                            <Text style={styles.unitText}>{weightUnitLabel(settings.unitSystem)}</Text>
                        </View>
                    </>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
        scroll: { flex: 1 },
        scrollContent: { paddingTop: 16, paddingBottom: 16 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 22, letterSpacing: 0.1, marginBottom: 26 },
        options: { gap: 12 },
        inputLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
        inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, height: 60 },
        input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, letterSpacing: -0.5 },
        unitText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginLeft: 12, letterSpacing: -0.5 },
        footer: { paddingTop: 12 },
        nextButton: { width: '100%', height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        nextText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
