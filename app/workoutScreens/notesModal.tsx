import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { useDebouncedSave } from '@/lib/hooks/useDebouncedSave'
import { useLocalSearchParams } from 'expo-router'
import { FileText } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function NoteModal() {
    const { workouts, handleUpdateWorkoutNote } = useWorkout()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const params = useLocalSearchParams<{ workoutId: string }>()

    // Normalize params
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''

    // Find the workout
    const workout = workouts.find((w) => w.id === workoutId)

    const [note, setNote] = useState(workout?.note || '')
    const [isFocused, setIsFocused] = useState(false)
    const insets = useSafeAreaInsets()
    const scrollBottomPad = Math.max(insets.bottom, 20) + 140

    useDebouncedSave(note, workout?.note ?? '', (v) => handleUpdateWorkoutNote(workoutId, v))

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
                                <FileText size={32} color={colors.workout} strokeWidth={2.5} />
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
                                placeholderTextColor={colors.placeholder}
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
            marginBottom: 4,
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
            marginBottom: 12,
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
            minHeight: 150,
            fontFamily: fonts.regular,
        },
        inputFocused: {
            borderColor: colors.workout,
        },
        autoSaveText: {
            fontSize: 13,
            color: colors.labelMuted,
            textAlign: 'center',
            fontStyle: 'italic',
            fontFamily: fonts.regular,
        },
    })
}
