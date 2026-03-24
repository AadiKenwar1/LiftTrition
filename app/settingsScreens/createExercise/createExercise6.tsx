import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { useWorkout } from '@/context/WorkoutContext'
import { CreateExerciseData } from '@/context/WorkoutContext/functions/createExerciseFunctions'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CheckCircle2 } from 'lucide-react-native'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const ACCENT = { workout: '#2f80ed', nutrition: '#22C922' }

export default function CreateExercise6Screen() {
    const { mode } = useSettings()
    const accent = mode ? ACCENT.workout : ACCENT.nutrition
    const { userID } = useAuth()
    const { handleCreateUserExercise } = useWorkout()
    const router = useRouter()

    const params = useLocalSearchParams<{
        exerciseName: string
        isCompound: string
        mainMuscle: string
        secondaryMuscles: string
        equipment: string
    }>()

    const secondaryMuscles = params.secondaryMuscles ? JSON.parse(params.secondaryMuscles) : []
    const isCompound = params.isCompound === 'true'

    function handleSave() {
        const exerciseData: CreateExerciseData = {
            name: params.exerciseName,
            mainMuscle: params.mainMuscle,
            accessoryMuscles: secondaryMuscles,
            isCompound: isCompound,
            equipment: params.equipment,
        }

        handleCreateUserExercise(exerciseData, userID)

        Alert.alert('Success', 'Exercise created successfully!', [
            {
                text: 'OK',
                onPress: () => {
                    router.dismissAll()
                    router.push('/settingsScreens/createExercise/createExercise1')
                },
            },
        ])
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Success Icon */}
                <View style={[styles.iconCircle, { borderColor: accent }]}>
                    <CheckCircle2 size={48} color={accent} strokeWidth={2} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Review Your Exercise</Text>

                {/* Subtitle */}
                <Text style={styles.subtitleText}>Check your selections before saving</Text>

                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    {/* Exercise Name */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>Exercise Name</Text>
                        <Text style={styles.cardValue}>{params.exerciseName}</Text>
                    </View>

                    {/* Exercise Type */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>Exercise Type</Text>
                        <Text style={styles.cardValue}>{isCompound ? 'Compound' : 'Isolation'}</Text>
                    </View>

                    {/* Main Muscle */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>Main Muscle</Text>
                        <Text style={styles.cardValue}>{params.mainMuscle}</Text>
                    </View>

                    {/* Secondary Muscles */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>Secondary Muscles</Text>
                        {secondaryMuscles.length > 0 ?
                            <Text style={styles.cardValue}>{secondaryMuscles.join(', ')}</Text>
                        :   <Text style={styles.cardValueEmpty}>None selected</Text>}
                    </View>

                    {/* Equipment */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>Equipment</Text>
                        <Text style={styles.cardValue}>{params.equipment}</Text>
                    </View>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: accent, shadowColor: accent }]} onPress={handleSave} activeOpacity={0.8}>
                    <Text style={styles.saveButtonText}>Save Exercise</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    content: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 16,
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
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 18,
        letterSpacing: 0.2,
        marginBottom: 12,
        paddingHorizontal: 20,
        fontFamily: 'Poppins_400Regular',
    },
    summaryContainer: {
        width: '100%',
        gap: 10,
    },
    summaryCard: {
        backgroundColor: '#282A2C',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    cardLabel: {
        fontSize: 11,
        color: '#888',
        letterSpacing: -0.5,
        textTransform: 'uppercase',
        marginBottom: 6,
        fontFamily: 'Poppins_600SemiBold',
    },
    cardValue: {
        fontSize: 15,
        color: '#fff',
        letterSpacing: -0.5,
        lineHeight: 20,
        fontFamily: 'Poppins_600SemiBold',
    },
    cardValueEmpty: {
        fontSize: 15,
        color: '#666',
        letterSpacing: -0.5,
        fontStyle: 'italic',
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
    saveButton: {
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
    saveButtonText: {
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
