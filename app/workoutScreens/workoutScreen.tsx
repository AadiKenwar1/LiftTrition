import DraggableList from '@/components/WorkoutComponents/DraggableList'
import Log from '@/components/WorkoutComponents/Log'
import { useAuth } from '@/context/AuthContext'
import { useWorkout } from '@/context/WorkoutContext'
import { Workout } from '@/context/WorkoutContext/types'
import { useRouter } from 'expo-router'
import { Dumbbell } from 'lucide-react-native'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { RenderItemParams } from 'react-native-draggable-flatlist'

export default function WorkoutScreen() {
    //Workout Context Functions
    const { handleUpdateWorkoutOrder, handleArchiveWorkout, handleDeleteWorkout, workouts } = useWorkout()
    //Router
    const router = useRouter()
    //Auth Context Functions
    const { userID } = useAuth()
    // Filter and sort for archived workouts (deleted items are already removed from array)
    const activeWorkouts = workouts.filter((w) => !w.archived).sort((a, b) => a.order - b.order)

    // Create a key that changes when order changes (forces remount to avoid glitchy drag and drop)
    const listKey = activeWorkouts.map((w) => w.id).join('-')

    //Render logs as a Draggable List item
    function renderItem({ item, drag }: RenderItemParams<Workout>) {
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

    const renderHeader = () => <Text style={styles.sectionTitle}>Workouts</Text>

    return (
        <View style={styles.container}>
            {
                activeWorkouts.length === 0 ?
                    // Empty State
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Dumbbell size={56} color="#2f80ed" strokeWidth={2} />
                        </View>
                        <Text style={styles.emptyTitle}>No Workouts Yet</Text>
                        <Text style={styles.emptySubtitle}>Tap the ⋮ button to create your first workout and start tracking your progress</Text>
                    </View>
                    // Draggable List
                :   <DraggableList key={listKey} data={activeWorkouts} renderItem={renderItem} keyExtractor={(item) => item.id} onDragEnd={handleUpdateWorkoutOrder} ListHeaderComponent={renderHeader} />
            }
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 22,
        flexShrink: 1,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 10,
        fontFamily: 'Poppins_600SemiBold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
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
        shadowOffset: {
            width: 0,
            height: 8,
        },
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
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
})
