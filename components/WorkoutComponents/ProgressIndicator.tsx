import { fonts, useColors, type Colors } from '@/context/ThemeContext'
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
 * The set's colour follows its label — today's target in the workout ink, a next-session set in
 * the label's muted grey — so green appears only on the GOAL HIT line. A hit and a first-day
 * preview show the same numbers for the same reason (the selected day is settled), and differ
 * only by that line.
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
    const styles = useMemo(() => makeStyles(colors), [colors])

    if (!goal) {
        return (
            <View style={styles.wrap}>
                <Text style={styles.caps}>{CALIBRATION_LABEL[status]}</Text>
                <Text style={styles.prompt}>{getCalibrationMessage(status)}</Text>
            </View>
        )
    }

    // Colour follows the label: today's target takes the workout Ink (the readable-text
    // counterpart of the accent — the neon fill falls below AA), while a next-session set, hit or
    // preview, matches the label's muted grey so green is reserved for the GOAL HIT line.
    const ink = view === 'today' ? colors.workoutInk : colors.labelMuted

    return (
        <View style={styles.wrap}>
            {view === 'hit' && <Text style={[styles.caps, styles.capsHit]}>GOAL HIT!</Text>}
            <Text style={styles.caps}>{view === 'today' ? "TODAY'S SUGGESTED SET" : 'NEXT SESSION SUGGESTED SET'}</Text>
            <View style={styles.numbersRow}>
                {/* Rendered raw. Only the goal reaches this component, so a 0 could be a bodyweight
                    set or a zero-weight log, and a label naming either would sometimes be wrong. */}
                <Text style={[styles.value, { color: ink }]}>{goal.weight}</Text>
                <Text style={[styles.unit, { color: ink }]}>{weightUnit}</Text>
                <Text style={[styles.times, { color: ink }]}>×</Text>
                <Text style={[styles.value, { color: ink }]}>{goal.reps}</Text>
                {/* Always plural: the rep floor puts the lowest goal this can render at 3. */}
                <Text style={[styles.unit, { color: ink }]}>reps</Text>
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
        numbersRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 3,
        },
        // Colour is applied at the call site — the whole line takes the accent ink, so these carry
        // size and weight only. Sized to match logWeight/logReps in LogHistoryList so the suggestion
        // and the sets it is measured against read at the same scale.
        value: {
            fontFamily: fonts.extrabold,
            fontSize: 17,
            letterSpacing: -0.5,
        },
        unit: {
            fontFamily: fonts.medium,
            fontSize: 12,
        },
        times: {
            fontFamily: fonts.medium,
            fontSize: 16,
            marginHorizontal: 1,
        },
    })
}
