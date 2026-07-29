import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import {
    getCalibrationMessage,
    type DailyGoal,
    type IndicatorView,
    type ProgressionStatus,
} from '@/context/WorkoutContext/functions/progressionFunctions'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/**
 * The progression line under the log inputs: what to aim for, and whether it's been beaten.
 *
 * Voice is suggestion, never instruction — nothing here is a plan the user has to follow. Each
 * label names the session its numbers belong to ("TODAY'S" vs "NEXT"), because a hit displays the
 * NEXT session's suggestion rather than the set that was just beaten, and conflating the two is
 * the single most confusing thing this component can do.
 *
 * No fills or plates in any state — the only thing marking a hit is an accented line above the
 * label. A hit and a first-day preview show the same numbers for the same reason (the selected day
 * is settled), so they differ by that one line and nothing else.
 */

/** Mirrors `IndicatorState` from the engine, which resolves which session to show. */
type ProgressIndicatorProps = {
    status: ProgressionStatus
    goal: DailyGoal | null
    view: IndicatorView
    weightUnit: 'lbs' | 'kg'
}

const CALIBRATION_LABEL: Record<ProgressionStatus, string> = {
    coached: '',
    firstTime: 'NEW EXERCISE',
    stale: 'BEEN A WHILE',
    lowReps: 'NO WORKING SETS',
}

export default function ProgressIndicator({ status, goal, view, weightUnit }: ProgressIndicatorProps) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors), [colors])

    if (!goal) {
        return (
            <View style={styles.wrap}>
                <Text style={styles.caps}>{CALIBRATION_LABEL[status]}</Text>
                <Text style={styles.prompt}>{getCalibrationMessage(status)}</Text>
            </View>
        )
    }

    // A 10% overlay of a bright ink on near-black separates about as much as 17% of a deep ink on
    // light slate, so light takes the higher alpha to keep the two themes reading equally.
    const wash = (view === 'hit' ? colors.nutritionInk : colors.workoutInk) + (isDark ? '1A' : '2B')

    return (
        <View style={styles.wrap}>
            {view === 'hit' && <Text style={[styles.caps, styles.capsHit]}>GOAL HIT!</Text>}
            <Text style={styles.caps}>{view === 'today' ? "TODAY'S SUGGESTED SET" : 'NEXT SESSION SUGGESTED SET'}</Text>
            <View style={[styles.numbersRow, { backgroundColor: wash }]}>
                {/* Rendered raw. Only the goal reaches this component, so a 0 could be a bodyweight
                    set or a zero-weight log, and a label naming either would sometimes be wrong. */}
                <Text style={styles.value}>{goal.weight}</Text>
                <Text style={styles.unit}>{weightUnit}</Text>
                <Text style={styles.times}>×</Text>
                <Text style={styles.value}>{goal.reps}</Text>
                {/* Always plural: the rep floor puts the lowest goal this can render at 3. */}
                <Text style={styles.unit}>reps</Text>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        // marginTop matches inputSection's marginBottom in logsModal, so the block sits an equal
        // distance from the inputs above it and whatever follows below.
        wrap: {
            marginTop: 20,
            alignItems: 'center',
            gap: 4,
        },
        caps: {
            fontFamily: fonts.semibold,
            fontSize: 10,
            letterSpacing: 0.8,
            color: colors.labelMuted,
        },
        capsHit: {
            color: colors.nutritionInk,
        },
        prompt: {
            fontFamily: fonts.medium,
            fontSize: 13,
            color: colors.textMuted,
            textAlign: 'center',
            letterSpacing: -0.2,
        },
        // The wash hugs the numbers rather than spanning the block, so it reads as a plate under the
        // set rather than a banner. Padding is what gives it that shape — the row is otherwise bare.
        numbersRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 3,
            paddingVertical: 5,
            paddingHorizontal: 14,
            borderRadius: radius.chip,
        },
        // Sized to match logWeight/logReps in LogHistoryList so the suggestion and the sets it is
        // measured against read at the same scale. Still extrabold, which is what separates a
        // suggestion from a logged set now that the size no longer does.
        value: {
            fontFamily: fonts.extrabold,
            fontSize: 17,
            letterSpacing: -0.5,
            color: colors.text,
        },
        unit: {
            fontFamily: fonts.medium,
            fontSize: 12,
            color: colors.labelMuted,
        },
        times: {
            fontFamily: fonts.medium,
            fontSize: 16,
            color: colors.textMuted,
            marginHorizontal: 1,
        },
    })
}
