import { useWorkout } from '@/context/WorkoutContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pencil } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function RenameModal() {
    const { workouts, handleRenameWorkout } = useWorkout()
    const router = useRouter()
    const params = useLocalSearchParams<{ workoutId: string }>()

    // Normalize params
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''

    // Find the workout
    const workout = workouts.find((w) => w.id === workoutId)

    const [workoutName, setWorkoutName] = useState(workout?.name || '')
    const [isFocused, setIsFocused] = useState(false)

    // Update name when workout changes
    useEffect(() => {
        if (workout) {
            setWorkoutName(workout.name)
        }
    }, [workout])

    const handleRename = () => {
        const trimmed = workoutName.trim()
        if (!trimmed) return
        const alreadyExists = workouts.some(
            (w) => !w.archived && w.id !== workoutId && w.name.trim().toLowerCase() === trimmed.toLowerCase()
        )
        if (alreadyExists) {
            Alert.alert('Workout Name Taken', `A workout named '${trimmed}' already exists. Please choose a different name.`)
            return
        }
        handleRenameWorkout(workoutId, trimmed)
        router.back()
    }

    const isValid = workoutName.trim()

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <View style={styles.content}>
                {/* Icon Section */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Pencil size={72} color="#2f80ed" strokeWidth={2.5} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Rename Workout</Text>
                <Text style={styles.subtitle}>Enter a new name for your workout</Text>

                {/* Input Field */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, isFocused && styles.inputFocused]}
                        placeholder="Workout name"
                        placeholderTextColor="#666"
                        value={workoutName}
                        onChangeText={setWorkoutName}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        autoFocus
                        blurOnSubmit={false}
                    />
                </View>

                {/* Rename Button */}
                <TouchableOpacity onPress={handleRename} disabled={!isValid} activeOpacity={0.8} style={styles.renameButtonTouchable}>
                    <LinearGradient colors={!isValid ? ['#333', '#333'] : ['#1A7AD4', '#2f80ed', '#5BA3F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.renameButton}>
                        <Text style={styles.renameButtonText}>Rename</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
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
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2f80ed',
    },
    title: {
        fontSize: 24,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 6,
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    inputContainer: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#1e1e1e',
        fontFamily: 'Poppins_400Regular',
    },
    inputFocused: {
        borderColor: '#2f80ed',
    },
    renameButtonTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#2f80ed',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    renameButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    renameButtonText: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
