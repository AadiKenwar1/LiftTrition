import ScrollableList, { ScrollableListItem } from '@/components/NeutralComponents/ScrollableList'
import { useSettings } from '@/context/SettingsContext'
import { MUSCLE_GROUPS } from '@/context/WorkoutContext/exerciseLibrary/constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { BicepsFlexed } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Keyboard, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

const ACCENT = { workout: '#2f80ed', nutrition: '#22C922' }
const ACCENT_RGBA = { workout: 'rgba(45, 156, 255, 0.15)', nutrition: 'rgba(34, 201, 34, 0.15)' }

export default function CreateExercise4Screen() {
    const { mode } = useSettings()
    const accent = mode ? ACCENT.workout : ACCENT.nutrition
    const accentRgba = mode ? ACCENT_RGBA.workout : ACCENT_RGBA.nutrition
    const router = useRouter()
    const params = useLocalSearchParams<{
        exerciseName: string
        isCompound: string
        mainMuscle: string
    }>()
    const [selectedSecondaryMuscles, setSelectedSecondaryMuscles] = useState<string[]>([])

    // Filter out the main muscle from the list
    const filteredMuscleList = useMemo(() => {
        return MUSCLE_GROUPS.filter((muscle) => muscle !== params.mainMuscle)
    }, [params.mainMuscle])

    const muscleListItems: ScrollableListItem[] = useMemo(() => {
        return filteredMuscleList.map((muscle) => ({
            id: muscle,
            title: muscle,
        }))
    }, [filteredMuscleList])

    function handleMusclePress(muscle: string) {
        setSelectedSecondaryMuscles((prev) => {
            if (prev.includes(muscle)) {
                // Remove if already selected
                return prev.filter((m) => m !== muscle)
            } else {
                // Add if not selected
                return [...prev, muscle]
            }
        })
    }

    function handleNext() {
        // Secondary muscles are optional, so no validation needed
        router.push({
            pathname: './createExercise5',
            params: {
                exerciseName: params.exerciseName || '',
                isCompound: params.isCompound || 'false',
                mainMuscle: params.mainMuscle || '',
                secondaryMuscles: JSON.stringify(selectedSecondaryMuscles),
            },
        })
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <View style={styles.content}>
                    {/* Icon */}
                    <View style={styles.iconCircle}>
                        <BicepsFlexed size={60} color="#2f80ed" strokeWidth={2} />
                    </View>
                    {/* Title */}
                    <Text style={styles.titleText}>Select Secondary Muscles (optional)</Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitleText}>Tap to select. Tap again to deselect.</Text>

                    {/* Muscle List */}
                    <View style={styles.listContainer}>
                        <ScrollableList data={muscleListItems} searchPlaceholder="Search muscles..." onPress={(item) => handleMusclePress(item.title)} selectedIds={selectedSecondaryMuscles} />
                        {selectedSecondaryMuscles.length > 0 && (
                            <View style={[styles.selectedIndicator, { backgroundColor: accentRgba, borderColor: accent }]}>
                                <Text style={[styles.selectedText, { color: accent }]}>
                                    Selected ({selectedSecondaryMuscles.length}): {selectedSecondaryMuscles.join(', ')}
                                </Text>
                            </View>
                        )}
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
        paddingTop: 4,
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
        backgroundColor: '#282A2C',
        borderColor: '#2f80ed',
    },
    titleText: {
        fontSize: 28,
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
        marginBottom: 4,
        fontFamily: 'Poppins_400Regular',
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
