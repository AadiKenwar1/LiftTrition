import Fab from '@/components/NeutralComponents/Fab'
import DraggableList from '@/components/WorkoutComponents/DraggableList'
import Log from '@/components/WorkoutComponents/Log'
import { useAuth } from '@/context/AuthContext'
import { useWorkout } from '@/context/WorkoutContext'
import { Exercise } from '@/context/WorkoutContext/types'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useLayoutEffect } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { RenderItemParams } from 'react-native-draggable-flatlist'

export default function ExerciseScreen() {
    //Navigation and Router
    const navigation = useNavigation()
    const router = useRouter()
    const { userID } = useAuth()
    //Get the workout from the workoutID
    const params = useLocalSearchParams<{ workoutId: string }>()
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''

    //Workout Context Functions
    const { workouts, exercises, handleUpdateExerciseOrder, handleArchiveExercise, handleDeleteExercise, fullExerciseLib } = useWorkout()
    const workout = workouts.find((w) => w.id === workoutId)

    // Filter and sort exercises for this workout (only non-archived)
    const activeExercises = exercises.filter((exercise) => exercise.workoutID === workoutId && !exercise.archived).sort((a, b) => a.order - b.order)

    // Create a key that changes when order changes (forces remount to avoid glitchy drag and drop)
    const listKey = activeExercises.map((exercise) => exercise.id).join('-')

    //Dynamically set top bar title of screen
    useLayoutEffect(() => navigation.setOptions({ title: `Exercises in ${workout?.name}` }), [navigation, workout?.name])

    function handleEdit(exercise: Exercise) {
        Alert.alert(`Options for Exercise: ${exercise.name}`, `Warning: Deleting an exercise will delete all logs associated with it. To preserve logs archiving is recommended.`, [
            {
                text: 'Archive',
                style: 'default',
                onPress: () => handleArchiveExercise(exercise.id, workoutId, false),
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDeleteExercise(exercise.id),
            },
            {
                text: 'Cancel',
                style: 'cancel',
            },
        ])
    }

    //Render logs as a Draggable List item
    function renderItem({ item, drag }: RenderItemParams<Exercise>) {
        // Look up exercise in library to get muscle groups
        const libraryExercise = fullExerciseLib[item.name]

        let muscleGroups = ''
        if (libraryExercise) {
            muscleGroups = libraryExercise.mainMuscle
        }

        return (
            <Log
                text={item.name}
                subtitle={muscleGroups}
                onPress={() => router.push({ pathname: '/workoutScreens/logsModal', params: { workoutId: workoutId, exerciseId: item.id, exerciseName: item.name } })}
                onMenuPress={drag}
                onEditPress={() => handleEdit(item)}
            />
        )
    }

    return (
        <View style={styles.container}>
            <View paddingHorizontal={25}>
                <Text style={styles.sectionSubtitle}>
                    {'Tap to log '}
                    <Text style={{ fontSize: 18 }}>·</Text>
                    {' Tap ☰ to edit '}
                    <Text style={{ fontSize: 18 }}>·</Text>
                    {'\nHold ☰ to rearrange'}
                </Text>
            </View>
            {/* Draggable List */}
            <DraggableList key={listKey} data={activeExercises} renderItem={renderItem} keyExtractor={(item) => item.id} onDragEnd={(reorderedExercises) => handleUpdateExerciseOrder(workoutId, reorderedExercises)} />
            <Fab>
                {[
                    <TouchableOpacity key="add-exercise" style={[styles.workoutFabButtons]} onPress={() => router.push({ pathname: '/workoutScreens/addExerciseModal', params: { workoutId: workoutId } })}>
                        <Ionicons name="add" size={35} color="white" shadowColor="black" shadowRadius={1} shadowOpacity={0.4} />
                    </TouchableOpacity>,
                    <TouchableOpacity key="archive" style={[styles.workoutFabButtons]} onPress={() => router.push({ pathname: '/workoutScreens/archiveModal', params: { logType: 'exercises' } })}>
                        <Ionicons name="archive-outline" size={35} color="white" shadowColor="black" shadowRadius={1} shadowOpacity={0.4} />
                    </TouchableOpacity>,
                    <TouchableOpacity key="notes" style={[styles.workoutFabButtons]} onPress={() => router.push({ pathname: '/workoutScreens/notesModal', params: { workoutId: workoutId } })}>
                        <Ionicons name="document-text-outline" size={35} color="white" shadowColor="black" shadowRadius={1} shadowOpacity={0.4} />
                    </TouchableOpacity>,
                ]}
            </Fab>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 10,
        paddingHorizontal: 10,
    },
    workoutFabButtons: {
        height: 60,
        width: 60,
        backgroundColor: '#2f80ed',
        borderRadius: 40,
        borderColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 3,
        borderWidth: 0.3,
        zIndex: 10,
    },
    sectionTitle: {
        fontSize: 22,
        flexShrink: 1,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#aaa',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
        marginBottom: 10,
    },
})
