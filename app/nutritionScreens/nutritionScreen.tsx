import DailyIntakeCard from '@/components/NutritionComponents/DailyIntakeCard'
import Entry from '@/components/NutritionComponents/Entry'
import { useNutrition } from '@/context/NutritionContext'
import { NutritionEntry } from '@/context/NutritionContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { formatDate, getDateKey } from '@/lib/utils/dateHelper'
import { useRouter } from 'expo-router'
import { Calendar, RotateCcw, Utensils } from 'lucide-react-native'
import { useMemo } from 'react'
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function NutritionScreen() {
    const { nutritionData, selectedDate, setSelectedDate, handleSaveNutrition, handleDeleteNutrition } = useNutrition()
    const router = useRouter()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    // Filter entries for selected date
    const selectedDateKey = getDateKey(selectedDate)
    const todayEntries = nutritionData
        .filter((entry) => {
            const entryDateKey = getDateKey(entry.date)
            return entryDateKey === selectedDateKey
        })
        .sort((a, b) => b.time - a.time)

    // Check if selected date is today
    const isToday = getDateKey(new Date()) === selectedDateKey
    const showYearInTitle = selectedDate.getFullYear() !== new Date().getFullYear()

    function handleEdit(nutritionEntry: NutritionEntry) {
        Alert.alert(`Options for Nutrition Entry: ${nutritionEntry.name}`, ``, [
            {
                text: 'Edit',
                style: 'default',
                onPress: () => {
                    const pathname = nutritionEntry.isPhoto ? '/nutritionScreens/editPhotoEntry' : '/nutritionScreens/editManualEntry'
                    router.push({
                        pathname,
                        params: { entry: JSON.stringify(nutritionEntry) },
                    })
                },
            },
            {
                text: 'Save',
                style: 'default',
                onPress: () => handleSaveNutrition(nutritionEntry),
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDeleteNutrition(nutritionEntry.id),
            },
            {
                text: 'Cancel',
                style: 'cancel',
            },
        ])
    }

    const renderHeader = () => (
        <>
            {/* Daily Intake summary for the selected date */}
            <View style={styles.intakeContainer}>
                <DailyIntakeCard date={selectedDate} />
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
                {isToday ?
                    <Text style={styles.sectionTitle}>Today&apos;s Logs</Text>
                :   <View style={[styles.sectionTitleBlock, styles.sectionTitleStack]}>
                        <Text style={styles.sectionTitleLine}>{formatDate(selectedDate, showYearInTitle)}&apos;s</Text>
                        <Text style={styles.sectionTitleLine}>Logs</Text>
                    </View>
                }
                <View style={styles.dateActionsColumn}>
                    <TouchableOpacity style={styles.dateChip} activeOpacity={0.5} onPress={() => router.push('/nutritionScreens/dateModal')}>
                        <Calendar size={13} color={colors.nutrition} strokeWidth={2.5} />
                        <Text style={styles.dateChipText}>Change Date</Text>
                    </TouchableOpacity>
                    {!isToday && (
                        <TouchableOpacity style={styles.dateChip} activeOpacity={0.5} onPress={() => setSelectedDate(new Date())}>
                            <RotateCcw size={13} color={colors.nutrition} strokeWidth={2.5} />
                            <Text style={styles.dateChipText}>Today</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </>
    )

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
                <Utensils size={56} color={colors.nutrition} strokeWidth={2} />
            </View>
            <Text style={styles.emptyText}>{isToday ? 'No Nutrition Logs Yet' : 'No Nutrition Logs Recorded'}</Text>
            <Text style={styles.emptySubtext}>{isToday ? 'Tap the ⋮ button to add your first meal' : `No nutrition entries recorded for ${formatDate(selectedDate, showYearInTitle)}`}</Text>
        </View>
    )

    return (
        <FlatList
            data={todayEntries}
            renderItem={({ item }) => <Entry name={item.name} calories={item.calories} protein={item.protein} carbs={item.carbs} fats={item.fats} onEditPress={() => handleEdit(item)} />}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            style={styles.container}
        />
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        intakeContainer: {
            paddingHorizontal: 20,
        },
        listContent: {
            paddingTop: 16,
            paddingBottom: 100,
        },
        sectionHeader: {
            paddingHorizontal: 20,
            marginTop: 10,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        sectionTitle: {
            fontSize: 19,
            flex: 1,
            flexShrink: 1,
            color: colors.text,
            letterSpacing: -0.4,
            marginRight: 12,
            fontFamily: fonts.extrabold,
        },
        sectionTitleBlock: {
            flex: 1,
            marginRight: 12,
        },
        sectionTitleStack: {
            gap: 2,
        },
        sectionTitleLine: {
            fontSize: 19,
            color: colors.text,
            letterSpacing: -0.4,
            fontFamily: fonts.extrabold,
        },
        dateActionsColumn: {
            alignItems: 'flex-end',
            gap: 8,
        },
        dateChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 7,
            paddingHorizontal: 12,
            backgroundColor: colors.surface,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        dateChipText: {
            fontSize: 11,
            color: colors.nutrition,
            fontFamily: fonts.bold,
        },
        emptyState: {
            paddingVertical: 60,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
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
            borderColor: colors.nutrition,
        },
        emptyText: {
            fontSize: 26,
            color: colors.text,
            marginBottom: 12,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.extrabold,
        },
        emptySubtext: {
            fontSize: 15,
            color: colors.labelMuted,
            textAlign: 'center',
            lineHeight: 22,
            fontFamily: fonts.regular,
        },
    })
}
