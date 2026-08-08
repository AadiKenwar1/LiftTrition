import GoalProjectionChart from '@/components/NutritionComponents/GoalProjectionChart'
import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import { useSettings } from '@/context/SettingsContext'
import { projectGoal } from '@/context/SettingsContext/functions/goalProjection'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { onboardingStep } from '@/lib/utils/onboardingSteps'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/**
 * Onboarding — goal projection (review). Weeks and date derive from the committed calorie target via
 * projectGoal — never from the stored slider pace — so the estimate follows plan-screen hand-edits and
 * whatever target the arithmetic produced (nothing clamps it for adequacy); a plan with no
 * deficit/surplus renders "—" instead of a date.
 */
export default function OnboardingProjection() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { settings } = useSettings()
    const { current, total } = onboardingStep('projection', settings.goalType)

    const unit = weightUnitLabel(settings.unitSystem)
    const variant = settings.goalType // 'lose' | 'gain' | 'maintain'
    const currentWeight = settings.bodyWeight
    const goalWeight = settings.goalWeight
    const { weeks, targetDate } = projectGoal(settings, settings.calorieGoal)

    return (
        <OnboardingScaffold
            step={current}
            total={total}
            title={variant === 'maintain' ? 'Same weight, stronger body' : weeks != null ? `You'll reach ${goalWeight} ${unit}` : `About your ${goalWeight} ${unit} goal`}
            subtitle={
                variant === 'maintain' ? `Eating at maintenance holds you at ${currentWeight} ${unit} while training drives your strength up. That's recomp.`
                : weeks != null ? `About ${weeks} weeks at your pace. That puts you there by ${targetDate}.`
                : `At these calories you won't ${variant === 'gain' ? 'gain' : 'lose'} weight — the plan sits ${variant === 'gain' ? 'at or below' : 'at or above'} your maintenance.`
            }
            accent={colors.text}
            onBack={() => router.back()}
            onNext={() => router.push('/onboardingScreens/paywall')}
            nextLabel="Continue"
        >
            <View style={styles.chartCard}>
                <GoalProjectionChart variant={variant} current={currentWeight} goal={goalWeight} unit={unit} targetDate={targetDate} />
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
                            <Text style={[styles.statValue, { color: colors.nutrition }]}>{variant === 'gain' ? '+' : '−'}{Math.abs(currentWeight - goalWeight)} {unit}</Text>
                            <Text style={styles.statLabel}>to goal</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: colors.nutrition }]}>{weeks != null ? `${weeks} wk` : '—'}</Text>
                            <Text style={styles.statLabel}>estimated</Text>
                        </View>
                    </>
                }
            </View>
        </OnboardingScaffold>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        chartCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 12, paddingHorizontal: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginBottom: 12 },
        statsRow: { flexDirection: 'row', gap: 12 },
        statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.cardLg, paddingVertical: 16, alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        statValue: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.5 },
        statLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.2 },
    })
}
