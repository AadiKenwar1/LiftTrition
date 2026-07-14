import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { REP_CAP, REP_RESET, type DailyGoal } from '@/context/WorkoutContext/functions/progressionFunctions'
import { ArrowRight, Check, Target } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/**
 * Dev-only explorations for showing today's + next session's suggested set
 * in the logs modal. Loaded only behind the __DEV__-guarded route.
 */

export type SuggestSetData = {
    today: DailyGoal
    next: DailyGoal
    weightUnit: 'lbs' | 'kg'
    increment: number
    goalHit: boolean
    dayRolled: boolean
}

const HIT_TINT = 'rgba(0,189,72,0.12)'

function fmt(goal: DailyGoal, unit: string): string {
    return `${goal.weight} ${unit} × ${goal.reps}`
}

export function VariantStackedLines({ today, next, weightUnit, goalHit }: SuggestSetData) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View>
            <Text style={styles.goalText}>
                <Text style={styles.goalLabel}>Suggested: </Text>
                {fmt(today, weightUnit)}
                {goalHit ? ' 🎉' : ''}
            </Text>
            <Text style={styles.nextLine}>next session: {fmt(next, weightUnit)}</Text>
        </View>
    )
}

export function VariantChipGhost({ today, next, weightUnit, goalHit }: SuggestSetData) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.chipRow}>
            <View style={[styles.chip, goalHit ? styles.chipHit : styles.chipFilled]}>
                {goalHit ?
                    <Check size={13} color={colors.nutritionInk} strokeWidth={2.5} />
                :   <Target size={13} color={colors.workoutInk} strokeWidth={2.5} />}
                <Text style={[styles.chipText, { color: goalHit ? colors.nutritionInk : colors.workoutInk }]}>{fmt(today, weightUnit)}</Text>
            </View>
            <ArrowRight size={14} color={colors.textMuted} strokeWidth={2} />
            <View style={[styles.chip, goalHit ? styles.chipFilled : styles.chipGhost]}>
                <Text style={[styles.chipText, { color: goalHit ? colors.workoutInk : colors.textMuted }]}>{fmt(next, weightUnit)}</Text>
            </View>
        </View>
    )
}

export function VariantRepLadder({ today, weightUnit, increment, goalHit }: SuggestSetData) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const steps = Array.from({ length: REP_CAP - REP_RESET + 1 }, (_, i) => REP_RESET + i)
    return (
        <View style={styles.ladderRow}>
            <Text style={styles.ladderWeight}>
                {today.weight} {weightUnit}:
            </Text>
            {steps.map((r) => {
                const isTarget = r === today.reps
                const isDone = r < today.reps
                return (
                    <View key={r} style={[styles.ladderStep, isTarget && { backgroundColor: goalHit ? colors.nutrition : colors.workout, borderColor: 'transparent' }]}>
                        <Text style={[styles.ladderStepText, isTarget ? styles.ladderStepTextTarget : isDone && styles.ladderStepTextDone]}>{r}</Text>
                    </View>
                )
            })}
            <Text style={styles.ladderBump}>
                → +{increment} {weightUnit}
            </Text>
        </View>
    )
}

export function VariantRevealSwap({ today, next, weightUnit, goalHit }: SuggestSetData) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    if (!goalHit) {
        return (
            <Text style={styles.goalText}>
                <Text style={styles.goalLabel}>Suggested: </Text>
                {fmt(today, weightUnit)}
            </Text>
        )
    }
    return (
        <View style={styles.revealRow}>
            <Check size={14} color={colors.nutritionInk} strokeWidth={2.5} />
            <Text style={styles.revealText}>Goal hit! Next session: {fmt(next, weightUnit)}</Text>
        </View>
    )
}

export function VariantColdStart({ today, next, weightUnit, goalHit, dayRolled }: SuggestSetData) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    if (dayRolled) {
        return (
            <Text style={styles.goalText}>
                <Text style={styles.goalLabel}>Suggested: </Text>
                {fmt(today, weightUnit)}
            </Text>
        )
    }
    if (!goalHit) {
        return <Text style={styles.emptyText}>Log a set to see your next progression goal</Text>
    }
    return (
        <Text style={styles.goalText}>
            <Text style={styles.goalLabel}>Next session: </Text>
            {fmt(next, weightUnit)}
        </Text>
    )
}

export function VariantTwoCells({ today, next, weightUnit, goalHit }: SuggestSetData) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.cellsRow}>
            <View style={[styles.cell, goalHit && { borderColor: colors.nutrition }]}>
                <Text style={[styles.cellLabel, goalHit && { color: colors.nutritionInk }]}>{goalHit ? 'TODAY ✓' : 'TODAY'}</Text>
                <Text style={styles.cellValue}>{fmt(today, weightUnit)}</Text>
            </View>
            <View style={styles.cell}>
                <Text style={styles.cellLabel}>NEXT</Text>
                <Text style={[styles.cellValue, styles.cellValueMuted]}>{fmt(next, weightUnit)}</Text>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        goalText: {
            fontSize: 13,
            color: colors.labelMuted,
            textAlign: 'center',
            fontFamily: fonts.medium,
            letterSpacing: -0.2,
        },
        goalLabel: {
            color: colors.workout,
            fontFamily: fonts.semibold,
        },
        emptyText: {
            fontSize: 13,
            color: colors.textMuted,
            textAlign: 'center',
            fontFamily: fonts.medium,
            letterSpacing: -0.2,
        },
        nextLine: {
            marginTop: 3,
            fontSize: 11,
            color: colors.textMuted,
            textAlign: 'center',
            fontFamily: fonts.medium,
            letterSpacing: -0.2,
        },
        chipRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        chip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: radius.chip,
            borderWidth: 1,
        },
        chipFilled: {
            backgroundColor: colors.iconChipBg,
            borderColor: 'transparent',
        },
        chipGhost: {
            backgroundColor: 'transparent',
            borderColor: colors.hairline,
            borderStyle: 'dashed',
        },
        chipHit: {
            backgroundColor: HIT_TINT,
            borderColor: 'transparent',
        },
        chipText: {
            fontSize: 13,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        ladderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        },
        ladderWeight: {
            fontSize: 13,
            color: colors.textSecondary,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
            marginRight: 2,
        },
        ladderStep: {
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.hairline,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ladderStepText: {
            fontSize: 11,
            color: colors.textSecondary,
            fontFamily: fonts.semibold,
        },
        ladderStepTextTarget: {
            color: '#FFF',
        },
        ladderStepTextDone: {
            color: colors.textFaint,
        },
        ladderBump: {
            fontSize: 12,
            color: colors.textMuted,
            fontFamily: fonts.medium,
            letterSpacing: -0.2,
            marginLeft: 2,
        },
        revealRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
        },
        revealText: {
            fontSize: 13,
            color: colors.nutritionInk,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        cellsRow: {
            flexDirection: 'row',
            gap: 8,
        },
        cell: {
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingVertical: 10,
            paddingHorizontal: 12,
            alignItems: 'center',
            gap: 2,
        },
        cellLabel: {
            fontSize: 10,
            color: colors.labelMuted,
            fontFamily: fonts.semibold,
            letterSpacing: 0.5,
        },
        cellValue: {
            fontSize: 14,
            color: colors.text,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        cellValueMuted: {
            color: colors.textMuted,
        },
    })
}
