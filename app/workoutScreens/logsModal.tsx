import LogDateModal from '@/components/WorkoutComponents/LogDateModal'
import LogHistoryList from '@/components/WorkoutComponents/LogHistoryList'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { useWorkout } from '@/context/WorkoutContext'
import { Log } from '@/context/WorkoutContext/types'
import { formatDateOrToday, getDateKey, isDateAfterToday, sortByDateDesc } from '@/lib/utils/dateHelper'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { Calendar, Check } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Alert, Animated, FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

export default function LogsModal() {
    const { handleAddLog, handleDeleteLog, logs, setLastExercise } = useWorkout()
    const { settings } = useSettings()
    const params = useLocalSearchParams<{ workoutId: string; exerciseId: string; exerciseName: string }>()
    const { userID } = useAuth()

    const weightUnit = settings.unitSystem === 'imperial' ? 'lbs' : 'kg'
    // Normalize params to strings
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''
    const exerciseId = typeof params.exerciseId === 'string' ? params.exerciseId : params.exerciseId?.[0] || ''
    const exerciseName = typeof params.exerciseName === 'string' ? params.exerciseName : params.exerciseName?.[0] || 'Log'

    // State for the input (set information) fields
    const [weight, setWeight] = useState('')
    const [reps, setReps] = useState('')
    const [rpe, setRpe] = useState('')
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

    // Find the newly added log, highlight it, scroll to it, and clear the highlight after 500ms (matches add button).
    useEffect(() => {
        if (!pendingAddRef.current || logs.length === 0) return
        const { weight, reps, dateKey } = pendingAddRef.current
        const matching = logs
            .filter((log) => log.exerciseID === exerciseId && log.weight === weight && log.reps === reps && getDateKey(log.date) === dateKey)
            .sort((a, b) => (b.time !== a.time ? b.time - a.time : b.id.localeCompare(a.id)))
        if (matching.length > 0) {
            const added = matching[0]
            const newLogId = added.id
            setLastAddedLogId(newLogId)
            pendingAddRef.current = null
            const idx = exerciseLogs.findIndex((l) => l.id === newLogId)
            if (idx >= 0) {
                setTimeout(() => flatListRef.current?.scrollToIndex({ index: idx, animated: true }), 100)
            }
            if (clearHighlightTimeoutRef.current) clearTimeout(clearHighlightTimeoutRef.current)
            clearHighlightTimeoutRef.current = setTimeout(() => setLastAddedLogId(null), 500)
        }
    }, [logs, exerciseId])

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

    // Validates the date, adds the log, and shows success feedback (scale animation + checkmark).
    const handleAdd = () => {
        if (weight.trim() && reps.trim()) {
            if (isDateAfterToday(selectedLogDate)) {
                showInvalidDateAlert()
                return
            }
            const weightVal = parseFloat(weight)
            const repsVal = parseInt(reps)
            const rpeValue = rpe.trim() ? parseFloat(rpe) : 0
            pendingAddRef.current = { weight: weightVal, reps: repsVal, dateKey: getDateKey(selectedLogDate) }
            handleAddLog(workoutId, exerciseId, userID, weightVal, repsVal, rpeValue, selectedLogDate)
            setLastExercise(params.exerciseName)
            setShowAddSuccess(true)
            Animated.sequence([Animated.timing(addButtonScale, { toValue: 1.2, duration: 100, useNativeDriver: true }), Animated.timing(addButtonScale, { toValue: 1, duration: 200, useNativeDriver: true })]).start()
            setTimeout(() => setShowAddSuccess(false), 500)
        }
    }

    const isValid = weight.trim() && reps.trim()

    // Filter and sort logs (most recent date first, then most recent time within same calendar day)
    const exerciseLogs = logs
        .filter((log) => log.exerciseID === exerciseId)
        .sort((a, b) => {
            const dateKeyA = getDateKey(a.date)
            const dateKeyB = getDateKey(b.date)
            if (dateKeyA !== dateKeyB) return sortByDateDesc(a.date, b.date)
            if (b.time !== a.time) return b.time - a.time
            return b.id.localeCompare(a.id)
        })

    return (
        <>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <View style={styles.innerContainer}>
                    {/* Drag Handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    <View style={styles.content}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View>
                                <Text style={styles.exerciseTitle}>{exerciseName}</Text>
                                {/* Compact Input Section */}
                                <View style={styles.inputSection}>
                                    {/* Input Fields Row */}
                                    <View style={styles.inputsRow}>
                                        {/* Weight Input */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Weight ({weightUnit})</Text>
                                            <TextInput
                                                style={[styles.input, focusedField === 'weight' && styles.inputFocused]}
                                                placeholder="0"
                                                placeholderTextColor="#666"
                                                value={weight}
                                                onChangeText={setWeight}
                                                onFocus={() => setFocusedField('weight')}
                                                onBlur={() => setFocusedField(null)}
                                                keyboardType="numeric"
                                                autoFocus
                                            />
                                        </View>

                                        {/* Reps Input */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Reps</Text>
                                            <TextInput
                                                style={[styles.input, focusedField === 'reps' && styles.inputFocused]}
                                                placeholder="0"
                                                placeholderTextColor="#666"
                                                value={reps}
                                                onChangeText={setReps}
                                                onFocus={() => setFocusedField('reps')}
                                                onBlur={() => setFocusedField(null)}
                                                keyboardType="numeric"
                                            />
                                        </View>

                                        {/* RPE Input - Optional */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>
                                                RPE <Text style={styles.optionalBadge}>(opt)</Text>
                                            </Text>
                                            <TextInput
                                                style={[styles.input, styles.inputOptional, focusedField === 'rpe' && styles.inputFocused]}
                                                placeholder="-"
                                                placeholderTextColor="#555"
                                                value={rpe}
                                                onChangeText={setRpe}
                                                onFocus={() => setFocusedField('rpe')}
                                                onBlur={() => setFocusedField(null)}
                                                keyboardType="numeric"
                                            />
                                        </View>

                                        {/* Add Button */}
                                        <TouchableOpacity onPress={handleAdd} disabled={!isValid} activeOpacity={0.8} style={styles.addButtonTouchable}>
                                            <Animated.View style={[styles.addButton, { transform: [{ scale: addButtonScale }] }]}>
                                                <LinearGradient
                                                    colors={
                                                        showAddSuccess ? ['#22C55E', '#16A34A']
                                                        : !isValid ?
                                                            ['#333', '#333']
                                                        :   ['#1A7AD4', '#2f80ed', '#5BA3F5']
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

                                    {/* Change Date Button */}
                                    <TouchableOpacity onPress={() => setShowDateModal(true)} style={styles.changeDateButton} activeOpacity={0.7}>
                                        <View flexDirection="column" alignItems="center">
                                            <View flexDirection="row" gap={4}>
                                                <Calendar size={18} color="#2f80ed" strokeWidth={2.5} />
                                                <Text style={styles.changeDateButtonText}>{formatDateOrToday(selectedLogDate, true)} (Tap to change)</Text>
                                            </View>
                                            <Text style={styles.changeDateButtonText}>Logs will be added to the selected date</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>

                        <LogHistoryList
                            logs={exerciseLogs}
                            weightUnit={weightUnit}
                            lastAddedLogId={lastAddedLogId}
                            onDeleteConfirmed={handleDeleteLog}
                            flatListRef={flatListRef}
                        />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
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
        backgroundColor: '#333',
        borderRadius: 3,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 32,
    },
    exerciseTitle: {
        fontSize: 20,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 16,
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
        color: '#aaa',
        marginBottom: 6,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    optionalBadge: {
        fontSize: 10,
        color: '#aaa',
        fontFamily: 'Poppins_500Medium',
    },
    input: {
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#282A2C',
        textAlign: 'center',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    inputOptional: {
        opacity: 0.7,
    },
    inputFocused: {
        borderColor: '#2f80ed',
        opacity: 1,
    },
    addButtonTouchable: {
        width: 50,
        height: 50,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#2f80ed',
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
        fontFamily: 'Poppins_400Regular',
    },
    changeDateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#282A2C',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    changeDateButtonText: {
        fontSize: 14,
        color: '#2f80ed',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
})
