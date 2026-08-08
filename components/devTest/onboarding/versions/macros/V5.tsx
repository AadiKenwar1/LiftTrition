import EditMacroGoalModal, { type MacroGoalKind } from '@/components/NutritionComponents/EditMacroGoalModal'
import { fonts, macroColors, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { Beef, Droplet, Flame, Pencil, Wheat } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useOnboardingFlow } from '../_shared/flowContext'
import PressableScale from '../_shared/PressableScale'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V5 plan screen — V4's tiles, with tile colors coming from the macroColors token instead of hexes
 * copied out of it. The calorie goal is published to the flow so the projection and paywall quote the same
 * number the user just edited. Targets are still mock — the real screen runs calculateMacros off committed
 * settings. Nothing here reads back the step-2 obstacles: quoting a "you said X" line only answers the first
 * obstacle a multi-select user picked, which reads worse than staying quiet. Step 7 of 8; the projection
 * follows it, so this is where the numbers land and the next screen is what they add up to. Inert.
 */
export default function MacrosV5() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const flow = useOnboardingFlow()
    const accent = colors.text
    const [macros, setMacros] = useState({ calorieGoal: 2200, proteinGoal: 165, carbsGoal: 220, fatsGoal: 60 })
    const [editingKind, setEditingKind] = useState<MacroGoalKind | null>(null)

    // Publish on mount and after every edit. `flow` is rebuilt each FlowRunner render, so listing it as a
    // dependency would loop.
    useEffect(() => {
        flow?.setData('calories', String(macros.calorieGoal))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [macros.calorieGoal])

    const initial = (k: MacroGoalKind) => (k === 'calories' ? macros.calorieGoal : k === 'protein' ? macros.proteinGoal : k === 'carbs' ? macros.carbsGoal : macros.fatsGoal)
    const save = (v: number) => {
        if (!editingKind) return
        if (editingKind === 'calories') setMacros((m) => ({ ...m, calorieGoal: v }))
        else if (editingKind === 'protein') setMacros((m) => ({ ...m, proteinGoal: v }))
        else if (editingKind === 'carbs') setMacros((m) => ({ ...m, carbsGoal: v }))
        else setMacros((m) => ({ ...m, fatsGoal: v }))
    }

    const CARDS = [
        { kind: 'calories' as const, Icon: Flame, color: macroColors.calories, label: 'Calories', value: `${macros.calorieGoal}` },
        { kind: 'protein' as const, Icon: Beef, color: macroColors.protein, label: 'Protein', value: `${macros.proteinGoal}g` },
        { kind: 'carbs' as const, Icon: Wheat, color: macroColors.carbs, label: 'Carbs', value: `${macros.carbsGoal}g` },
        { kind: 'fats' as const, Icon: Droplet, color: colors.nutrition, label: 'Fats', value: `${macros.fatsGoal}g` },
    ]

    return (
        <View style={{ flex: 1 }}>
            <V4Screen step={6} totalSteps={8} eyebrow="Step 7 of 8" title="Your plan is ready" subtitle="Here are your daily targets — tap any to fine-tune it." accent={accent} onBack={() => router.back()} onNext={() => {}}>
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

                <Text style={styles.note}>You can change these anytime in settings.</Text>
            </V4Screen>

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
        note: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2, marginTop: 18 },
    })
}
