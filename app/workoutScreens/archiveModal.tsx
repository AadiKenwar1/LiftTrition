import { useWorkout } from '@/context/WorkoutContext'
import { IMAGE_MAP } from '@/context/WorkoutContext/exerciseLibrary/dataV2/imageMap'
import { Exercise, Workout } from '@/context/WorkoutContext/types'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { Archive, ArchiveRestore, Dumbbell, Trash } from 'lucide-react-native'
import { useMemo } from 'react'
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ArchiveModal() {
    const { workouts, exercises, fullExerciseLib, handleArchiveWorkout, handleDeleteWorkout, handleArchiveExercise, handleDeleteExercise } = useWorkout()
    const params = useLocalSearchParams()

    // Normalize logType to a string (handle both string and string[] cases)
    const logType = typeof params.logType === 'string' ? params.logType : params.logType?.[0] || 'workouts'
    const workoutId = typeof params.workoutId === 'string' ? params.workoutId : params.workoutId?.[0] || ''

    let data: Workout[] | Exercise[] = []
    if (logType === 'workouts') {
        data = workouts
            .filter((workout) => workout.archived)
            .sort((a, b) => a.order - b.order)
    } else if (logType === 'exercises') {
        data = exercises
            .filter((exercise) => exercise.archived && (!workoutId || exercise.workoutID === workoutId))
            .sort((a, b) => a.order - b.order)
    }

    const exerciseImageSources = useMemo(() => {
        const map: Record<string, number> = {}
        for (const exercise of exercises) {
            const entry = fullExerciseLib[exercise.name]
            const filename = entry?.imgUrl?.split('/').pop()
            if (filename && IMAGE_MAP[filename]) map[exercise.name] = IMAGE_MAP[filename]
        }
        return map
    }, [fullExerciseLib, exercises])

    const renderItem = ({ item }: { item: any }) => {
        const imgSource = logType === 'exercises' ? exerciseImageSources[item.name] : undefined

        return (
            <View style={styles.itemWrapper}>
                <View style={styles.accentBar} />
                <View style={styles.item}>
                    {logType === 'exercises' && (
                        <View style={styles.imageGlowRing}>
                            <View style={styles.imageCircle}>
                                {imgSource
                                    ? <Image source={imgSource} style={styles.exerciseImage} contentFit="contain" cachePolicy="memory" transition={300} />
                                    : <Dumbbell size={25} color="#ffffff" strokeWidth={1.8} />}
                            </View>
                        </View>
                    )}
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                    </View>
                    <View style={styles.iconContainer}>
                        <TouchableOpacity style={styles.iconButton} activeOpacity={0.5} onPress={() => (logType === 'workouts' ? handleArchiveWorkout(item.id, true) : handleArchiveExercise(item.id, item.workoutID, true))}>
                            <View style={styles.iconCircle}>
                                <ArchiveRestore size={20 * 1.5} color="#2f80ed" strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} activeOpacity={0.5} onPress={() => (logType === 'workouts' ? handleDeleteWorkout(item.id) : handleDeleteExercise(item.id))}>
                            <View style={[styles.iconCircle, styles.deleteIconCircle]}>
                                <Trash size={20} color="#FF453A" strokeWidth={2.5} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIconCircle}>
                    <Archive size={32} color="#2f80ed" strokeWidth={2.5} />
                </View>
                <Text style={styles.title}>Manage Archived {logType.charAt(0).toUpperCase() + logType.slice(1)}</Text>
                <Text style={styles.subtitle}>View and manage all your archived {logType}</Text>
            </View>

            {/* Workouts List */}
            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No archived {logType} yet</Text>
                        <Text style={styles.emptySubtext}>Click the pencil icon on a {logType.slice(0, -1)} for the option to archive it</Text>
                    </View>
                }
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
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
        paddingBottom: 24,
    },
    headerIconCircle: {
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
        marginBottom: 6,
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
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    itemWrapper: {
        flexDirection: 'row',
        marginVertical: 6,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    accentBar: {
        width: 4,
        backgroundColor: '#2f80ed',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    item: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    imageGlowRing: {
        width: 52,
        height: 52,
        borderRadius: 26,
        marginRight: 10,
        flexShrink: 0,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2f80ed',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },
    imageCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    exerciseImage: {
        width: 36,
        height: 36,
        tintColor: '#ffffff',
    },
    itemInfo: {
        flex: 1,
        marginRight: 12,
    },
    itemName: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        padding: 2,
    },
    iconCircle: {
        width: 36 * 1.5,
        height: 36 * 1.5,
        borderRadius: 18 * 1.5,
        backgroundColor: 'rgba(47, 128, 237, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(47, 128, 237, 0.5)',
    },
    deleteIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'rgba(255, 69, 58, 0.15)',
        borderColor: 'rgba(255, 69, 58, 0.5)',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        color: '#888',
        marginBottom: 8,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        fontFamily: 'Poppins_400Regular',
    },
})
