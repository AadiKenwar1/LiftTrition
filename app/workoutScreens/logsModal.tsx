import DatePicker from '@/components/NutritionComponents/DatePicker'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { useWorkout } from '@/context/WorkoutContext'
import { Log } from '@/context/WorkoutContext/types'
import { formatDate, formatDateOrToday, getDateKey, isDateAfterToday, sortByDateDesc } from '@/lib/utils/dateHelper'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { Calendar, Check, Trash } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
    Alert,
    Animated,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    UIManager,
    View,
} from 'react-native'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

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

    const [weight, setWeight] = useState('')
    const [reps, setReps] = useState('')
    const [rpe, setRpe] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)
    const [selectedLogDate, setSelectedLogDate] = useState(() => new Date())
    const [showDateModal, setShowDateModal] = useState(false)
    const [tempDate, setTempDate] = useState(() => new Date())
    const [lastAddedLogId, setLastAddedLogId] = useState<string | null>(null)
    const [showAddSuccess, setShowAddSuccess] = useState(false)
    const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
    const pendingAddRef = useRef<{ weight: number; reps: number; dateKey: string } | null>(null)
    const deleteOpacity = useRef(new Animated.Value(1)).current
    const deleteTranslateX = useRef(new Animated.Value(0)).current
    const addButtonScale = useRef(new Animated.Value(1)).current
    const flatListRef = useRef<FlatList>(null)
    const clearHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Sync tempDate with selectedLogDate when the date picker modal opens.
    useEffect(() => {
        if (showDateModal) setTempDate(selectedLogDate)
    }, [showDateModal])

    // Find the newly added log, highlight it, scroll to it, and clear the highlight after 500ms (matches add button).
    useEffect(() => {
        if (!pendingAddRef.current || logs.length === 0) return
        const { weight, reps, dateKey } = pendingAddRef.current
        const matching = logs
            .filter(
                (log) =>
                    log.exerciseID === exerciseId &&
                    log.weight === weight &&
                    log.reps === reps &&
                    getDateKey(log.date) === dateKey
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        if (matching.length > 0) {
            const newLogId = matching[0].id
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

    // Run the slide-out animation for the log being deleted, then remove it from the list.
    useEffect(() => {
        if (!deletingLogId) return
        deleteOpacity.setValue(1)
        deleteTranslateX.setValue(0)
        Animated.parallel([
            Animated.timing(deleteOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.timing(deleteTranslateX, { toValue: 100, duration: 250, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                handleDeleteLog(deletingLogId)
                setDeletingLogId(null)
            }
        })
    }, [deletingLogId])

    // Triggers the delete animation by setting the log id to delete.
    const handleDelete = (id: string) => {
        setDeletingLogId(id)
    }

    // Validates the date, adds the log, and shows success feedback (scale animation + checkmark).
    const handleAdd = () => {
        if (weight.trim() && reps.trim()) {
            if (isDateAfterToday(selectedLogDate)) {
                Keyboard.dismiss()
                Alert.alert('Invalid Date', "You can't log workouts for future dates. Please select today or an earlier date.")
                return
            }
            const weightVal = parseFloat(weight)
            const repsVal = parseInt(reps)
            const rpeValue = rpe.trim() ? parseFloat(rpe) : 0
            pendingAddRef.current = { weight: weightVal, reps: repsVal, dateKey: getDateKey(selectedLogDate) }
            handleAddLog(workoutId, exerciseId, userID, weightVal, repsVal, rpeValue, selectedLogDate)
            setLastExercise(params.exerciseName)
            setShowAddSuccess(true)
            Animated.sequence([
                Animated.timing(addButtonScale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
                Animated.timing(addButtonScale, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start()
            setTimeout(() => setShowAddSuccess(false), 500)
        }
    }

    // Validates the selected date and confirms it for new log entries (or shows error if future date).
    const handleDateModalDone = () => {
        if (isDateAfterToday(tempDate)) {
            Keyboard.dismiss()
            Alert.alert('Invalid Date', "You can't log workouts for future dates. Please select today or an earlier date.")
            return
        }
        setSelectedLogDate(tempDate)
        setShowDateModal(false)
    }

    const isValid = weight.trim() && reps.trim()

    // Filter and sort logs (most recent date first, then most recently created first within same date)
    const exerciseLogs = logs
        .filter((log) => log.exerciseID === exerciseId)
        .sort((a, b) => {
            const byDate = sortByDateDesc(a.date, b.date)
            if (byDate !== 0) return byDate
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

    // Renders each log item with optional highlight (newly added) or delete animation.
    const renderLog = ({ item }: { item: Log }) => {
        const isDeleting = item.id === deletingLogId
        const wrapperStyle = [styles.logItemWrapper, item.id === lastAddedLogId && styles.logItemWrapperHighlight]
        const content = (
            <View style={wrapperStyle}>
                <View style={styles.logAccentBar} />
                <View style={styles.logItem}>
                    <View style={styles.logContent}>
                        <View style={styles.logInfo}>
                            <Text style={styles.logWeight}>
                                {item.weight} {weightUnit}
                            </Text>
                            <Text style={styles.logSeparator}>×</Text>
                            <Text style={styles.logReps}>{item.reps} reps</Text>
                            {item.rpe > 0 && (
                                <>
                                    <Text style={styles.logSeparator}>•</Text>
                                    <Text style={styles.logRpe}>RPE {item.rpe}</Text>
                                </>
                            )}
                        </View>
                        <Text style={styles.logDate}>{formatDateOrToday(item.date, true)}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        style={styles.deleteButton}
                        activeOpacity={0.6}
                        disabled={isDeleting}
                    >
                        <Trash size={20} color="#FF453A" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>
        )
        if (isDeleting) {
            return (
                <Animated.View style={{ opacity: deleteOpacity, transform: [{ translateX: deleteTranslateX }] }}>
                    {content}
                </Animated.View>
            )
        }
        return content
    }

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
                                            <Text style={styles.inputLabelOptional}>
                                                RPE <Text style={styles.optionalBadge}>(opt)</Text>
                                            </Text>
                                            <TextInput
                                                style={[styles.inputOptional, focusedField === 'rpe' && styles.inputFocused]}
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
                                            <Animated.View style={[styles.addButtonInner, { transform: [{ scale: addButtonScale }] }]}>
                                                <LinearGradient
                                                    colors={
                                                        showAddSuccess
                                                            ? ['#22C55E', '#16A34A']
                                                            : !isValid
                                                              ? ['#333', '#333']
                                                              : ['#1A7AD4', '#2f80ed', '#5BA3F5']
                                                    }
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.addButton}
                                                >
                                                    {showAddSuccess ? (
                                                        <Check size={24} color="#FFF" strokeWidth={3} />
                                                    ) : (
                                                        <Text style={styles.addButtonText}>+</Text>
                                                    )}
                                                </LinearGradient>
                                            </Animated.View>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Change Date Button */}
                                    <TouchableOpacity onPress={() => setShowDateModal(true)} style={styles.changeDateButton} activeOpacity={0.7}>
                                        <Calendar size={18} color="#2f80ed" strokeWidth={2.5} />
                                        <Text style={styles.changeDateButtonText}>{formatDateOrToday(selectedLogDate, true)} (Tap to change date)</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>

                        {/* Logs List Section - outside TouchableWithoutFeedback so scroll works */}
                        <View style={styles.logsSection}>
                            <Text style={styles.logsSectionTitle}>History</Text>
                            <FlatList
                                ref={flatListRef}
                                data={exerciseLogs}
                                renderItem={renderLog}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.logsList}
                                style={styles.logsFlatList}
                                keyboardShouldPersistTaps="handled"
                                onScrollBeginDrag={Keyboard.dismiss}
                                onScrollToIndexFailed={() => {}}
                            />
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
                <View style={styles.dateModalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setShowDateModal(false)}>
                        <View style={styles.dateModalBackdrop} />
                    </TouchableWithoutFeedback>
                    <View style={styles.dateModalContent}>
                        <View style={styles.handleContainer}></View>

                        <DatePicker selectedDate={tempDate} onDateChange={setTempDate} color="#2f80ed" />
                        <TouchableOpacity onPress={handleDateModalDone} activeOpacity={0.8} style={styles.dateConfirmTouchable}>
                            <LinearGradient colors={['#1A7AD4', '#2f80ed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dateConfirmButton}>
                                <Text style={styles.dateConfirmText}>Done</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    inputLabelOptional: {
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
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#282A2C',
        textAlign: 'center',
        opacity: 0.7,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
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
    addButtonInner: {
        width: '100%',
        height: '100%',
    },
    addButton: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        fontSize: 24,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
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
    dateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    dateModalBackdrop: {
        flex: 1,
    },
    dateModalContent: {
        backgroundColor: '#121212',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 24,
        paddingBottom: 48,
        maxHeight: '70%',
    },
    dateModalTitle: {
        fontSize: 20,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 4,
        textAlign: 'center',
    },
    dateModalSubtitle: {
        fontSize: 14,
        color: '#888',
        fontFamily: 'Poppins_400Regular',
        marginBottom: 16,
        textAlign: 'center',
    },
    dateConfirmTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 16,
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    dateConfirmButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateConfirmText: {
        fontSize: 17,
        color: '#FFF',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
    logsSection: {
        flex: 1,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
    },
    logsFlatList: {
        flex: 1,
    },
    logsSectionTitle: {
        fontSize: 18,
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logsList: {
        paddingBottom: 20,
    },
    logItemWrapper: {
        flexDirection: 'row',
        marginBottom: 10,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#282A2C',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    logItemWrapperHighlight: {
        backgroundColor: '#1e3a2f',
        borderColor: '#22C55E',
        borderWidth: 2,
    },
    logAccentBar: {
        width: 4,
        backgroundColor: '#2f80ed',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    logItem: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    logContent: {
        flex: 1,
        marginRight: 12,
    },
    logInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    logWeight: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logSeparator: {
        fontSize: 16,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logReps: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logRpe: {
        fontSize: 14,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logDate: {
        fontSize: 12,
        color: '#666',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
    deleteButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
})
