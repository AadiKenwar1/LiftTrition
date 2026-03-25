import { useSettings } from '@/context/SettingsContext'
import { useWorkout } from '@/context/WorkoutContext'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Dumbbell } from 'lucide-react-native'
import { useEffect } from 'react'
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function CreateExerciseScreen() {
    const { userExercises, handleDeleteUserExercise } = useWorkout()
    const { setMode, mode } = useSettings()
    const router = useRouter()
    const accent = mode ? '#2f80ed' : '#22C922'
    const accentRgba = mode ? 'rgba(47, 128, 237, 0.15)' : 'rgba(34, 201, 34, 0.15)'
    useEffect(() => {
        setMode(true)
    }, [])

    const userExercisesList = Object.entries(userExercises).map(([name, exercise]) => ({
        name,
        ...exercise,
    }))

    const handleDelete = (exerciseName: string) => {
        Alert.alert('Delete Exercise', `Are you sure you want to delete "${exerciseName}"? \nNOTE: Deleting an custom exercise will delete the exercise from all workouts and logs associated with it.`, [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDeleteUserExercise(exerciseName),
            },
        ])
    }

    const renderExerciseCard = ({ item }: any) => {
        const allMuscles = [item.mainMuscle, ...item.accessoryMuscles].filter(Boolean).join(' • ')

        return (
            <View style={styles.exerciseCard}>
                <View style={[styles.accentBar, { backgroundColor: accent }]} />
                <View style={styles.cardContent}>
                    <View style={[styles.iconContainer, { borderColor: accentRgba.replace('0.15', '0.8') }]}>
                        <Dumbbell size={24} color={accent} strokeWidth={2} />
                    </View>

                    <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{item.name}</Text>

                        <View style={styles.metadataContainer}>
                            <View style={styles.metadataRow}>
                                <Text style={styles.metadataLabel}>Type: </Text>
                                <Text style={styles.metadataValue}>{item.isCompound ? 'Compound' : 'Isolation'}</Text>
                            </View>

                            <View style={styles.metadataRow}>
                                <Text style={styles.metadataLabel}>Equipment: </Text>
                                <Text style={styles.metadataValue}>{item.equipment}</Text>
                            </View>

                            <View style={styles.metadataRow}>
                                <Text style={styles.metadataLabel}>Muscles: </Text>
                                <Text style={[styles.metadataValue, styles.musclesText]}>{allMuscles}</Text>
                            </View>
                        </View>
                    </View>

                    {/*
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.name)} activeOpacity={0.7}>
                        <Trash2 size={20} color="#FF3B30" strokeWidth={2} />
                    </TouchableOpacity>
                    */}
                </View>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {userExercisesList.length === 0 ?
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconCircle, { borderColor: accent }]}>
                        <Dumbbell size={60} color={accent} strokeWidth={2} />
                    </View>
                    <Text style={styles.emptyTitle}>No Custom Exercises</Text>
                    <Text style={styles.emptySubtitle}>Tap the + button below to create your first custom exercise</Text>
                </View>
            :   <FlatList
                    data={userExercisesList}
                    renderItem={renderExerciseCard}
                    keyExtractor={(item) => item.name}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            }

            <TouchableOpacity style={[styles.fab, { shadowColor: accent }]} onPress={() => router.push('/settingsScreens/createExercise/createExercise2')} activeOpacity={0.9}>
                <LinearGradient colors={['#1F6FD8', '#2F80ED', '#4A95F3']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradientFab}>
                    <Ionicons name="add" size={50} color="white" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    listContainer: {
        padding: 25,
        paddingBottom: 200,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#282A2C',
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 28,
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 24,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    exerciseCard: {
        backgroundColor: '#282A2C',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        overflow: 'hidden',
        flexDirection: 'row',
    },
    accentBar: {
        width: 4,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 17,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 8,
        fontFamily: 'Poppins_600SemiBold',
    },
    metadataContainer: {
        gap: 4,
    },
    metadataRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    metadataLabel: {
        fontSize: 13,
        color: '#666',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    metadataValue: {
        fontSize: 13,
        color: '#aaa',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
    musclesText: {
        flex: 1,
        flexWrap: 'wrap',
    },
    deleteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    separator: {
        height: 12,
    },
    fab: {
        position: 'absolute',
        right: 15,
        bottom: 40,
        width: 64 * 1.5,
        height: 64 * 1.5,
        borderRadius: 32 * 1.5,
        borderWidth: 0.3,
        borderColor: 'grey',
        overflow: 'hidden',
        zIndex: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    gradientFab: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
