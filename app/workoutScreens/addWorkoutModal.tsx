import { useAuth } from '@/context/AuthContext'
import { useWorkout } from '@/context/WorkoutContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Dumbbell } from 'lucide-react-native'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function AddWorkoutModal() {
    const { handleAddWorkout } = useWorkout()
    const router = useRouter()
    const { userID } = useAuth()
    const [workoutName, setWorkoutName] = useState('')
    const [isFocused, setIsFocused] = useState(false)

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
                        <Dumbbell size={72} color="#2f80ed" strokeWidth={2} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Create New Workout</Text>
                <Text style={styles.subtitle}>Enter a name for your workout</Text>

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

                {/* Add Button */}
                <TouchableOpacity
                    onPress={() => {
                        handleAddWorkout(workoutName, userID)
                        router.back()
                    }}
                    disabled={!workoutName.trim()}
                    activeOpacity={0.8}
                    style={styles.addButtonTouchable}
                >
                    <LinearGradient colors={!workoutName.trim() ? ['#333', '#333'] : ['#1A7AD4', '#2f80ed', '#5BA3F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                        <Text style={styles.addButtonText}>Add Workout</Text>
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
        fontSize: 16,
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
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#282A2C',
        fontFamily: 'Poppins_400Regular',
    },
    inputFocused: {
        borderColor: '#2f80ed',
    },
    addButtonTouchable: {
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
    addButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
