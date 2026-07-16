import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import type { Log } from '@/context/WorkoutContext/types'
import { confirmDelete } from '@/lib/utils/confirmDelete'
import { formatDateOrToday, getDateKey } from '@/lib/utils/dateHelper'
import { Trash } from 'lucide-react-native'
import type { RefObject } from 'react'
import { useEffect, useMemo } from 'react'
import { FlatList, Keyboard, LayoutAnimation, Platform, Pressable, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native'

type LogHistoryListProps = {
    logs: Log[]
    weightUnit: string
    lastAddedLogId: string | null
    onDeleteConfirmed: (id: string) => void
    flatListRef: RefObject<FlatList<Log> | null>
}

export default function LogHistoryList({ logs, weightUnit, lastAddedLogId, onDeleteConfirmed, flatListRef }: LogHistoryListProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true)
        }
    }, [])

    const handleDelete = (id: string) => {
        confirmDelete({
            title: 'Delete set?',
            message: 'This set will be permanently removed. This cannot be undone.',
            onConfirm: () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                onDeleteConfirmed(id)
            },
        })
    }

    const renderLog = ({ item, index }: { item: Log; index: number }) => {
        const showDateHeader = index === 0 || getDateKey(item.date) !== getDateKey(logs[index - 1].date)
        const wrapperStyle = [styles.logItemWrapper, item.id === lastAddedLogId && styles.logItemWrapperHighlight]

        const content = (
            <View>
                {showDateHeader && (
                    <View style={[styles.dateHeader, index > 0 && styles.dateHeaderSpaced]}>
                        <Text style={styles.dateHeaderText}>{formatDateOrToday(item.date, true)}</Text>
                    </View>
                )}
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
                            </View>
                            {/* <Text style={styles.logDate}>{formatDateOrToday(item.date, true)}</Text> */}
                        </View>

                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton} activeOpacity={0.6}>
                            <Trash size={20} color={colors.destructive} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        )

        return content
    }

    return (
        <View style={styles.logsSection}>
            <Pressable onPress={Keyboard.dismiss}>
                <Text style={styles.logsSectionTitle}>History</Text>
            </Pressable>
            <FlatList
                ref={flatListRef}
                data={logs}
                renderItem={renderLog}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.logsList}
                style={styles.logsFlatList}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                onScrollToIndexFailed={() => {}}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Add your first log above</Text>
                }
            />
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        logsSection: {
            flex: 1,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
        },
        logsFlatList: {
            flex: 1,
        },
        logsSectionTitle: {
            fontSize: 18,
            color: colors.text,
            marginBottom: 12,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        logsList: {
            paddingBottom: 20,
        },
        emptyText: {
            fontSize: 14,
            color: colors.placeholder,
            fontFamily: fonts.regular,
            letterSpacing: 0.1,
            marginTop: 4,
        },
        dateHeader: {
            marginBottom: 8,
            paddingBottom: 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.hairline,
        },
        dateHeaderSpaced: {
            marginTop: 8,
        },
        dateHeaderText: {
            fontSize: 13,
            color: colors.textMuted,
            fontFamily: fonts.semibold,
        },
        logItemWrapper: {
            flexDirection: 'row',
            marginBottom: 10,
            borderRadius: radius.card,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        logItemWrapperHighlight: {
            backgroundColor: colors.nutrition + '1A',
            borderColor: colors.nutrition,
            borderWidth: 2,
        },
        logAccentBar: {
            width: 4,
            backgroundColor: colors.workout,
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
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        logSeparator: {
            fontSize: 16,
            color: colors.labelMuted,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        logReps: {
            fontSize: 17,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        logDate: {
            fontSize: 12,
            color: colors.placeholder,
            letterSpacing: 0.2,
            fontFamily: fonts.medium,
        },
        deleteButton: {
            padding: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
    })
}
