import ScrollableList, { ScrollableListItem } from '@/components/NeutralComponents/ScrollableList'
import { useAuth } from '@/context/AuthContext'
import { useWorkout } from '@/context/WorkoutContext'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Dumbbell } from 'lucide-react-native'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function AddExerciseModal() {
    //Workout Context Functions
    const { handleAddExercise, fullExerciseLibAsList } = useWorkout()
    const { workoutId } = useLocalSearchParams<{ workoutId: string }>()
    const { userID } = useAuth()
    //Router
    const router = useRouter()

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <Dumbbell size={40} color="#2f80ed" strokeWidth={2} />
                </View>
                <Text style={styles.title}>Add Exercise</Text>
                <Text style={styles.subtitle}>Choose from our exercise library</Text>
                <TouchableOpacity onPress={() => router.replace('/settingsScreens/createExercise/createExercise1')}>
                    <Text style={[styles.subtitle, { color: '#2f80ed' }]}>Or Click Here to Add an Exercise</Text>
                </TouchableOpacity>
            </View>

            {/* Scrollable List */}
            <ScrollableList
                data={fullExerciseLibAsList}
                searchPlaceholder="Search exercises..."
                onPress={(item: ScrollableListItem) => {
                    handleAddExercise(workoutId, userID, item.title)
                    router.back()
                }}
            />
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        paddingHorizontal: 25,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#333',
        borderRadius: 3,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 16,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2f80ed',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 4,
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
})
