import EditMacroGoalModal, { type MacroGoalKind } from '@/components/NutritionComponents/EditMacroGoalModal'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Beef, Droplet, Flame, Pencil, Wheat } from 'lucide-react-native'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Dev-only Version 1 preview of the Macros onboarding screen (app/onboardingScreens/onboarding9.tsx).
 * Self-contained: macro values live in local state (seeded), the edit modal works locally, Back returns
 * to the versions list, Next is inert.
 */
const ACCENT = '#22C922'

export default function MacrosV1() {
    const router = useRouter()
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

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(34, 201, 34, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.stepIndicator}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <View key={i} style={[styles.stepDot, i <= 7 && styles.stepDotActive]} />
                    ))}
                </View>

                <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                    <FontAwesome name="list-alt" size={72} color={ACCENT} strokeWidth={2} />
                </View>

                <Text style={styles.titleText}>Your Personalized Plan</Text>
                <Text style={styles.subtitleText}>Here are your daily nutrition goals based on your profile</Text>

                <View style={styles.macrosContainer}>
                    <View style={styles.macrosRow}>
                        <TouchableOpacity style={styles.macroCard} onPress={() => setEditingKind('calories')} activeOpacity={0.75}>
                            <Pencil size={16} color="#888" strokeWidth={2} style={styles.pencilCorner} />
                            <Flame size={18} color="#FF6B6B" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Calories</Text>
                            <Text style={styles.macroValue}>{macros.calorieGoal}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.macroCard} onPress={() => setEditingKind('protein')} activeOpacity={0.75}>
                            <Pencil size={16} color="#888" strokeWidth={2} style={styles.pencilCorner} />
                            <Beef size={18} color="red" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Protein</Text>
                            <Text style={styles.macroValue}>{macros.proteinGoal}g</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.macrosRow}>
                        <TouchableOpacity style={styles.macroCard} onPress={() => setEditingKind('carbs')} activeOpacity={0.75}>
                            <Pencil size={16} color="#888" strokeWidth={2} style={styles.pencilCorner} />
                            <Wheat size={18} color="#FFD93D" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Carbs</Text>
                            <Text style={styles.macroValue}>{macros.carbsGoal}g</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.macroCard} onPress={() => setEditingKind('fats')} activeOpacity={0.75}>
                            <Pencil size={16} color="#888" strokeWidth={2} style={styles.pencilCorner} />
                            <Droplet size={18} color="#22C922" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Fats</Text>
                            <Text style={styles.macroValue}>{macros.fatsGoal}g</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.noteText}>You can adjust these anytime in settings.{'\n'}*Updating body weight will automatically recalculate these goals.</Text>
            </ScrollView>

            <EditMacroGoalModal visible={editingKind != null} kind={editingKind} initialValue={editingKind != null ? macroInitialValue(editingKind) : 0} onDismiss={() => setEditingKind(null)} onSave={handleSaveMacro} />

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', paddingHorizontal: 25, paddingBottom: 50 },
    topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
    scroll: { flex: 1 },
    scrollContent: { alignItems: 'center', width: '100%', paddingTop: 50, paddingBottom: 16 },
    stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 28 },
    stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
    stepDotActive: { width: 24, backgroundColor: '#22C922', borderRadius: 4 },
    iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 12 },
    titleText: { fontSize: 28, color: '#fff', letterSpacing: -0.5, marginBottom: 4, textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
    subtitleText: { fontSize: 16, color: '#aaa', textAlign: 'center', letterSpacing: 0.2, marginBottom: 12, paddingHorizontal: 8, fontFamily: 'Poppins_400Regular', lineHeight: 22 },
    macrosContainer: { width: '100%', gap: 10, marginBottom: 8 },
    macrosRow: { flexDirection: 'row', width: '100%', gap: 10 },
    macroCard: { flex: 1, backgroundColor: '#242424', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: '#242424', gap: 6 },
    pencilCorner: { position: 'absolute', top: 10, right: 10 },
    macroLabel: { fontSize: 13, color: '#aaa', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    macroValue: { fontSize: 24, color: '#fff', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    noteText: { fontSize: 12, color: '#aaa', textAlign: 'center', letterSpacing: 0.2, marginBottom: 24, fontFamily: 'Poppins_500Medium' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
    backButton: { flex: 1, height: 60, backgroundColor: '#242424', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#242424' },
    backButtonText: { fontSize: 16, color: '#888', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    nextButton: { flex: 1, height: 60, backgroundColor: '#D4F5D4', borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
    nextButtonText: { fontSize: 16, color: '#000', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
})
