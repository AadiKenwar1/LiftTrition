import Fab from '@/components/NeutralComponents/Fab'
import DraggableList, { DraggableListRenderParams } from '@/components/WorkoutComponents/DraggableList'
import Log from '@/components/WorkoutComponents/Log'
import { useAuth } from '@/context/AuthContext'
import { useWorkout } from '@/context/WorkoutContext'
import { IMAGE_MAP } from '@/context/WorkoutContext/exerciseLibrary/dataV2/imageMap'
import { Exercise } from '@/context/WorkoutContext/types'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { Dumbbell, Pencil } from 'lucide-react-native'
import { useLayoutEffect, useMemo } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ExerciseScreen() {
    const navigation = useNavigation()
    const router = useRouter()
    const { userID } = useAuth()

    const params = useLocalSearchParams<{ workoutId: string }>()
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''

    const { workouts, exercises, handleUpdateExerciseOrder, handleArchiveExercise, handleDeleteExercise, fullExerciseLib } = useWorkout()
    const workout = workouts.find((w) => w.id === workoutId)

    const activeExercises = exercises.filter((e) => e.workoutID === workoutId && !e.archived).sort((a, b) => a.order - b.order)

    // Image sources — resolved for exercises in this workout
    const exerciseImageSources = useMemo(() => {
        const map: Record<string, number> = {}
        for (const exercise of activeExercises) {
            const entry = fullExerciseLib[exercise.name]
            const filename = entry?.imgUrl?.split('/').pop()
            if (filename && IMAGE_MAP[filename]) map[exercise.name] = IMAGE_MAP[filename]
        }
        return map
    }, [fullExerciseLib, activeExercises])

    useLayoutEffect(() => navigation.setOptions({ title: `${workout?.name}` }), [navigation, workout?.name])

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

    function handleDragEnd(reordered: Exercise[]) {
        handleUpdateExerciseOrder(workoutId, reordered)
    }

    const renderHeader = () => (
        <>
            <View style={styles.hintRow}>
                <Text style={styles.sectionSubtitle}>{'Tap to log '}</Text>
                <Text style={[styles.sectionSubtitle, { fontSize: 18 }]}>·</Text>
                <Text style={styles.sectionSubtitle}>{' Tap '}</Text>
                <Pencil size={13} color="#aaa" strokeWidth={2} />
                <Text style={styles.sectionSubtitle}>{' to edit'}</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { marginBottom: 14 }]}>{'Hold to rearrange'}</Text>
        </>
    )

    function renderItem({ item, drag }: DraggableListRenderParams<Exercise>) {
        const muscleGroups = fullExerciseLib[item.name]?.mainMuscle ?? ''
        const imgSource = exerciseImageSources[item.name]

        return (
            <Log
                text={item.name}
                subtitle={muscleGroups}
                imgSource={imgSource}
                showImageFallback
                wrapperHeight={120}
                textLines={3}
                onPress={() => router.push({ pathname: '/workoutScreens/logsModal', params: { workoutId: workoutId, exerciseId: item.id, exerciseName: item.name } })}
                onMenuPress={drag}
                onEditPress={() => handleEdit(item)}
            />
        )
    }

    return (
        <View style={styles.container}>
            {activeExercises.length === 0 ?
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Dumbbell size={56} color="#2f80ed" strokeWidth={2} />
                    </View>
                    <Text style={styles.emptyTitle}>No Exercises Yet</Text>
                    <Text style={styles.emptySubtitle}>Tap the ⋮ button to add your first exercise and start logging your sets</Text>
                </View>
            :   <DraggableList data={activeExercises} renderItem={renderItem} keyExtractor={(item) => item.id} onDragEnd={handleDragEnd} ListHeaderComponent={renderHeader} contentContainerStyle={{ paddingTop: 8 }} />}
            <Fab>
                {[
                    <TouchableOpacity activeOpacity={0.75} key="add-exercise" style={[styles.workoutFabButtons]} onPress={() => router.push({ pathname: '/workoutScreens/addExerciseModal', params: { workoutId: workoutId } })}>
                        <Ionicons name="add" size={35} color="white" shadowColor="black" shadowRadius={0} shadowOpacity={0} />
                    </TouchableOpacity>,
                    <TouchableOpacity activeOpacity={0.75} key="archive" style={[styles.workoutFabButtons]} onPress={() => router.push({ pathname: '/workoutScreens/archiveModal', params: { logType: 'exercises', workoutId } })}>
                        <Ionicons name="archive-outline" size={35} color="white" shadowColor="black" shadowRadius={0} shadowOpacity={0} />
                    </TouchableOpacity>,
                    <TouchableOpacity activeOpacity={0.75} key="notes" style={[styles.workoutFabButtons]} onPress={() => router.push({ pathname: '/workoutScreens/notesModal', params: { workoutId: workoutId } })}>
                        <Ionicons name="document-text-outline" size={35} color="white" shadowColor="black" shadowRadius={0} shadowOpacity={0} />
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
    },
    workoutFabButtons: {
        height: 60,
        width: 60,
        backgroundColor: '#2f80ed',
        borderRadius: 40,
        borderColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        borderWidth: 0.3,
        zIndex: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginBottom: 120,
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 3,
        borderColor: '#2f80ed',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    emptyTitle: {
        fontSize: 28,
        color: '#FFF',
        marginBottom: 12,
        textAlign: 'center',
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
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#aaa',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
        marginBottom: 1,
    },
})
