import EditMacroGoalModal, { type MacroGoalKind } from '@/components/NutritionComponents/EditMacroGoalModal'
import LowCalorieWarning from '@/components/NutritionComponents/LowCalorieWarning'
import WontReachGoalWarning from '@/components/NutritionComponents/WontReachGoalWarning'
import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import PressableScale from '@/components/NeutralComponents/PressableScale'
import { useSettings } from '@/context/SettingsContext'
import { calculateCalorieTarget, macrosWereEdited } from '@/context/SettingsContext/functions/macroCalculation'
import { fonts, macroColors, radius, useColors, type Colors } from '@/context/ThemeContext'
import { onboardingStep } from '@/lib/utils/onboardingSteps'
import { router } from 'expo-router'
import { Beef, Droplet, Flame, Pencil, Wheat } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

/**
 * Onboarding — "Your plan is ready". Runs the real calculateMacros from the now-complete settings, lets the
 * user fine-tune any macro (EditMacroGoalModal), and commits the four goals to settings on Next — parity
 * with old onboarding8 (calc) + onboarding9 (edit).
 */
export default function OnboardingPlan() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { settings, setSettings, calculateMacros } = useSettings()
    const { current, total } = onboardingStep('plan', settings.goalType)

    const calc = useMemo(() => calculateMacros(settings, settings.unitSystem === 'imperial'), [settings, calculateMacros])
    // The burn the edited calorie number is judged against. calculateMacros returns only the target, and
    // the direction warning needs the maintenance behind it — the same figure the projection derives from.
    const { maintenance } = useMemo(() => calculateCalorieTarget(settings, settings.unitSystem === 'imperial'), [settings])
    const [macros, setMacros] = useState({
        calorieGoal: Math.round(calc.calResult),
        proteinGoal: Math.round(calc.proteinGrams),
        carbsGoal: Math.round(calc.carbGrams),
        fatsGoal: Math.round(calc.fatGrams),
    })
    const [editingKind, setEditingKind] = useState<MacroGoalKind | null>(null)

    const initial = (k: MacroGoalKind) => (k === 'calories' ? macros.calorieGoal : k === 'protein' ? macros.proteinGoal : k === 'carbs' ? macros.carbsGoal : macros.fatsGoal)
    const save = (v: number) => {
        if (!editingKind) return
        if (editingKind === 'calories') setMacros((m) => ({ ...m, calorieGoal: v }))
        else if (editingKind === 'protein') setMacros((m) => ({ ...m, proteinGoal: v }))
        else if (editingKind === 'carbs') setMacros((m) => ({ ...m, carbsGoal: v }))
        else setMacros((m) => ({ ...m, fatsGoal: v }))
    }

    // macrosCustomized is what stops the first weigh-in regenerating these targets over the top of a card
    // the user typed here — profile.tsx sets it for the identical modal edit, and without it an onboarding
    // hand-edit is silently reverted. Only a real edit earns it; a straight walk-through keeps tracking the
    // body, so the flag is written on both paths rather than only when true.
    function handleNext() {
        setSettings({ ...settings, ...macros, macrosCustomized: macrosWereEdited(macros, calc) })
        router.push('/onboardingScreens/projection')
    }

    const CARDS = [
        { kind: 'calories' as const, Icon: Flame, color: macroColors.calories, label: 'Calories', value: `${macros.calorieGoal}` },
        { kind: 'protein' as const, Icon: Beef, color: macroColors.protein, label: 'Protein', value: `${macros.proteinGoal}g` },
        { kind: 'carbs' as const, Icon: Wheat, color: macroColors.carbs, label: 'Carbs', value: `${macros.carbsGoal}g` },
        { kind: 'fats' as const, Icon: Droplet, color: colors.nutrition, label: 'Fats', value: `${macros.fatsGoal}g` },
    ]

    return (
        <View style={{ flex: 1 }}>
            <OnboardingScaffold step={current} total={total} title="Your plan is ready" subtitle="Here are your daily targets. Tap any one to change it." accent={colors.text} onBack={() => router.back()} onNext={handleNext}>
                <View style={styles.grid}>
                    {CARDS.map(({ kind, Icon, color, label, value }, i) => (
                        <Animated.View key={kind} entering={FadeInDown.delay(i * 50).duration(280)} style={styles.cell}>
                            <PressableScale style={styles.card} onPress={() => setEditingKind(kind)}>
                                <Pencil size={15} color={colors.chevron} strokeWidth={2} style={styles.pencil} />
                                <Icon size={18} color={color} strokeWidth={2.2} />
                                <Text style={styles.cardLabel}>{label}</Text>
                                <Text style={styles.cardValue}>{value}</Text>
                            </PressableScale>
                        </Animated.View>
                    ))}
                </View>
                {/* Both read the editable state, not calc, so a calorie number typed into the modal is warned about too. */}
                <LowCalorieWarning calories={macros.calorieGoal} gender={settings.gender} style={styles.warning} />
                <WontReachGoalWarning calories={macros.calorieGoal} maintenance={maintenance} goalType={settings.goalType} unitSystem={settings.unitSystem} style={styles.warning} />
                <Text style={styles.note}>You can change these anytime in settings.</Text>
            </OnboardingScaffold>

            <EditMacroGoalModal visible={editingKind != null} kind={editingKind} initialValue={editingKind != null ? initial(editingKind) : 0} onDismiss={() => setEditingKind(null)} onSave={save} />
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        cell: { width: '47.5%' },
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        pencil: { position: 'absolute', top: 12, right: 12 },
        cardLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, letterSpacing: -0.2, marginTop: 2 },
        cardValue: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
        warning: { marginTop: 16 },
        note: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2, marginTop: 18 },
    })
}
