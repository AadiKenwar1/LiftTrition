import EditMacroGoalModal, { type MacroGoalKind } from '@/components/NutritionComponents/EditMacroGoalModal'
import LowCalorieWarning from '@/components/NutritionComponents/LowCalorieWarning'
import WontReachGoalWarning from '@/components/NutritionComponents/WontReachGoalWarning'
import PressableScale from '@/components/NeutralComponents/PressableScale'
import StepProgress from '@/components/NeutralComponents/StepProgress'
import { useSettings } from '@/context/SettingsContext'
import { calculateCalorieTarget, macrosWereEdited } from '@/context/SettingsContext/functions/macroCalculation'
import { fonts, macroColors, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useScreenBottomPad } from '@/lib/hooks/useScreenBottomPad'
import { router, useLocalSearchParams } from 'expo-router'
import { Beef, Droplet, Flame, Pencil, Wheat } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

function macroInitialValue(kind: MacroGoalKind, m: { calorieGoal: number; proteinGoal: number; carbsGoal: number; fatsGoal: number }) {
    switch (kind) {
        case 'calories':
            return m.calorieGoal
        case 'protein':
            return m.proteinGoal
        case 'carbs':
            return m.carbsGoal
        case 'fats':
            return m.fatsGoal
    }
}

export default function AdjustNutrition3Screen() {
    const { settings, calculateMacros } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const bottomPad = useScreenBottomPad(6)
    const [editingKind, setEditingKind] = useState<MacroGoalKind | null>(null)
    const params = useLocalSearchParams<{
        height: string
        weight: string
        unitSystem: string
        goal: string
        targetWeight: string
        goalPace?: string
    }>()

    const calculatedMacros = useMemo(() => {
        const tempSettings = {
            ...settings,
            height: Number(params.height),
            bodyWeight: Number(params.weight),
            unitSystem: params.unitSystem as 'imperial' | 'metric',
            goalType: params.goal as 'lose' | 'gain' | 'maintain',
            goalWeight: Number(params.targetWeight),
            goalPace: params.goalPace ? Number(params.goalPace) : 0,
        }
        const isImperial = params.unitSystem === 'imperial'
        // maintenance rides along for the direction warning — calculateMacros returns only the target, and
        // it has to be the burn for the wizard's not-yet-saved body, not the saved one.
        return { ...calculateMacros(tempSettings, isImperial), maintenance: calculateCalorieTarget(tempSettings, isImperial).maintenance }
    }, [params, settings, calculateMacros])

    const [macroGoals, setMacroGoals] = useState(() => ({
        calorieGoal: Math.round(calculatedMacros.calResult),
        proteinGoal: Math.round(calculatedMacros.proteinGrams),
        carbsGoal: Math.round(calculatedMacros.carbGrams),
        fatsGoal: Math.round(calculatedMacros.fatGrams),
    }))

    useEffect(() => {
        setMacroGoals({
            calorieGoal: Math.round(calculatedMacros.calResult),
            proteinGoal: Math.round(calculatedMacros.proteinGrams),
            carbsGoal: Math.round(calculatedMacros.carbGrams),
            fatsGoal: Math.round(calculatedMacros.fatGrams),
        })
    }, [calculatedMacros.calResult, calculatedMacros.proteinGrams, calculatedMacros.carbGrams, calculatedMacros.fatGrams])

    const handleSaveMacro = (value: number) => {
        if (!editingKind) return
        if (editingKind === 'calories') setMacroGoals((prev) => ({ ...prev, calorieGoal: value }))
        else if (editingKind === 'protein') setMacroGoals((prev) => ({ ...prev, proteinGoal: value }))
        else if (editingKind === 'carbs') setMacroGoals((prev) => ({ ...prev, carbsGoal: value }))
        else setMacroGoals((prev) => ({ ...prev, fatsGoal: value }))
    }

    const handleNext = () => {
        // True only when a card was hand-edited away from the formula's own output, so a straight
        // walk-through (no pencil taps) still regenerates on the next weigh-in, matching the "explicit
        // regeneration" the wizard commit already promises — only a real hand-edit needs the same
        // macrosCustomized protection profile.tsx gives the identical modal.
        const isCustomized = macrosWereEdited(macroGoals, calculatedMacros)
        router.push({
            pathname: '/settingsScreens/adjustNutrition/adjustNutrition4',
            params: {
                height: params.height,
                weight: params.weight,
                unitSystem: params.unitSystem,
                goal: params.goal,
                targetWeight: params.targetWeight,
                goalPace: params.goalPace ?? '0',
                calorieGoal: macroGoals.calorieGoal.toString(),
                proteinGoal: macroGoals.proteinGoal.toString(),
                carbsGoal: macroGoals.carbsGoal.toString(),
                fatsGoal: macroGoals.fatsGoal.toString(),
                macrosCustomized: isCustomized.toString(),
            },
        })
    }

    const CARDS = [
        { kind: 'calories' as const, Icon: Flame, color: macroColors.calories, label: 'Calories', value: `${macroGoals.calorieGoal}` },
        { kind: 'protein' as const, Icon: Beef, color: macroColors.protein, label: 'Protein', value: `${macroGoals.proteinGoal}g` },
        { kind: 'carbs' as const, Icon: Wheat, color: macroColors.carbs, label: 'Carbs', value: `${macroGoals.carbsGoal}g` },
        { kind: 'fats' as const, Icon: Droplet, color: colors.nutrition, label: 'Fats', value: `${macroGoals.fatsGoal}g` },
    ]

    return (
        <View style={[styles.container, { paddingBottom: bottomPad }]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <StepProgress current={params.goal === 'maintain' ? 1 : 2} total={params.goal === 'maintain' ? 3 : 4} accent={colors.text} />
                <Text style={styles.titleText}>Your plan is ready</Text>
                <Text style={styles.subtitleText}>Here are your daily targets — tap any to fine-tune it.</Text>

                <View style={styles.grid}>
                    {CARDS.map(({ kind, Icon, color, label, value }, i) => (
                        <Animated.View key={kind} entering={FadeInDown.delay(i * 50).duration(280)} style={styles.cell}>
                            <PressableScale style={styles.card} onPress={() => setEditingKind(kind)}>
                                <Pencil size={15} color={colors.chevron} strokeWidth={2} style={styles.pencil} />
                                <Icon size={18} color={color} strokeWidth={2.2} />
                                <Text style={[styles.cardLabel, { color }]}>{label}</Text>
                                <Text style={styles.cardValue}>{value}</Text>
                            </PressableScale>
                        </Animated.View>
                    ))}
                </View>
                {/* Both read the editable state, not calculatedMacros, so a calorie number typed into the modal is warned about too. Goal and units come from the params the wizard is carrying, so a goal changed on step 1 is judged against the new one. */}
                <LowCalorieWarning calories={macroGoals.calorieGoal} gender={settings.gender} style={styles.warning} />
                <WontReachGoalWarning calories={macroGoals.calorieGoal} maintenance={calculatedMacros.maintenance} goalType={params.goal as 'lose' | 'gain' | 'maintain'} unitSystem={params.unitSystem as 'imperial' | 'metric'} style={styles.warning} />
                <Text style={styles.note}>Updating body weight will automatically update nutrition goals.</Text>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
            </View>

            <EditMacroGoalModal visible={editingKind != null} kind={editingKind} initialValue={editingKind != null ? macroInitialValue(editingKind, macroGoals) : 0} onDismiss={() => setEditingKind(null)} onSave={handleSaveMacro} />
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
        grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        cell: { width: '47.5%' },
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        pencil: { position: 'absolute', top: 12, right: 12 },
        cardLabel: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: -0.2, marginTop: 2 },
        cardValue: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
        warning: { marginTop: 16 },
        note: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2, marginTop: 18 },
        footer: { paddingTop: 12 },
        nextButton: { width: '100%', height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        nextText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
