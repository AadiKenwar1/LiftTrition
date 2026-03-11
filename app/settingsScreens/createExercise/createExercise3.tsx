import { useSettings } from '@/context/SettingsContext'
import ScrollableList, { ScrollableListItem } from '@/components/NeutralComponents/ScrollableList'
import { ADVANCED_MUSCLE_GROUPS, SIMPLE_MUSCLE_GROUPS } from '@/context/WorkoutContext/exerciseLibrary/constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Dumbbell } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, Keyboard, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

const ACCENT = { workout: '#2f80ed', nutrition: '#22C922' }
const ACCENT_RGBA = { workout: 'rgba(45, 156, 255, 0.15)', nutrition: 'rgba(34, 201, 34, 0.15)' }

export default function CreateExercise3Screen() {
    const { mode } = useSettings()
    const accent = mode ? ACCENT.workout : ACCENT.nutrition
    const accentRgba = mode ? ACCENT_RGBA.workout : ACCENT_RGBA.nutrition
    const router = useRouter()
    const params = useLocalSearchParams<{ exerciseName: string; isCompound: string }>()
    const [muscleView, setMuscleView] = useState<'simple' | 'advanced'>('simple')
    const [selectedMainMuscle, setSelectedMainMuscle] = useState<string>('')

    const currentMuscleList = muscleView === 'simple' ? SIMPLE_MUSCLE_GROUPS : ADVANCED_MUSCLE_GROUPS

    const muscleListItems: ScrollableListItem[] = useMemo(() => {
        return currentMuscleList.map((muscle) => ({
            id: muscle,
            title: muscle,
        }))
    }, [currentMuscleList])

    function handleNext() {
        if (!selectedMainMuscle) {
            Alert.alert('Main Muscle Required', 'Please select the main muscle group for this exercise.', [{ text: 'OK' }])
            return
        }

        router.push({
            pathname: './createExercise4',
            params: {
                exerciseName: params.exerciseName || '',
                isCompound: params.isCompound || 'false',
                mainMuscle: selectedMainMuscle,
                muscleView: muscleView,
            },
        })
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.content}>
                    {/* Icon */}
                    <View style={[styles.iconCircle, { borderColor: accent }]}>
                        <Dumbbell size={60} color={accent} strokeWidth={2} />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>Select Main Muscle</Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitleText}>Tap to select. Tap again to deselect.</Text>

                    {/* View Toggle Buttons */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, muscleView === 'simple' && { backgroundColor: accentRgba, borderColor: accent }]}
                            onPress={() => {
                                setMuscleView('simple')
                                setSelectedMainMuscle('') // Reset selection when switching views
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.toggleText, muscleView === 'simple' && styles.toggleTextActive]}>Simple</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, muscleView === 'advanced' && { backgroundColor: accentRgba, borderColor: accent }]}
                            onPress={() => {
                                setMuscleView('advanced')
                                setSelectedMainMuscle('') // Reset selection when switching views
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.toggleText, muscleView === 'advanced' && styles.toggleTextActive]}>Advanced</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Muscle List */}
                    <View style={styles.listContainer}>
                        <ScrollableList
                            data={muscleListItems}
                            searchPlaceholder="Search muscles..."
                            onPress={(item) => setSelectedMainMuscle((prev) => (prev === item.title ? '' : item.title))}
                            selectedIds={selectedMainMuscle ? [selectedMainMuscle] : []}
                        />
                        {selectedMainMuscle && (
                            <View style={[styles.selectedIndicator, { backgroundColor: accentRgba, borderColor: accent }]}>
                                <Text style={[styles.selectedText, { color: accent }]}>Selected: {selectedMainMuscle}</Text>
                            </View>
                        )}
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
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
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
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 0.2,
        marginBottom: 16,
        fontFamily: 'Poppins_400Regular',
    },
    toggleContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginBottom: 4,
    },
    toggleButton: {
        flex: 1,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#2a2a2a',
    },
    toggleText: {
        fontSize: 15,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    toggleTextActive: {
        color: '#fff',
    },
    listContainer: {
        width: '100%',
        flex: 1,
    },
    selectedIndicator: {
        marginTop: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    selectedText: {
        fontSize: 15,
        letterSpacing: -0.5,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 20,
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
