import Fab from '@/components/NeutralComponents/Fab'
import DraggableList, { DraggableListRenderParams } from '@/components/WorkoutComponents/DraggableList'
import Log from '@/components/WorkoutComponents/Log'
import { useAuth } from '@/context/AuthContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { IMAGE_MAP } from '@/context/WorkoutContext/exerciseLibrary/dataV2/imageMap'
import { Exercise } from '@/context/WorkoutContext/types'
import { confirmDelete } from '@/lib/utils/confirmDelete'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { Dumbbell, Pencil } from 'lucide-react-native'
import { useLayoutEffect, useMemo } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ExerciseScreen() {
    const navigation = useNavigation()
    const router = useRouter()
    const { userID } = useAuth()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

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
        Alert.alert(`${exercise.name}`, ``, [
            {
                text: 'Archive',
                style: 'default',
                onPress: () => handleArchiveExercise(exercise.id, workoutId, false),
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => confirmDelete({ title: `Delete ${exercise.name}?`, message: 'Deleting an exercise will delete all logs associated with it. This cannot be undone.', onConfirm: () => handleDeleteExercise(exercise.id) }),
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

    const listHeader = (
        <>
            <View style={styles.hintRow}>
                <Text style={styles.sectionSubtitle}>{'Tap to log '}</Text>
                <Text style={[styles.sectionSubtitle, { fontSize: 18 }]}>·</Text>
                <Text style={styles.sectionSubtitle}>{' Tap '}</Text>
                <Pencil size={13} color={colors.labelMuted} strokeWidth={2} />
                <Text style={styles.sectionSubtitle}>{' to edit'}</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { marginBottom: 14 }]}>{'Hold to rearrange'}</Text>
        </>
    )

    function renderItem({ item, drag }: DraggableListRenderParams<Exercise>) {
        const muscleGroups = fullExerciseLib[item.name]?.mainMuscle ?? ''
        const imgSource = exerciseImageSources[item.name]

        return <Log text={item.name} subtitle={muscleGroups} imgSource={imgSource} showImageFallback wrapperHeight={120} textLines={3} onPress={() => router.push({ pathname: '/workoutScreens/logsModal', params: { workoutId: workoutId, exerciseId: item.id, exerciseName: item.name } })} onMenuPress={drag} onEditPress={() => handleEdit(item)} />
    }

    return (
        <View style={styles.container}>
            {activeExercises.length === 0 ?
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Dumbbell size={56} color={colors.workout} strokeWidth={2} />
                    </View>
                    <Text style={styles.emptyTitle}>No Exercises Yet</Text>
                    <Text style={styles.emptySubtitle}>Tap the ⋮ button to add your first exercise and start logging your sets</Text>
                </View>
            :   <DraggableList data={activeExercises} renderItem={renderItem} keyExtractor={(item) => item.id} onDragEnd={handleDragEnd} ListHeaderComponent={listHeader} contentContainerStyle={{ paddingTop: 8 }} />}
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

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        workoutFabButtons: {
            height: 60,
            width: 60,
            backgroundColor: colors.workoutGradient[0],
            borderRadius: 40,
            borderColor: 'black',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 3,
            shadowColor: 'black',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            borderWidth: 0.0,
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
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
            borderWidth: 3,
            borderColor: colors.workout,
        },
        emptyTitle: {
            fontSize: 28,
            color: colors.text,
            marginBottom: 12,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        emptySubtitle: {
            fontSize: 16,
            color: colors.labelMuted,
            textAlign: 'center',
            lineHeight: 24,
            letterSpacing: 0.2,
            fontFamily: fonts.regular,
        },
        hintRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        sectionSubtitle: {
            fontSize: 14,
            color: colors.labelMuted,
            letterSpacing: 0.2,
            fontFamily: fonts.regular,
            marginBottom: 1,
        },
    })
}
