import GoalProjectionChart from '@/components/NutritionComponents/GoalProjectionChart'
import StepProgress from '@/components/NeutralComponents/StepProgress'
import { useSettings } from '@/context/SettingsContext'
import { projectGoal } from '@/context/SettingsContext/functions/goalProjection'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { useScreenBottomPad } from '@/lib/hooks/useScreenBottomPad'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function AdjustNutrition4Screen() {
    const { settings, setSettings, handleUpdateBw } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const bottomPad = useScreenBottomPad(6)
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
        macrosCustomized?: string
    }>()

    const unit = weightUnitLabel(settings.unitSystem)
    const variant = (params.goal === 'maintain' ? 'maintain' : params.goal === 'gain' ? 'gain' : 'lose') as 'lose' | 'gain' | 'maintain'
    const current = Number(params.weight) || 0
    const goalWeight = Number(params.targetWeight) || 0

    // The quoted date derives from the calories actually leaving step 3 — hand-edits included — never from
    // the slider position the params also carry. projectGoal needs the body facts the params never carry
    // (gender, birthDate, activityLevel), so the pre-commit wizard state merges over saved settings, the
    // adjustNutrition3 pattern. A wrong-direction plan comes back weeks null / "—" instead of a fake date.
    const merged = useMemo(
        () => ({
            ...settings,
            height: Number(params.height),
            bodyWeight: Number(params.weight),
            unitSystem: params.unitSystem as 'imperial' | 'metric',
            goalType: variant,
            goalWeight,
        }),
        [params, settings, variant, goalWeight]
    )
    const { weeks, targetDate } = projectGoal(merged, Number(params.calorieGoal) || 0)

    const handleSave = () => {
        // Weight is editable on step 1, so a changed one is a weigh-in and has to reach the body-weight log
        // and the weight chart, not just settings.bodyWeight. It runs BEFORE the commit and its own settings
        // work is then discarded: computeBwUpdate only touches bodyWeight, the four macro targets and
        // goalOvershootAcknowledged, and the commit below writes every one of them explicitly, so the saved
        // settings are byte-identical either way. What survives is the logged entry, the Supabase weight row,
        // and the post-commit goal-reached check. Skipped when the weight is unchanged so simply re-running
        // the wizard doesn't stamp a redundant entry on today.
        if (current !== settings.bodyWeight) handleUpdateBw(current)
        // Wizard completion is an explicit regeneration by default — a fresh goal re-arms the
        // goal-reached prompt — but a card hand-edited on step 3 gets the same protection
        // profile.tsx gives the identical modal, so the next weigh-in can't silently discard it.
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
            macrosCustomized: params.macrosCustomized === 'true',
            goalOvershootAcknowledged: false,
        })
        // Return to the Settings tab AND drop the whole adjustNutrition1-4 wizard from
        // history — pushing would stack Settings on top of the finished wizard, letting a
        // hardware/swipe back re-enter it. dismissTo pops back to the existing Settings screen.
        router.dismissTo('/(tabs)/settings')
    }

    return (
        <View style={[styles.container, { paddingBottom: bottomPad }]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <StepProgress current={variant === 'maintain' ? 2 : 3} total={variant === 'maintain' ? 3 : 4} accent={colors.text} />
                <Text style={styles.titleText}>{variant === 'maintain' ? 'Same weight, stronger body' : weeks != null ? `You'll reach ${goalWeight} ${unit}` : `About your ${goalWeight} ${unit} goal`}</Text>
                <Text style={styles.subtitleText}>
                    {variant === 'maintain' ?
                        `Eating at maintenance holds you at ${current} ${unit} while training drives your strength up.`
                    : weeks != null ?
                        `by ${targetDate} — about ${weeks} weeks at your pace.`
                    :   `At these calories you won't ${variant === 'gain' ? 'gain' : 'lose'} weight — the plan sits ${variant === 'gain' ? 'at or below' : 'at or above'} your maintenance.`}
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
                                <Text style={[styles.statValue, { color: colors.nutrition }]}>{variant === 'gain' ? '+' : '−'}{Math.round(Math.abs(current - goalWeight) * 10) / 10} {unit}</Text>
                                <Text style={styles.statLabel}>to goal</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={[styles.statValue, { color: colors.nutrition }]}>{weeks != null ? `${weeks} wk` : '—'}</Text>
                                <Text style={styles.statLabel}>estimated</Text>
                            </View>
                        </>
                    }
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
                    <Text style={styles.saveText}>Save Changes</Text>
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
        chartCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 12, paddingHorizontal: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 12 },
        statsRow: { flexDirection: 'row', gap: 12 },
        statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 16, alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        statValue: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.5 },
        statLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.2 },
        footer: { paddingTop: 12 },
        saveButton: { width: '100%', height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        saveText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
