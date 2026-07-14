import LogDateModal from '@/components/WorkoutComponents/LogDateModal'
import LogHistoryList from '@/components/WorkoutComponents/LogHistoryList'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { getDailyGoal, isGoalHitToday } from '@/context/WorkoutContext/functions/progressionFunctions'
import { Log } from '@/context/WorkoutContext/types'
import { useToday } from '@/lib/hooks/useToday'
import { addDays, formatDate, getDateKey, isDateAfterToday, sortByDateDesc } from '@/lib/utils/dateHelper'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { BicepsFlexed, Calendar, Check, RotateCcw } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Animated, FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

export default function LogsModal() {
    const { handleAddLog, handleDeleteLog, logs, setLastExercise, fullExerciseLib } = useWorkout()
    const { settings } = useSettings()
    const params = useLocalSearchParams<{ workoutId: string; exerciseId: string; exerciseName: string }>()
    const { userID } = useAuth()
    const todayKey = useToday()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const weightUnit = settings.unitSystem === 'imperial' ? 'lbs' : 'kg'
    // Normalize params to strings
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''
    const exerciseId = typeof params.exerciseId === 'string' ? params.exerciseId : params.exerciseId?.[0] || ''
    const exerciseName = typeof params.exerciseName === 'string' ? params.exerciseName : params.exerciseName?.[0] || 'Log'
    const isBodyweight = fullExerciseLib[exerciseName]?.equipment === 'Bodyweight'
    const isCompound = fullExerciseLib[exerciseName]?.isCompound ?? true
    const weightLabel = isBodyweight ? `Added weight (${weightUnit})` : `Weight (${weightUnit})`
    const weightPlaceholder = '0'

    // State for the input (set information) fields
    const [weight, setWeight] = useState('')
    const [reps, setReps] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)

    //State for date choice
    const [selectedLogDate, setSelectedLogDate] = useState(() => new Date())
    const [showDateModal, setShowDateModal] = useState(false)

    //Animation states
    const [lastAddedLogId, setLastAddedLogId] = useState<string | null>(null)
    const [showAddSuccess, setShowAddSuccess] = useState(false)
    const addButtonScale = useRef(new Animated.Value(1)).current
    const pendingAddRef = useRef<{ weight: number; reps: number; dateKey: string } | null>(null)
    const flatListRef = useRef<FlatList<Log> | null>(null)
    const clearHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Filter and sort logs (most recent date first, then most recent time within same calendar day)
    const exerciseLogs = useMemo(
        () =>
            logs
                .filter((log) => log.exerciseID === exerciseId)
                .sort((a, b) => {
                    const dateKeyA = getDateKey(a.date)
                    const dateKeyB = getDateKey(b.date)
                    if (dateKeyA !== dateKeyB) return sortByDateDesc(a.date, b.date)
                    if (b.time !== a.time) return b.time - a.time
                    return b.id.localeCompare(a.id)
                }),
        [logs, exerciseId],
    )

    // Find the newly added log, highlight it, scroll to it, and clear the highlight after 500ms (matches add button).
    useEffect(() => {
        if (!pendingAddRef.current || exerciseLogs.length === 0) return
        const { weight, reps, dateKey } = pendingAddRef.current
        const added = exerciseLogs.find((log) => log.weight === weight && log.reps === reps && getDateKey(log.date) === dateKey)
        if (added) {
            setLastAddedLogId(added.id)
            pendingAddRef.current = null
            const idx = exerciseLogs.indexOf(added)
            setTimeout(() => flatListRef.current?.scrollToIndex({ index: idx, animated: true }), 100)
            if (clearHighlightTimeoutRef.current) clearTimeout(clearHighlightTimeoutRef.current)
            clearHighlightTimeoutRef.current = setTimeout(() => setLastAddedLogId(null), 500)
        }
    }, [exerciseLogs])

    // Clear the highlight timeout on unmount to prevent memory leaks.
    useEffect(() => {
        return () => {
            if (clearHighlightTimeoutRef.current) clearTimeout(clearHighlightTimeoutRef.current)
        }
    }, [])

    const showInvalidDateAlert = () => {
        Keyboard.dismiss()
        Alert.alert('Invalid Date', "You can't log workouts for future dates. Please select today or an earlier date.")
    }

    const weightVal = Number(weight)
    const repsVal = Number(reps)
    const isValid = weight.trim() !== '' && reps.trim() !== '' && Number.isFinite(weightVal) && weightVal >= 0 && Number.isInteger(repsVal) && repsVal > 0

    // Validates the date, adds the log, and shows success feedback (scale animation + checkmark).
    const handleAdd = () => {
        if (!isValid) return
        if (isDateAfterToday(selectedLogDate)) {
            showInvalidDateAlert()
            return
        }
        pendingAddRef.current = { weight: weightVal, reps: repsVal, dateKey: getDateKey(selectedLogDate) }
        handleAddLog(workoutId, exerciseId, userID, weightVal, repsVal, 0, selectedLogDate)
        setLastExercise(params.exerciseName)
        setShowAddSuccess(true)
        Animated.sequence([Animated.timing(addButtonScale, { toValue: 1.2, duration: 100, useNativeDriver: true }), Animated.timing(addButtonScale, { toValue: 1, duration: 200, useNativeDriver: true })]).start()
        setTimeout(() => setShowAddSuccess(false), 500)
    }

    const isLogDateToday = todayKey === getDateKey(selectedLogDate)

    const progressionOptions = useMemo(() => ({ weightUnit: weightUnit as 'lbs' | 'kg', isCompound }), [weightUnit, isCompound])

    const dailyGoal = useMemo(() => getDailyGoal(logs, exerciseId, selectedLogDate, progressionOptions), [logs, exerciseId, selectedLogDate, progressionOptions])

    const goalHitToday = useMemo(() => (dailyGoal ? isGoalHitToday(logs, exerciseId, selectedLogDate, dailyGoal) : false), [logs, exerciseId, selectedLogDate, dailyGoal])

    const hasLogsOnSelectedDate = useMemo(() => exerciseLogs.some((log) => getDateKey(log.date) === getDateKey(selectedLogDate)), [exerciseLogs, selectedLogDate])

    const nextGoal = useMemo(() => (goalHitToday || (!dailyGoal && hasLogsOnSelectedDate) ? getDailyGoal(logs, exerciseId, addDays(selectedLogDate, 1), progressionOptions) : null), [goalHitToday, dailyGoal, hasLogsOnSelectedDate, logs, exerciseId, selectedLogDate, progressionOptions])

    return (
        <>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <View style={styles.innerContainer}>
                    {/* Drag Handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    <View style={styles.content}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                            <View>
                                <View style={styles.exerciseTitleRow}>
                                    <Text style={styles.exerciseTitle}>{exerciseName}</Text>
                                    <BicepsFlexed size={20} color={colors.workout} strokeWidth={2} />
                                </View>

                                {/* Compact Input Section */}
                                <View style={styles.inputSection}>
                                    {/* Input Fields Row */}
                                    <View style={styles.inputsRow}>
                                        {/* Weight Input */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>{weightLabel}</Text>
                                            <TextInput style={[styles.input, focusedField === 'weight' && styles.inputFocused]} placeholder={weightPlaceholder} placeholderTextColor={colors.placeholder} value={weight} onChangeText={setWeight} onFocus={() => setFocusedField('weight')} onBlur={() => setFocusedField(null)} keyboardType="numeric" />
                                        </View>

                                        {/* Reps Input */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Reps</Text>
                                            <TextInput style={[styles.input, focusedField === 'reps' && styles.inputFocused]} placeholder="0" placeholderTextColor={colors.placeholder} value={reps} onChangeText={setReps} onFocus={() => setFocusedField('reps')} onBlur={() => setFocusedField(null)} keyboardType="numeric" />
                                        </View>

                                        {/* Change Date */}
                                        <TouchableOpacity onPress={() => setShowDateModal(true)} style={styles.dateButtonTouchable} activeOpacity={0.5} accessibilityLabel={isLogDateToday ? 'Change log date' : `Change log date, currently ${formatDate(selectedLogDate, false)}`} accessibilityRole="button">
                                            {isLogDateToday ?
                                                <Calendar size={22} color={colors.workout} strokeWidth={2.5} />
                                            :   <>
                                                    <Text style={styles.dateButtonMonth}>{selectedLogDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
                                                    <Text style={styles.dateButtonDay}>{selectedLogDate.getDate()}</Text>
                                                </>
                                            }
                                        </TouchableOpacity>

                                        {/* Revert to Today */}
                                        {!isLogDateToday && (
                                            <TouchableOpacity onPress={() => setSelectedLogDate(new Date())} style={styles.dateButtonTouchable} activeOpacity={0.5} accessibilityLabel="Revert to today" accessibilityRole="button">
                                                <RotateCcw size={22} color={colors.workout} strokeWidth={2.5} />
                                            </TouchableOpacity>
                                        )}

                                        {/* Add Button */}
                                        <TouchableOpacity onPress={handleAdd} disabled={!isValid} activeOpacity={0.8} style={styles.addButtonTouchable}>
                                            <Animated.View style={[styles.addButton, { transform: [{ scale: addButtonScale }] }]}>
                                                <LinearGradient
                                                    colors={
                                                        showAddSuccess ? colors.nutritionGradient
                                                        : !isValid ?
                                                            [colors.disabled, colors.disabled]
                                                        :   colors.workoutGradient
                                                    }
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.addButtonGradient}
                                                >
                                                    {showAddSuccess ?
                                                        <Check size={24} color="#FFF" strokeWidth={1.5} />
                                                    :   <Text style={styles.addButtonText}>+</Text>}
                                                </LinearGradient>
                                            </Animated.View>
                                        </TouchableOpacity>
                                    </View>

                                    {dailyGoal ?
                                        goalHitToday && nextGoal ?
                                            <>
                                                <View style={styles.goalHitRow}>
                                                    <Check size={14} color={colors.nutritionInk} strokeWidth={2.5} />
                                                    <Text style={styles.goalHitText}>Goal hit!</Text>
                                                </View>
                                                <Text style={styles.goalHitNext}>
                                                    <Text style={styles.goalLabel}>Next session: </Text>
                                                    {nextGoal.weight} {weightUnit} × {nextGoal.reps}
                                                </Text>
                                            </>
                                        :   <Text style={styles.goalText}>
                                                <Text style={styles.goalLabel}>PLATES suggested set: </Text>
                                                {dailyGoal.weight} {weightUnit} × {dailyGoal.reps}
                                            </Text>
                                    : nextGoal ?
                                        <Text style={styles.goalText}>
                                            <Text style={styles.goalLabel}>Next session: </Text>
                                            {nextGoal.weight} {weightUnit} × {nextGoal.reps}
                                        </Text>
                                    :   <Text style={styles.emptyGoalText}>Log a set to see your next progression goal</Text>}
                                </View>
                            </View>
                        </TouchableWithoutFeedback>

                        <LogHistoryList logs={exerciseLogs} weightUnit={weightUnit} lastAddedLogId={lastAddedLogId} onDeleteConfirmed={handleDeleteLog} flatListRef={flatListRef} />
                    </View>
                </View>
            </KeyboardAvoidingView>

            <LogDateModal
                visible={showDateModal}
                selectedDate={selectedLogDate}
                onClose={() => setShowDateModal(false)}
                onInvalidDate={showInvalidDateAlert}
                onConfirm={(date) => {
                    setSelectedLogDate(date)
                    setShowDateModal(false)
                }}
            />
        </>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
        },
        innerContainer: {
            flex: 1,
        },
        handleContainer: {
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 8,
        },
        handle: {
            width: 40,
            height: 5,
            backgroundColor: colors.border,
            borderRadius: 3,
        },
        content: {
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 32,
        },
        exerciseTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
        },
        exerciseTitle: {
            fontSize: 20,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
            flexShrink: 1,
        },
        goalText: {
            marginTop: 12,
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
        emptyGoalText: {
            marginTop: 12,
            fontSize: 13,
            color: colors.textMuted,
            textAlign: 'center',
            fontFamily: fonts.medium,
            letterSpacing: -0.2,
        },
        goalHitRow: {
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
        },
        goalHitText: {
            fontSize: 13,
            color: colors.nutritionInk,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        goalHitNext: {
            marginTop: 3,
            fontSize: 13,
            color: colors.labelMuted,
            textAlign: 'center',
            fontFamily: fonts.medium,
            letterSpacing: -0.2,
        },
        inputSection: {
            marginBottom: 20,
        },
        inputsRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
        },
        inputGroup: {
            flex: 1,
        },
        inputLabel: {
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 6,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.hairline,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        inputFocused: {
            borderColor: colors.workout,
            opacity: 1,
        },
        addButtonTouchable: {
            width: 50,
            height: 50,
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: colors.workout,
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
        },
        addButton: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        addButtonGradient: {
            flex: 1,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        addButtonText: {
            fontSize: 24,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.regular,
        },
        dateButtonTouchable: {
            width: 50,
            height: 50,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: colors.hairline,
            alignItems: 'center',
            justifyContent: 'center',
        },
        dateButtonMonth: {
            fontSize: 9,
            color: colors.workout,
            fontFamily: fonts.semibold,
            letterSpacing: 0.5,
        },
        dateButtonDay: {
            fontSize: 16,
            color: colors.workout,
            fontFamily: fonts.semibold,
            letterSpacing: -0.5,
            marginTop: -2,
        },
    })
}
