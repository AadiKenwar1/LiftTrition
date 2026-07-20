import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { isWorkoutNameTaken } from '@/context/WorkoutContext/functions/nameCheck'
import { useSubmitOnce } from '@/lib/hooks/useSubmitOnce'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pencil } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function RenameModal() {
    const { workouts, handleRenameWorkout } = useWorkout()
    const router = useRouter()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const params = useLocalSearchParams<{ workoutId: string }>()

    // Normalize params
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''

    // Find the workout
    const workout = workouts.find((w) => w.id === workoutId)

    const [workoutName, setWorkoutName] = useState(workout?.name || '')
    const [isFocused, setIsFocused] = useState(false)
    const [guardSubmit, submitting] = useSubmitOnce()

    // Update name when workout changes
    useEffect(() => {
        if (workout) {
            setWorkoutName(workout.name)
        }
    }, [workout])

    const handleRename = () => {
        const trimmed = workoutName.trim()
        if (!trimmed) return
        if (isWorkoutNameTaken(workouts, trimmed, workoutId)) {
            // Stays on screen — don't consume the submit guard, so the user can fix the name and retry.
            Alert.alert('Workout Name Taken', `A workout named '${trimmed}' already exists. Please choose a different name.`)
            return
        }
        // Guard only the commit path (it navigates away): a double-tap during the close animation is ignored.
        guardSubmit(() => {
            handleRenameWorkout(workoutId, trimmed)
            router.back()
        })()
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
                        <Pencil size={72} color={colors.workout} strokeWidth={2.5} />
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
                        placeholderTextColor={colors.placeholder}
                        value={workoutName}
                        onChangeText={setWorkoutName}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        autoFocus
                        blurOnSubmit={false}
                    />
                </View>

                {/* Rename Button */}
                <TouchableOpacity onPress={handleRename} disabled={!isValid || submitting} activeOpacity={0.8} style={styles.renameButtonTouchable}>
                    <LinearGradient colors={!isValid ? [colors.disabled, colors.disabled] : colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.renameButton}>
                        <Text style={styles.renameButtonText}>Rename</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
        iconContainer: {
            alignItems: 'center',
            marginBottom: 16,
        },
        iconCircle: {
            width: 144,
            height: 144,
            borderRadius: 72,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.workout,
        },
        title: {
            fontSize: 24,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 6,
            fontFamily: fonts.semibold,
            letterSpacing: -0.5,
        },
        subtitle: {
            fontSize: 14,
            color: colors.labelMuted,
            textAlign: 'center',
            marginBottom: 20,
            fontFamily: fonts.regular,
            letterSpacing: 0.2,
        },
        inputContainer: {
            marginBottom: 16,
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        inputFocused: {
            borderColor: colors.workout,
        },
        renameButtonTouchable: {
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: colors.workout,
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
            fontFamily: fonts.semibold,
        },
    })
}
