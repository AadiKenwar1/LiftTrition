import SavedEntry from '@/components/NutritionComponents/SavedEntry'
import { useAuth } from '@/context/AuthContext'
import { useNutrition } from '@/context/NutritionContext'
import { NutritionEntry } from '@/context/NutritionContext/types'
import { useRouter } from 'expo-router'
import { Bookmark } from 'lucide-react-native'
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import uuid from 'react-native-uuid'

export default function SavedNutritionModal() {
    const { savedNutritionEntries, handleUnsaveNutrition, handleAddNutrition, selectedDate } = useNutrition()
    const { userID } = useAuth()
    const router = useRouter()
    function handleAddSavedItem(savedItem: NutritionEntry) {
        const now = new Date(selectedDate)
        const newNutritionItem: NutritionEntry = {
            id: uuid.v4() as string,
            userId: userID,
            name: savedItem.name,
            date: now,
            time: now.getTime(),
            protein: savedItem.protein,
            carbs: savedItem.carbs,
            fats: savedItem.fats,
            calories: savedItem.calories,
            isPhoto: savedItem.isPhoto,
            ingredients: savedItem.ingredients,
            createdAt: now,
            updatedAt: now,
        }
        handleAddNutrition(newNutritionItem)
        router.back()
    }

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No saved meals yet</Text>
            <Text style={styles.emptySubtext}>Save meals to quickly add them later</Text>
        </View>
    )

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <View style={styles.content}>
                {/* Icon Section */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Bookmark size={40} color="#22C922" strokeWidth={2.5} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Saved Meals</Text>
                <Text style={styles.subtitle}>Your frequently used meals</Text>

                {/* Saved Entries List */}
                <FlatList
                    data={savedNutritionEntries}
                    renderItem={({ item }) => (
                        <SavedEntry name={item.name} calories={item.calories} protein={item.protein} carbs={item.carbs} fats={item.fats} onAddPress={() => handleAddSavedItem(item)} onDeletePress={() => handleUnsaveNutrition(item.id)} />
                    )}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={renderEmptyState}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>
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
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 32,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 12,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#282A2C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#22C922',
    },
    title: {
        fontSize: 24,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    listContent: {
        paddingBottom: 20,
        flexGrow: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
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
