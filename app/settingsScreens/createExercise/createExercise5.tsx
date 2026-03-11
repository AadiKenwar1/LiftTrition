import { useSettings } from '@/context/SettingsContext'
import { EQUIPMENT_TYPES } from '@/context/WorkoutContext/exerciseLibrary/constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Dumbbell } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, Keyboard, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

const ACCENT = { workout: '#2f80ed', nutrition: '#22C922' }
const ACCENT_RGBA = { workout: 'rgba(45, 156, 255, 0.15)', nutrition: 'rgba(34, 201, 34, 0.15)' }

export default function CreateExercise5Screen() {
    const { mode } = useSettings()
    const accent = mode ? ACCENT.workout : ACCENT.nutrition
    const accentRgba = mode ? ACCENT_RGBA.workout : ACCENT_RGBA.nutrition
    const router = useRouter()
    const params = useLocalSearchParams<{
        exerciseName: string
        isCompound: string
        mainMuscle: string
        secondaryMuscles: string
    }>()
    const [selectedEquipment, setSelectedEquipment] = useState<string>('')

    function handleNext() {
        if (!selectedEquipment) {
            Alert.alert('Equipment Type Required', 'Please select the equipment type for this exercise.', [{ text: 'OK' }])
            return
        }

        router.push({
            pathname: './createExercise6',
            params: {
                exerciseName: params.exerciseName || '',
                isCompound: params.isCompound || 'false',
                mainMuscle: params.mainMuscle || '',
                secondaryMuscles: params.secondaryMuscles || '[]',
                equipment: selectedEquipment,
            },
        })
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.content}>
                    {/* Icon */}
                    <View style={styles.iconCircle}>
                        <Dumbbell size={60} color="#2f80ed" strokeWidth={2} />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>Select Equipment Type</Text>

                    {/* Equipment Buttons */}
                    <View style={styles.equipmentContainer}>
                        {EQUIPMENT_TYPES.map((equipment) => (
                            <TouchableOpacity key={equipment} style={[styles.equipmentButton, selectedEquipment === equipment && { backgroundColor: accentRgba, borderColor: accent }]} onPress={() => setSelectedEquipment(equipment)} activeOpacity={0.7}>
                                <Text style={[styles.equipmentText, selectedEquipment === equipment && styles.equipmentTextSelected]}>{equipment}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Navigation Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
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
        width: '100%',
        alignItems: 'center',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 12,
        marginTop: 5,
        backgroundColor: '#1e1e1e',
        borderColor: '#2f80ed',
    },
    titleText: {
        fontSize: 24,
        color: '#FFF',
        letterSpacing: -0.5,
        marginBottom: 24,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 0.2,
        marginBottom: 28,
        paddingHorizontal: 20,
        fontFamily: 'Poppins_400Regular',
    },
    equipmentContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 24,
    },
    equipmentButton: {
        width: '100%',
        paddingVertical: 18,
        paddingHorizontal: 20,
        backgroundColor: '#282A2C',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#2a2a2a',
        alignItems: 'center',
    },
    equipmentText: {
        fontSize: 17,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    equipmentTextSelected: {
        color: '#fff',
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
