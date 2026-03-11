import BwCard from '@/components/NutritionComponents/bwCard'
import Entry from '@/components/NutritionComponents/Entry'
import { useNutrition } from '@/context/NutritionContext'
import { NutritionEntry } from '@/context/NutritionContext/types'
import { formatDate, getDateKey } from '@/lib/utils/dateHelper'
import { useRouter } from 'expo-router'
import { Calendar, Utensils } from 'lucide-react-native'
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function NutritionScreen() {
    const { nutritionData, selectedDate, handleSaveNutrition, handleDeleteNutrition } = useNutrition()
    const router = useRouter()

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
            <View style={styles.bodyWeightContainer}>
                {/* Body Weight Card */}
                <Text style={styles.sectionTitle}>Body Weight</Text>
                <BwCard />
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{isToday ? "Today's Logs" : `${formatDate(selectedDate, false)}'s Logs`}</Text>
                <TouchableOpacity style={styles.dateButton} activeOpacity={0.7} onPress={() => router.push('/nutritionScreens/dateModal')}>
                    <Calendar size={18} color="#22C922" strokeWidth={2.5} />
                    <Text style={styles.dateButtonText}>Change Date</Text>
                </TouchableOpacity>
            </View>
        </>
    )

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
                <Utensils size={56} color="#22C922" strokeWidth={2} />
            </View>
            <Text style={styles.emptyText}>{isToday ? 'No Nutrition Logs Yet' : 'No Nutrition Logs Recorded'}</Text>
            <Text style={styles.emptySubtext}>{isToday ? 'Tap the ⋮ button to add your first meal and start tracking your nutrition' : `No nutrition entries recorded for ${formatDate(selectedDate)}`}</Text>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    bodyWeightContainer: {
        paddingHorizontal: 20,
    },
    listContent: {
        paddingTop: 16,
        paddingBottom: 100,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 22,
        flexShrink: 1,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 12,
        fontFamily: 'Poppins_600SemiBold',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#282A2C',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    dateButtonText: {
        fontSize: 13,
        color: '#22C922',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
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
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 3,
        borderColor: '#22C922',
        shadowColor: '#22C922',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    emptyText: {
        fontSize: 28,
        color: '#FFF',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    emptySubtext: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
})
