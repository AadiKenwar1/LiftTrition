import { fonts, motion, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { confirmDelete } from '@/lib/utils/confirmDelete'
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
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

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

    // Image sources — resolved only for the archived exercises actually shown, not the whole exercise list
    const exerciseImageSources = useMemo(() => {
        const map: Record<string, number> = {}
        if (logType !== 'exercises') return map
        for (const exercise of exercises) {
            const shown = exercise.archived && (!workoutId || exercise.workoutID === workoutId)
            if (!shown) continue
            const entry = fullExerciseLib[exercise.name]
            const filename = entry?.imgUrl?.split('/').pop()
            if (filename && IMAGE_MAP[filename]) map[exercise.name] = IMAGE_MAP[filename]
        }
        return map
    }, [fullExerciseLib, exercises, workoutId, logType])

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
                                    ? <Image source={imgSource} style={styles.exerciseImage} contentFit="contain" cachePolicy="memory" transition={motion.imageFade} />
                                    : <Dumbbell size={25} color={colors.text} strokeWidth={1.8} />}
                            </View>
                        </View>
                    )}
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                    </View>
                    <View style={styles.iconContainer}>
                        <TouchableOpacity style={styles.iconButton} activeOpacity={0.5} onPress={() => (logType === 'workouts' ? handleArchiveWorkout(item.id, true) : handleArchiveExercise(item.id, item.workoutID, true))}>
                            <View style={styles.iconCircle}>
                                <ArchiveRestore size={20 * 1.5} color={colors.workout} strokeWidth={2} />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconButton}
                            activeOpacity={0.5}
                            onPress={() =>
                                logType === 'workouts'
                                    ? confirmDelete({ title: `Delete ${item.name}?`, message: 'Deleting a workout will delete all logs within the workout. This cannot be undone.', onConfirm: () => handleDeleteWorkout(item.id) })
                                    : confirmDelete({ title: `Delete ${item.name}?`, message: 'Deleting an exercise will delete all logs associated with it. This cannot be undone.', onConfirm: () => handleDeleteExercise(item.id) })
                            }>
                            <View style={[styles.iconCircle, styles.deleteIconCircle]}>
                                <Trash size={20 * 1.5} color={colors.destructive} strokeWidth={2.5} />
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
                    <Archive size={32} color={colors.workout} strokeWidth={2.5} />
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
                        <Text style={styles.emptySubtext}>Tap the pencil icon on a {logType.slice(0, -1)} for the option to archive it</Text>
                    </View>
                }
            />
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
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
            backgroundColor: colors.border,
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
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.workout,
            marginBottom: 16,
        },
        title: {
            fontSize: 24,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 6,
            fontFamily: fonts.semibold,
            letterSpacing: -0.5,
        },
        subtitle: {
            fontSize: 16,
            color: colors.labelMuted,
            textAlign: 'center',
            fontFamily: fonts.regular,
            letterSpacing: 0.2,
        },
        listContent: {
            paddingHorizontal: 24,
            paddingBottom: 24,
        },
        itemWrapper: {
            flexDirection: 'row',
            marginVertical: 6,
            borderRadius: radius.card,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        accentBar: {
            width: 4,
            backgroundColor: colors.workout,
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
            borderColor: colors.workout,
        },
        imageCircle: {
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.surfaceInset,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
        },
        exerciseImage: {
            width: 36,
            height: 36,
            tintColor: colors.text,
        },
        itemInfo: {
            flex: 1,
            marginRight: 12,
        },
        itemName: {
            fontSize: 17,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
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
            backgroundColor: colors.iconChipBg,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.workout + '80',
        },
        // Composed on top of iconCircle (style={[iconCircle, deleteIconCircle]}); inherits its 54pt size so
        // the delete circle matches the restore circle — only the destructive colors differ.
        deleteIconCircle: {
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            backgroundColor: colors.destructive + '26',
            borderColor: colors.destructive + '80',
        },
        emptyContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
        },
        emptyText: {
            fontSize: 18,
            color: colors.textMuted,
            marginBottom: 8,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        emptySubtext: {
            fontSize: 14,
            color: colors.labelMuted,
            textAlign: 'center',
            fontFamily: fonts.regular,
        },
    })
}
