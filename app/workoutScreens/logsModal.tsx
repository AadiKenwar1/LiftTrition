import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { useWorkout } from '@/context/WorkoutContext'
import { Log } from '@/context/WorkoutContext/types'
import { formatDate, sortByDateDesc } from '@/lib/utils/dateHelper'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Trash } from 'lucide-react-native'
import { useState } from 'react'
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

export default function LogsModal() {
    const { handleAddLog, handleDeleteLog, logs, setLastExercise } = useWorkout()
    const { settings } = useSettings()
    const router = useRouter()
    const params = useLocalSearchParams<{ workoutId: string; exerciseId: string; exerciseName: string }>()
    const { userID } = useAuth()

    const weightUnit = settings.unitSystem === 'imperial' ? 'lbs' : 'kg'
    // Normalize params to strings
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''
    const exerciseId = typeof params.exerciseId === 'string' ? params.exerciseId : params.exerciseId?.[0] || ''

    const [weight, setWeight] = useState('')
    const [reps, setReps] = useState('')
    const [rpe, setRpe] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)

    const handleAdd = () => {
        if (weight.trim() && reps.trim()) {
            const date = new Date()
            const rpeValue = rpe.trim() ? parseFloat(rpe) : 0
            handleAddLog(workoutId, exerciseId, userID, parseFloat(weight), parseInt(reps), rpeValue, date)
        }
        setLastExercise(params.exerciseName)
    }

    const isValid = weight.trim() && reps.trim()

    // Filter and sort logs (most recent first)
    const exerciseLogs = logs.filter((log) => log.exerciseID === exerciseId).sort((a, b) => sortByDateDesc(a.date, b.date))

    // Render log item
    const renderLog = ({ item }: { item: Log }) => (
        <View style={styles.logItemWrapper}>
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
                    <Text style={styles.logDate}>{formatDate(item.date, true)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.deleteButton} activeOpacity={0.6}>
                    <Trash size={20} color="#FF453A" strokeWidth={2.5} />
                </TouchableOpacity>
            </View>
        </View>
    )

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.innerContainer}>
                    {/* Drag Handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    <View style={styles.content}>
                        {/* Compact Input Section */}
                        <View style={styles.inputSection}>
                            {/* Input Fields Row */}
                            <View style={styles.inputsRow}>
                                {/* Weight Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Weight ({weightUnit})</Text>
                                    <TextInput style={[styles.input, focusedField === 'weight' && styles.inputFocused]} placeholder="0" placeholderTextColor="#666" value={weight} onChangeText={setWeight} onFocus={() => setFocusedField('weight')} onBlur={() => setFocusedField(null)} keyboardType="numeric" autoFocus />
                                </View>

                                {/* Reps Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Reps</Text>
                                    <TextInput style={[styles.input, focusedField === 'reps' && styles.inputFocused]} placeholder="0" placeholderTextColor="#666" value={reps} onChangeText={setReps} onFocus={() => setFocusedField('reps')} onBlur={() => setFocusedField(null)} keyboardType="numeric" />
                                </View>

                                {/* RPE Input - Optional */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabelOptional}>
                                        RPE <Text style={styles.optionalBadge}>(opt)</Text>
                                    </Text>
                                    <TextInput style={[styles.inputOptional, focusedField === 'rpe' && styles.inputFocused]} placeholder="-" placeholderTextColor="#555" value={rpe} onChangeText={setRpe} onFocus={() => setFocusedField('rpe')} onBlur={() => setFocusedField(null)} keyboardType="numeric" />
                                </View>

                                {/* Add Button */}
                                <TouchableOpacity onPress={handleAdd} disabled={!isValid} activeOpacity={0.8} style={styles.addButtonTouchable}>
                                    <LinearGradient colors={!isValid ? ['#333', '#333'] : ['#1A7AD4', '#2f80ed', '#5BA3F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                                        <Text style={styles.addButtonText}>+</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Logs List Section */}
                        <View style={styles.logsSection}>
                            <Text style={styles.logsSectionTitle}>History</Text>
                            <FlatList data={exerciseLogs} renderItem={renderLog} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={styles.logsList} />
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
        color: '#888',
        marginBottom: 6,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    inputLabelOptional: {
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    optionalBadge: {
        fontSize: 10,
        color: '#555',
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
        borderColor: '#2a2a2a',
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
    logsSection: {
        flex: 1,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
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
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
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
        color: '#666',
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
        color: '#888',
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
