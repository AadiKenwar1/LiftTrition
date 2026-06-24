import ProgressWheel from '@/components/GraphComponents/ProgressWheel'
import { useNutrition } from '@/context/NutritionContext'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface DailyIntakeCardProps {
    /** Date to summarize. Defaults to today. */
    date?: Date
}

interface MacroBarRowProps {
    label: string
    value: string
    pct: number
    colors: Colors
    styles: ReturnType<typeof makeStyles>
}

function MacroBarRow({ label, value, pct, styles }: MacroBarRowProps) {
    const width = `${Math.min(100, Math.max(0, pct))}%` as const
    return (
        <View>
            <View style={styles.barHeader}>
                <Text style={styles.barLabel}>{label}</Text>
                <Text style={styles.barValue}>{value}</Text>
            </View>
            <View style={styles.track}>
                <View style={[styles.fill, { width }]} />
            </View>
        </View>
    )
}

export default function DailyIntakeCard({ date = new Date() }: DailyIntakeCardProps) {
    const { handleGetMacrosForDate } = useNutrition()
    const { settings } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const macros = handleGetMacrosForDate(date)
    const pct = (value: number, goal: number) => (goal > 0 ? (value / goal) * 100 : 0)
    const caloriePct = pct(macros.totalCalories, settings.calorieGoal)
    const remaining = Math.round(settings.calorieGoal - macros.totalCalories)

    return (
        <View style={styles.card}>
            <ProgressWheel percent={caloriePct} size={110} strokeWidth={13} color={colors.nutrition}>
                <View style={styles.center}>
                    <Text style={styles.calNumber}>{Math.round(macros.totalCalories)}</Text>
                    <Text style={styles.calGoal}>/ {settings.calorieGoal}</Text>
                </View>
            </ProgressWheel>
            <View style={styles.right}>
                <Text style={styles.kcalLeft}>{remaining >= 0 ? `${remaining.toLocaleString()} kcal left` : `${Math.abs(remaining).toLocaleString()} kcal over`}</Text>
                <View style={styles.bars}>
                    <MacroBarRow label="Fats" value={`${Math.round(macros.totalFats)}g`} pct={pct(macros.totalFats, settings.fatsGoal)} colors={colors} styles={styles} />
                    <MacroBarRow label="Carbs" value={`${Math.round(macros.totalCarbs)}g`} pct={pct(macros.totalCarbs, settings.carbsGoal)} colors={colors} styles={styles} />
                    <MacroBarRow label="Protein" value={`${Math.round(macros.totalProtein)}g`} pct={pct(macros.totalProtein, settings.proteinGoal)} colors={colors} styles={styles} />
                </View>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 18,
            backgroundColor: colors.surface,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 20,
            marginBottom: 16,
        },
        center: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        calNumber: {
            fontFamily: fonts.extrabold,
            fontSize: 24,
            color: colors.text,
            lineHeight: 30,
        },
        calGoal: {
            fontFamily: fonts.medium,
            fontSize: 12,
            color: colors.labelMuted,
            marginTop: 3,
        },
        right: {
            flex: 1,
        },
        kcalLeft: {
            fontFamily: fonts.medium,
            fontSize: 13,
            color: colors.labelMuted,
            marginBottom: 12,
        },
        bars: {
            gap: 11,
        },
        barHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 5,
        },
        barLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.textSecondary,
        },
        barValue: {
            fontFamily: fonts.bold,
            fontSize: 13,
            color: colors.text,
        },
        track: {
            height: 7,
            backgroundColor: colors.ringTrack,
            borderRadius: 4,
            overflow: 'hidden',
        },
        fill: {
            height: '100%',
            backgroundColor: colors.nutrition,
            borderRadius: 4,
        },
    })
}
