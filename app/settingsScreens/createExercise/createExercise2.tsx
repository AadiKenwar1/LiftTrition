import { useSettings } from '@/context/SettingsContext'
import { useWorkout } from '@/context/WorkoutContext'
import { useRouter } from 'expo-router'
import { Activity, Dumbbell, Target } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

const ACCENT = { workout: '#2f80ed', nutrition: '#22C922' }
const ACCENT_RGBA = { workout: 'rgba(45, 156, 255, 0.15)', nutrition: 'rgba(34, 201, 34, 0.15)' }

export default function CreateExercise2Screen() {
    const router = useRouter()
    const { fullExerciseLib } = useWorkout()
    const { mode } = useSettings()
    const accent = mode ? ACCENT.workout : ACCENT.nutrition
    const accentRgba = mode ? ACCENT_RGBA.workout : ACCENT_RGBA.nutrition
    const [exerciseName, setExerciseName] = useState('')
    const [isCompound, setIsCompound] = useState<boolean>(false)

    function handleNext() {
        const trimmedName = exerciseName.trim()

        if (!trimmedName) {
            Alert.alert('Exercise Name Required', 'Please enter a name for your exercise.', [{ text: 'OK' }])
            return
        }

        if (trimmedName in fullExerciseLib) {
            Alert.alert('Duplicate Name', 'An exercise with this name already exists. Please choose a different name.')
            return
        }

        router.push({
            pathname: './createExercise3',
            params: {
                exerciseName: trimmedName,
                isCompound: isCompound.toString(),
            },
        })
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.content}>
                    {/* Icon */}
                    <View style={[styles.iconCircle, { borderColor: accent }]}>
                        <Dumbbell size={72} color={accent} strokeWidth={2} />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>Create Custom Exercise</Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitleText}>Let's start with the basics</Text>

                    {/* Exercise Name Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Exercise Name</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder="e.g., Cable Chest Fly" placeholderTextColor="#555" value={exerciseName} onChangeText={setExerciseName} autoCapitalize="words" />
                        </View>
                    </View>

                    {/* Exercise Type Selection */}
                    <View style={styles.typeContainer}>
                        <Text style={styles.inputLabel}>Exercise Type</Text>
                        <View style={styles.typeButtons}>
                            <TouchableOpacity style={[styles.typeButton, isCompound === true && { backgroundColor: accentRgba, borderColor: accent }]} onPress={() => setIsCompound(true)} activeOpacity={0.7}>
                                <View style={[styles.typeIconCircle, isCompound === true && { backgroundColor: accentRgba.replace('0.15', '0.2'), borderColor: accent }]}>
                                    <Activity size={28} color={isCompound === true ? accent : '#666'} strokeWidth={2.5} />
                                </View>
                                <Text style={[styles.typeText, isCompound === true && styles.typeTextSelected]}>Compound</Text>
                                <Text style={styles.typeDescription}>Multi joint exercise</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.typeButton, isCompound === false && { backgroundColor: accentRgba, borderColor: accent }]} onPress={() => setIsCompound(false)} activeOpacity={0.7}>
                                <View style={[styles.typeIconCircle, isCompound === false && { backgroundColor: accentRgba.replace('0.15', '0.2'), borderColor: accent }]}>
                                    <Target size={28} color={isCompound === false ? accent : '#666'} strokeWidth={2.5} />
                                </View>
                                <Text style={[styles.typeText, isCompound === false && styles.typeTextSelected]}>Isolation</Text>
                                <Text style={styles.typeDescription}>Single joint exercise</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Navigation Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={[styles.nextButton, { backgroundColor: accent, shadowColor: accent }]} onPress={handleNext} activeOpacity={0.8}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 25,
        paddingTop: 20,
        paddingBottom: 40,
    },
    content: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 12,
        marginTop: 10,
        backgroundColor: '#282A2C',
    },
    titleText: {
        fontSize: 24,
        color: '#FFF',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 0.2,
        marginBottom: 16,
        fontFamily: 'Poppins_400Regular',
    },
    inputGroup: {
        width: '100%',
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 15,
        color: '#aaa',
        marginBottom: 8,
        paddingLeft: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#282A2C',
        paddingHorizontal: 16,
        height: 52,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    typeContainer: {
        width: '100%',
    },
    typeButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    typeButton: {
        flex: 1,
        backgroundColor: '#282A2C',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#2a2a2a',
        paddingVertical: 20,
        paddingHorizontal: 12,
        alignItems: 'center',
        gap: 8,
    },
    typeIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    typeText: {
        fontSize: 16,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    typeTextSelected: {
        color: '#fff',
    },
    typeDescription: {
        fontSize: 12,
        color: '#aaa',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    backButton: {
        flex: 1,
        height: 52,
        backgroundColor: '#282A2C',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    backButtonText: {
        fontSize: 16,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    nextButton: {
        flex: 2,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
