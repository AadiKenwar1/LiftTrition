import { useWorkout } from '@/context/WorkoutContext'
import { useLocalSearchParams } from 'expo-router'
import { FileText } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function NoteModal() {
    const { workouts, handleUpdateWorkoutNote } = useWorkout()
    const params = useLocalSearchParams<{ workoutId: string }>()

    // Normalize params
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''

    // Find the workout
    const workout = workouts.find((w) => w.id === workoutId)

    const [note, setNote] = useState(workout?.note || '')
    const [isFocused, setIsFocused] = useState(false)
    const insets = useSafeAreaInsets()
    const scrollBottomPad = Math.max(insets.bottom, 20) + 140

    // Auto-save when note changes (after initial load)
    useEffect(() => {
        if (workout && note !== workout.note) {
            handleUpdateWorkoutNote(workoutId, note)
        }
    }, [note])

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.innerContainer}>
                    {/* Drag Handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator={false}
                        bounces
                        nestedScrollEnabled
                    >
                        {/* Icon Section */}
                        <View style={styles.iconContainer}>
                            <View style={styles.iconCircle}>
                                <FileText size={32} color="#2f80ed" strokeWidth={2.5} />
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>Workout Notes</Text>
                        <Text style={styles.subtitle}>Jot down any notes about this workout</Text>

                        {/* Text Input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.input, isFocused && styles.inputFocused]}
                                placeholder="Add a note..."
                                placeholderTextColor="#666"
                                value={note}
                                onChangeText={setNote}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                autoFocus
                            />
                        </View>

                        {/* Auto-save indicator */}
                        <Text style={styles.autoSaveText}>Saves automatically</Text>
                    </ScrollView>
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
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#282A2C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2f80ed',
    },
    title: {
        fontSize: 24,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 4,
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    inputContainer: {
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#282A2C',
        minHeight: 150,
        fontFamily: 'Poppins_400Regular',
    },
    inputFocused: {
        borderColor: '#2f80ed',
    },
    autoSaveText: {
        fontSize: 13,
        color: '#aaa',
        textAlign: 'center',
        fontStyle: 'italic',
        fontFamily: 'Poppins_400Regular',
    },
})
