import GoalProjectionChart from '@/components/NutritionComponents/GoalProjectionChart'
import OnboardingScaffold from '@/components/NeutralComponents/OnboardingScaffold'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { lbsToKg } from '@/lib/utils/unitConversions'
import { onboardingStep } from '@/lib/onboarding/steps'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/**
 * Onboarding — goal projection (review). Chart + week estimate read the real committed settings, so the
 * estimate is accurate (goalPace is stored lb/week → converted to the display unit for the weeks math).
 */
export default function OnboardingProjection() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { settings } = useSettings()
    const { current, total } = onboardingStep('projection', settings.goalType)

    const metric = settings.unitSystem === 'metric'
    const unit = metric ? 'kg' : 'lb'
    const variant = settings.goalType // 'lose' | 'gain' | 'maintain'
    const currentWeight = settings.bodyWeight
    const goalWeight = settings.goalWeight
    const paceDisplay = metric ? lbsToKg(settings.goalPace) : settings.goalPace
    const weeks = variant === 'maintain' ? 12 : Math.max(1, Math.round(Math.abs(currentWeight - goalWeight) / (paceDisplay > 0 ? paceDisplay : 1)))
    const targetDate = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + weeks * 7)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }, [weeks])

    return (
        <OnboardingScaffold
            step={current}
            total={total}
            title={variant === 'maintain' ? 'Same weight, stronger body' : `You'll reach ${goalWeight} ${unit}`}
            subtitle={variant === 'maintain' ? `Eating at maintenance holds you at ${currentWeight} ${unit} while training drives your strength up — that's recomp.` : `by ${targetDate} — about ${weeks} weeks at your pace.`}
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
                            <Text style={[styles.statValue, { color: colors.nutrition }]}>{weeks} wk</Text>
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
