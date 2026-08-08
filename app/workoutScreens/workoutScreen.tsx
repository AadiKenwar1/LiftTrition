import EmptyStateCta from '@/components/NeutralComponents/EmptyStateCta'
import DraggableList, { DraggableListRenderParams } from '@/components/WorkoutComponents/DraggableList'
import Log from '@/components/WorkoutComponents/Log'
import { useAuth } from '@/context/AuthContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { Workout } from '@/context/WorkoutContext/types'
import { confirmDelete } from '@/lib/utils/confirmDelete'
import { useRouter } from 'expo-router'
import { BicepsFlexed } from 'lucide-react-native'
import { useMemo } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'

export default function WorkoutScreen() {
    //Workout Context Functions
    const { handleUpdateWorkoutOrder, handleArchiveWorkout, handleDeleteWorkout, handleDuplicateWorkout, workouts, exercises } = useWorkout()
    //Router
    const router = useRouter()
    //Auth Context Functions
    const { userID } = useAuth()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    // Filter and sort for archived workouts (deleted items are already removed from array)
    const activeWorkouts = workouts.filter((w) => !w.archived).sort((a, b) => a.order - b.order)

    // Active (non-archived) exercise count per workout — computed once, O(1) lookup per card
    const activeExerciseCounts = useMemo(() => {
        const counts = new Map<string, number>()
        for (const exercise of exercises) {
            if (!exercise.archived) counts.set(exercise.workoutID, (counts.get(exercise.workoutID) ?? 0) + 1)
        }
        return counts
    }, [exercises])

    function renderItem({ item, drag }: DraggableListRenderParams<Workout>) {
        const count = activeExerciseCounts.get(item.id) ?? 0
        return <Log text={item.name} subtitle={`${count} ${count === 1 ? 'exercise' : 'exercises'}`} onPress={() => router.push({ pathname: '/workoutScreens/exerciseScreen', params: { workoutId: item.id } })} onMenuPress={drag} onEditPress={() => handleEdit(item)} />
    }

    function handleEdit(workout: Workout) {
        // NOTE (Android-readiness, audit L24): this 5-button Alert exceeds Android's 3-button convention
        // (only 3 would render). Latent today — the app is iOS-first (Apple Sign-In only). Migrate this and
        // the nutrition row menu to a shared bottom ActionSheet before enabling Android.
        Alert.alert(`${workout.name}`, ``, [
            {
                text: 'Rename',
                style: 'default',
                onPress: () => router.push({ pathname: '/workoutScreens/renameModal', params: { workoutId: workout.id } }),
            },
            {
                text: 'Duplicate',
                style: 'default',
                onPress: () => {
                    if (userID) handleDuplicateWorkout(workout.id)
                },
            },
            {
                text: 'Archive',
                style: 'default',
                onPress: () => handleArchiveWorkout(workout.id, false),
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => confirmDelete({ title: `Delete ${workout.name}?`, message: 'Deleting a workout will delete all logs within the workout. This cannot be undone.', onConfirm: () => handleDeleteWorkout(workout.id) }),
            },
            {
                text: 'Cancel',
                style: 'cancel',
            },
        ])
    }

    const listHeader = (
        <>
            <Text style={styles.sectionTitle}>Workouts</Text>
        </>
    )

    return (
        <View style={styles.container}>
            {
                activeWorkouts.length === 0 ?
                    // Empty State — the hero circle is the add button; the ⋮ FAB stays as the second path
                    <View style={styles.emptyContainer}>
                        <EmptyStateCta Icon={BicepsFlexed} accent={colors.workout} title="No Workouts Yet" ctaLabel="Add your first workout" onPress={() => router.push('/workoutScreens/addWorkoutModal')} />
                    </View>
                    // Draggable List
                :   <DraggableList data={activeWorkouts} renderItem={renderItem} keyExtractor={(item) => item.id} onDragEnd={handleUpdateWorkoutOrder} ListHeaderComponent={listHeader} contentContainerStyle={{ paddingTop: 16 }} />
            }
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: 0,
        },
        sectionTitle: {
            fontSize: 26,
            flexShrink: 1,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.extrabold,
            marginBottom: 14,
        },
        sectionSubtitle: {
            fontSize: 13,
            color: colors.labelMuted,
            marginTop: 2,
            marginBottom: 14,
            fontFamily: fonts.medium,
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
            marginBottom: 50,
        },
    })
}
