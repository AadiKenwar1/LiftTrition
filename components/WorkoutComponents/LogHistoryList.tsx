import { formatDateOrToday } from '@/lib/utils/dateHelper'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Animated, FlatList, Keyboard, LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native'
import { Trash } from 'lucide-react-native'
import type { Log } from '@/context/WorkoutContext/types'

type LogHistoryListProps = {
    logs: Log[]
    weightUnit: string
    lastAddedLogId: string | null
    onDeleteConfirmed: (id: string) => void
    flatListRef: RefObject<FlatList<Log> | null>
}

export default function LogHistoryList({ logs, weightUnit, lastAddedLogId, onDeleteConfirmed, flatListRef }: LogHistoryListProps) {
    const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
    const deleteOpacity = useRef(new Animated.Value(1)).current
    const deleteTranslateX = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true)
        }
    }, [])

    // Run the slide-out animation for the log being deleted, then remove it from the list.
    useEffect(() => {
        if (!deletingLogId) return

        deleteOpacity.setValue(1)
        deleteTranslateX.setValue(0)

        const deletingIdSnapshot = deletingLogId

        Animated.parallel([
            Animated.timing(deleteOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.timing(deleteTranslateX, { toValue: 100, duration: 250, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (!finished) return
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
            onDeleteConfirmed(deletingIdSnapshot)
            setDeletingLogId(null)
        })
    }, [deletingLogId, deleteOpacity, deleteTranslateX, onDeleteConfirmed])

    const handleDelete = (id: string) => {
        setDeletingLogId(id)
    }

    const renderLog = ({ item }: { item: Log }) => {
        const isDeleting = item.id === deletingLogId
        const wrapperStyle = [styles.logItemWrapper, item.id === lastAddedLogId && styles.logItemWrapperHighlight]

        const content = (
            <View style={wrapperStyle}>
                <View style={styles.logAccentBar} />
                <View style={styles.logItem}>
                    <View style={styles.logContent}>
                        <View style={styles.logInfo}>
                            <Text style={styles.logWeight}>
                                {item.weight} {weightUnit}
                            </Text>
                            <Text style={styles.logSeparator}>×</Text>
                            <Text style={styles.logReps}>{item.reps} reps</Text>
                            {item.rpe > 0 && (
                                <>
                                    <Text style={styles.logSeparator}>•</Text>
                                    <Text style={styles.logRpe}>RPE {item.rpe}</Text>
                                </>
                            )}
                        </View>
                        <Text style={styles.logDate}>{formatDateOrToday(item.date, true)}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        style={styles.deleteButton}
                        activeOpacity={0.6}
                        disabled={isDeleting}
                    >
                        <Trash size={20} color="#FF453A" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>
        )

        if (isDeleting) {
            return (
                <Animated.View style={{ opacity: deleteOpacity, transform: [{ translateX: deleteTranslateX }] }}>
                    {content}
                </Animated.View>
            )
        }

        return content
    }

    return (
        <View style={styles.logsSection}>
            <Text style={styles.logsSectionTitle}>History</Text>
            <FlatList
                ref={flatListRef}
                data={logs}
                renderItem={renderLog}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.logsList}
                style={styles.logsFlatList}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                onScrollToIndexFailed={() => {}}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    logsSection: {
        flex: 1,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
    },
    logsFlatList: {
        flex: 1,
    },
    logsSectionTitle: {
        fontSize: 18,
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logsList: {
        paddingBottom: 20,
    },
    logItemWrapper: {
        flexDirection: 'row',
        marginBottom: 10,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#282A2C',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    logItemWrapperHighlight: {
        backgroundColor: '#1e3a2f',
        borderColor: '#22C55E',
        borderWidth: 2,
    },
    logAccentBar: {
        width: 4,
        backgroundColor: '#2f80ed',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    logItem: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    logContent: {
        flex: 1,
        marginRight: 12,
    },
    logInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    logWeight: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logSeparator: {
        fontSize: 16,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logReps: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logRpe: {
        fontSize: 14,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    logDate: {
        fontSize: 12,
        color: '#666',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
    deleteButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
})

