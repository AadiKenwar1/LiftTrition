import { useAuth } from '@/context/AuthContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { isWorkoutNameTaken } from '@/context/WorkoutContext/functions/nameCheck'
import { useSubmitOnce } from '@/lib/hooks/useSubmitOnce'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Dumbbell, BicepsFlexed } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function AddWorkoutModal() {
    const { handleAddWorkout, workouts } = useWorkout()
    const router = useRouter()
    const { userID } = useAuth()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [workoutName, setWorkoutName] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [guardSubmit, submitting] = useSubmitOnce()
    const insets = useSafeAreaInsets()

    const scrollBottomPad = Math.max(insets.bottom, 20) + 140

    const handleCreateWorkout = () => {
        const trimmed = workoutName.trim()
        const alreadyExists = isWorkoutNameTaken(workouts, trimmed)
        if (alreadyExists) {
            // Stays on screen — don't consume the submit guard, so the user can fix the name and retry.
            Alert.alert('Workout Name Taken', `A workout named '${trimmed}' already exists. Please choose a different name.`)
            return
        }
        // Guard only the commit path (it navigates away): a double-tap during the close animation is ignored.
        guardSubmit(() => {
            handleAddWorkout(trimmed, userID)
            router.back()
        })()
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces>
                {/* Icon Section */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <BicepsFlexed size={72} color={colors.workout} strokeWidth={2} />
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
                        placeholderTextColor={colors.placeholder}
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
                    onPress={handleCreateWorkout}
                    disabled={!workoutName.trim() || submitting}
                    activeOpacity={0.8}
                    style={styles.addButtonTouchable}
                >
                    <LinearGradient colors={!workoutName.trim() ? [colors.disabled, colors.disabled] : colors.workoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                        <Text style={styles.addButtonText}>Add Workout</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
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
            width: 144,
            height: 144,
            borderRadius: 72,
            backgroundColor: colors.iconCircleBg,
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
            fontSize: 16,
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
        addButtonTouchable: {
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
            fontFamily: fonts.semibold,
        },
    })
}
