import DraggableList, { DraggableListRenderParams } from '@/components/WorkoutComponents/DraggableList'
import Log from '@/components/WorkoutComponents/Log'
import { useAuth } from '@/context/AuthContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { Workout } from '@/context/WorkoutContext/types'
import { useRouter } from 'expo-router'
import { Dumbbell } from 'lucide-react-native'
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

    function renderItem({ item, drag }: DraggableListRenderParams<Workout>) {
        return <Log text={item.name} subtitle={''} onPress={() => router.push({ pathname: '/workoutScreens/exerciseScreen', params: { workoutId: item.id } })} onMenuPress={drag} onEditPress={() => handleEdit(item)} />
    }

    function handleEdit(workout: Workout) {
        Alert.alert(`Options for Workout: ${workout.name}`, `Warning: Deleting a workout will delete all logs within the workout. To preserve logs archiving is recommended.`, [
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
                onPress: () => handleDeleteWorkout(workout.id),
            },
            {
                text: 'Cancel',
                style: 'cancel',
            },
        ])
    }

    const renderHeader = () => {
        return (
            <>
                <Text style={styles.sectionTitle}>Workouts</Text>
                <Text style={styles.sectionSubtitle}>
                    {activeWorkouts.length} {activeWorkouts.length === 1 ? 'routine' : 'routines'}
                </Text>
            </>
        )
    }

    return (
        <View style={styles.container}>
            {
                activeWorkouts.length === 0 ?
                    // Empty State
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Dumbbell size={56} color={colors.workout} strokeWidth={2} />
                        </View>
                        <Text style={styles.emptyTitle}>No Workouts Yet</Text>
                        <Text style={styles.emptySubtitle}>Tap the ⋮ button to create your first workout</Text>
                    </View>
                    // Draggable List
                :   <DraggableList data={activeWorkouts} renderItem={renderItem} keyExtractor={(item) => item.id} onDragEnd={handleUpdateWorkoutOrder} ListHeaderComponent={renderHeader} contentContainerStyle={{ paddingTop: 16 }} />
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
        emptyIconCircle: {
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
            borderWidth: 2,
            borderColor: colors.workout,
        },
        emptyTitle: {
            fontSize: 26,
            color: colors.text,
            marginBottom: 12,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.extrabold,
        },
        emptySubtitle: {
            fontSize: 15,
            color: colors.labelMuted,
            textAlign: 'center',
            lineHeight: 22,
            fontFamily: fonts.regular,
        },
    })
}
