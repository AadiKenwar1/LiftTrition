import GoalProjectionChart from '@/components/NutritionComponents/GoalProjectionChart'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { lbsToKg } from '@/lib/utils/unitConversions'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function AdjustNutrition4Screen() {
    const { settings, setSettings } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const params = useLocalSearchParams<{
        height: string
        weight: string
        unitSystem: string
        goal: string
        targetWeight: string
        goalPace: string
        calorieGoal: string
        proteinGoal: string
        carbsGoal: string
        fatsGoal: string
    }>()

    const metric = params.unitSystem === 'metric'
    const unit = metric ? 'kg' : 'lb'
    const variant = (params.goal === 'maintain' ? 'maintain' : params.goal === 'gain' ? 'gain' : 'lose') as 'lose' | 'gain' | 'maintain'
    const current = Number(params.weight) || 0
    const goalWeight = Number(params.targetWeight) || 0

    // goalPace param is lb/week (storage unit); convert to the display unit for the weeks estimate.
    const paceDisplay = metric ? lbsToKg(Number(params.goalPace) || 0) : Number(params.goalPace) || 0
    const weeks = variant === 'maintain' ? 12 : Math.max(1, Math.round(Math.abs(current - goalWeight) / (paceDisplay > 0 ? paceDisplay : 1)))
    const targetDate = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + weeks * 7)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }, [weeks])

    const handleSave = () => {
        setSettings({
            ...settings,
            height: Number(params.height),
            bodyWeight: Number(params.weight),
            unitSystem: params.unitSystem as 'imperial' | 'metric',
            goalType: params.goal as 'lose' | 'gain' | 'maintain',
            goalWeight: Number(params.targetWeight),
            goalPace: params.goalPace ? Number(params.goalPace) : 0,
            calorieGoal: Number(params.calorieGoal),
            proteinGoal: Number(params.proteinGoal),
            carbsGoal: Number(params.carbsGoal),
            fatsGoal: Number(params.fatsGoal),
        })
        router.push('/(tabs)/settings')
    }

    const handleCancel = () => {
        router.push('/(tabs)/settings')
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.titleText}>{variant === 'maintain' ? 'Same weight, stronger body' : `You'll reach ${goalWeight} ${unit}`}</Text>
                <Text style={styles.subtitleText}>
                    {variant === 'maintain' ?
                        `Eating at maintenance holds you at ${current} ${unit} while training drives your strength up — that's recomp.`
                    :   `by ${targetDate} — about ${weeks} weeks at your pace.`}
                </Text>

                <View style={styles.chartCard}>
                    <GoalProjectionChart variant={variant} current={current} goal={goalWeight} unit={unit} targetDate={targetDate} />
                </View>

                <View style={styles.statsRow}>
                    {variant === 'maintain' ?
                        <>
                            <View style={styles.statCard}>
                                <Text style={[styles.statValue, { color: colors.nutrition }]}>0 {unit}</Text>
                                <Text style={styles.statLabel}>scale change</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={[styles.statValue, { color: colors.workout }]}>↑ Strength</Text>
                                <Text style={styles.statLabel}>12-week trend</Text>
                            </View>
                        </>
                    :   <>
                            <View style={styles.statCard}>
                                <Text style={[styles.statValue, { color: colors.nutrition }]}>{variant === 'gain' ? '+' : '−'}{Math.abs(current - goalWeight)} {unit}</Text>
                                <Text style={styles.statLabel}>to goal</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={[styles.statValue, { color: colors.nutrition }]}>{weeks} wk</Text>
                                <Text style={styles.statLabel}>estimated</Text>
                            </View>
                        </>
                    }
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveGradient}>
                        <Text style={styles.saveText}>Save Changes</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingBottom: 40 },
        scroll: { flex: 1 },
        scrollContent: { paddingTop: 24, paddingBottom: 16 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 22, letterSpacing: 0.1, marginBottom: 26 },
        chartCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 12, paddingHorizontal: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 12 },
        statsRow: { flexDirection: 'row', gap: 12 },
        statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 16, alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        statValue: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.5 },
        statLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.2 },
        footer: { flexDirection: 'row', gap: 12, paddingTop: 12 },
        cancelButton: { flex: 1, height: 58, borderRadius: radius.cardLg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        cancelText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textSecondary, letterSpacing: -0.3 },
        saveButton: { flex: 1, height: 58, borderRadius: radius.cardLg, overflow: 'hidden' },
        saveGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        saveText: { fontFamily: fonts.semibold, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
    })
}
