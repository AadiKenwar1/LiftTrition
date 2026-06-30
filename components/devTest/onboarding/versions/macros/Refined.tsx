import EditMacroGoalModal, { type MacroGoalKind } from '@/components/NutritionComponents/EditMacroGoalModal'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Beef, Droplet, Flame, Pencil, Wheat } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import PressableScale from '../_shared/PressableScale'
import StepProgress from '../_shared/StepProgress'
import { useScreenTopPad } from '../_shared/useScreenTopPad'

/** Dev-only Refined Macros (personalized plan) screen — restyled per RESTYLE_PLAN. Editable cells kept (ownership). Inert. */
export default function MacrosRefined() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.nutrition
    const router = useRouter()
    const topPad = useScreenTopPad()
    const [macros, setMacros] = useState({ calorieGoal: 2200, proteinGoal: 165, carbsGoal: 220, fatsGoal: 60 })
    const [editingKind, setEditingKind] = useState<MacroGoalKind | null>(null)

    const macroInitialValue = (kind: MacroGoalKind) => {
        switch (kind) {
            case 'calories':
                return macros.calorieGoal
            case 'protein':
                return macros.proteinGoal
            case 'carbs':
                return macros.carbsGoal
            case 'fats':
                return macros.fatsGoal
        }
    }

    const handleSaveMacro = (value: number) => {
        if (!editingKind) return
        if (editingKind === 'calories') setMacros((m) => ({ ...m, calorieGoal: value }))
        else if (editingKind === 'protein') setMacros((m) => ({ ...m, proteinGoal: value }))
        else if (editingKind === 'carbs') setMacros((m) => ({ ...m, carbsGoal: value }))
        else setMacros((m) => ({ ...m, fatsGoal: value }))
    }

    const CARDS = [
        { kind: 'calories' as const, Icon: Flame, color: '#FF6B6B', label: 'Calories', value: `${macros.calorieGoal}` },
        { kind: 'protein' as const, Icon: Beef, color: '#FF5A5A', label: 'Protein', value: `${macros.proteinGoal}g` },
        { kind: 'carbs' as const, Icon: Wheat, color: colors.measurement, label: 'Carbs', value: `${macros.carbsGoal}g` },
        { kind: 'fats' as const, Icon: Droplet, color: accent, label: 'Fats', value: `${macros.fatsGoal}g` },
    ]

    return (
        <View style={styles.container}>
            <LinearGradient colors={[accent + '14', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StepProgress current={9} total={12} accent={accent} />

                <View style={[styles.iconCircle, { borderColor: accent }]}>
                    <FontAwesome name="list-alt" size={72} color={accent} />
                </View>

                <Text style={styles.titleText}>Your Personalized Plan</Text>
                <Text style={styles.subtitleText}>Here are your daily nutrition goals based on your profile.</Text>

                <View style={styles.macrosContainer}>
                    <View style={styles.macrosRow}>
                        {CARDS.slice(0, 2).map(({ kind, Icon, color, label, value }, i) => (
                            <Animated.View key={kind} entering={FadeInDown.delay(i * 50).duration(280)} style={{ flex: 1 }}>
                                <PressableScale style={styles.macroCard} onPress={() => setEditingKind(kind)}>
                                    <Pencil size={16} color={colors.chevron} strokeWidth={2} style={styles.pencilCorner} />
                                    <Icon size={18} color={color} strokeWidth={2} />
                                    <Text style={styles.macroLabel}>{label}</Text>
                                    <Text style={styles.macroValue}>{value}</Text>
                                </PressableScale>
                            </Animated.View>
                        ))}
                    </View>
                    <View style={styles.macrosRow}>
                        {CARDS.slice(2, 4).map(({ kind, Icon, color, label, value }, i) => (
                            <Animated.View key={kind} entering={FadeInDown.delay((i + 2) * 50).duration(280)} style={{ flex: 1 }}>
                                <PressableScale style={styles.macroCard} onPress={() => setEditingKind(kind)}>
                                    <Pencil size={16} color={colors.chevron} strokeWidth={2} style={styles.pencilCorner} />
                                    <Icon size={18} color={color} strokeWidth={2} />
                                    <Text style={styles.macroLabel}>{label}</Text>
                                    <Text style={styles.macroValue}>{value}</Text>
                                </PressableScale>
                            </Animated.View>
                        ))}
                    </View>
                </View>

                <Text style={styles.noteText}>You can adjust these anytime in settings.{'\n'}*Updating body weight will automatically recalculate these goals.</Text>
            </ScrollView>

            <EditMacroGoalModal visible={editingKind != null} kind={editingKind} initialValue={editingKind != null ? macroInitialValue(editingKind) : 0} onDismiss={() => setEditingKind(null)} onSave={handleSaveMacro} />

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.85}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 25, paddingBottom: 50 },
        topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
        scroll: { flex: 1 },
        scrollContent: { alignItems: 'center', width: '100%', paddingBottom: 16 },
        stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 28 },
        stepDot: { width: 24, height: 8, borderRadius: 4 },
        iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 12 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.text, letterSpacing: -0.5, marginBottom: 4, textAlign: 'center' },
        subtitleText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center', letterSpacing: 0.2, marginBottom: 12, paddingHorizontal: 8, lineHeight: 22 },
        macrosContainer: { width: '100%', gap: 10, marginBottom: 8 },
        macrosRow: { flexDirection: 'row', width: '100%', gap: 10 },
        macroCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 14, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, gap: 6 },
        pencilCorner: { position: 'absolute', top: 10, right: 10 },
        macroLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: -0.5 },
        macroValue: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, letterSpacing: -0.5 },
        noteText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2, marginBottom: 24 },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
        backButton: { flex: 1, height: 60, backgroundColor: colors.surface, borderRadius: radius.cardLg, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        backButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSecondary, letterSpacing: -0.5 },
        nextButton: { flex: 1, height: 60, borderRadius: radius.cardLg, overflow: 'hidden' },
        nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        nextButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff', letterSpacing: -0.5 },
    })
}
