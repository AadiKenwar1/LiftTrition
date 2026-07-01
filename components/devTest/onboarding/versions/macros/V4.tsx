import EditMacroGoalModal, { type MacroGoalKind } from '@/components/NutritionComponents/EditMacroGoalModal'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { Beef, Droplet, Flame, Pencil, Wheat } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import V4Screen from '../_shared/V4Screen'

/**
 * Dev-only V4 Macros / personalized plan — NEUTRAL (color is reserved for the three hero beats; the green
 * payoff moment is the Projection chart right after this). Editable cells via EditMacroGoalModal. Inert.
 */
export default function MacrosV4() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const accent = colors.text
    const [macros, setMacros] = useState({ calorieGoal: 2200, proteinGoal: 165, carbsGoal: 220, fatsGoal: 60 })
    const [editingKind, setEditingKind] = useState<MacroGoalKind | null>(null)

    const initial = (k: MacroGoalKind) => (k === 'calories' ? macros.calorieGoal : k === 'protein' ? macros.proteinGoal : k === 'carbs' ? macros.carbsGoal : macros.fatsGoal)
    const save = (v: number) => {
        if (!editingKind) return
        if (editingKind === 'calories') setMacros((m) => ({ ...m, calorieGoal: v }))
        else if (editingKind === 'protein') setMacros((m) => ({ ...m, proteinGoal: v }))
        else if (editingKind === 'carbs') setMacros((m) => ({ ...m, carbsGoal: v }))
        else setMacros((m) => ({ ...m, fatsGoal: v }))
    }

    const CARDS = [
        { kind: 'calories' as const, Icon: Flame, label: 'Calories', value: `${macros.calorieGoal}` },
        { kind: 'protein' as const, Icon: Beef, label: 'Protein', value: `${macros.proteinGoal}g` },
        { kind: 'carbs' as const, Icon: Wheat, label: 'Carbs', value: `${macros.carbsGoal}g` },
        { kind: 'fats' as const, Icon: Droplet, label: 'Fats', value: `${macros.fatsGoal}g` },
    ]

    return (
        <View style={{ flex: 1 }}>
            <V4Screen step={7} totalSteps={9} eyebrow="Step 8 of 9" title="Your plan is ready" subtitle="Here are your daily targets — tap any to fine-tune it." accent={accent} onBack={() => router.back()} onNext={() => {}}>
                <View style={styles.grid}>
                    {CARDS.map(({ kind, Icon, label, value }, i) => (
                        <Animated.View key={kind} entering={FadeInDown.delay(i * 50).duration(280)} style={styles.cell}>
                            <PressableScale style={styles.card} onPress={() => setEditingKind(kind)}>
                                <Pencil size={15} color={colors.chevron} strokeWidth={2} style={styles.pencil} />
                                <Icon size={18} color={colors.textMuted} strokeWidth={2.2} />
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
        cardLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: -0.2, marginTop: 2 },
        cardValue: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
        note: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2, marginTop: 18 },
    })
}
