import SavedEntry from '@/components/NutritionComponents/SavedEntry'
import { useAuth } from '@/context/AuthContext'
import { useNutrition } from '@/context/NutritionContext'
import { Ingredient, NutritionEntry } from '@/context/NutritionContext/types'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Bookmark, Check, X } from 'lucide-react-native'
import { useState } from 'react'
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import uuid from 'react-native-uuid'

type StagedSavedMeal = {
    lineId: string
    savedItem: NutritionEntry
    quantity: number
}

function scaleIngredients(ingredients: Ingredient[], factor: number): Ingredient[] {
    if (!ingredients.length) return []
    if (factor === 1) return ingredients.map((ing) => ({ ...ing }))
    return ingredients.map((ing) => ({
        ...ing,
        quantity: ing.quantity * factor,
        protein: ing.protein * factor,
        carbs: ing.carbs * factor,
        fats: ing.fats * factor,
        calories: ing.calories * factor,
    }))
}

export default function SavedNutritionModal() {
    const { savedNutritionEntries, handleUnsaveNutrition, handleAddNutrition, selectedDate } = useNutrition()
    const { userID } = useAuth()
    const router = useRouter()

    const [addedItems, setAddedItems] = useState<StagedSavedMeal[]>([])
    const [quantityInputItem, setQuantityInputItem] = useState<NutritionEntry | null>(null)
    const [quantityValue, setQuantityValue] = useState('1')

    function openQuantityModal(savedItem: NutritionEntry) {
        setQuantityInputItem(savedItem)
        setQuantityValue('1')
    }

    function confirmAddItem() {
        if (!quantityInputItem) return
        const quantity = Math.max(1, parseInt(quantityValue, 10) || 1)
        setAddedItems((prev) => [
            ...prev,
            {
                lineId: uuid.v4() as string,
                savedItem: quantityInputItem,
                quantity,
            },
        ])
        setQuantityInputItem(null)
        setQuantityValue('1')
    }

    function cancelAddItem() {
        setQuantityInputItem(null)
        setQuantityValue('1')
    }

    function handleRemoveStaged(lineId: string) {
        setAddedItems((prev) => prev.filter((row) => row.lineId !== lineId))
    }

    function handleAddAll() {
        for (const row of addedItems) {
            const createdAt = new Date()
            const q = row.quantity
            const base = row.savedItem
            const nutritionEntry: NutritionEntry = {
                id: uuid.v4() as string,
                userId: userID,
                name: base.name,
                date: new Date(selectedDate),
                time: createdAt.getTime(),
                protein: Math.round(base.protein * q * 10) / 10,
                carbs: Math.round(base.carbs * q * 10) / 10,
                fats: Math.round(base.fats * q * 10) / 10,
                calories: Math.round(base.calories * q),
                isPhoto: base.isPhoto,
                photoUri: base.photoUri,
                ingredients: scaleIngredients(base.ingredients, q),
                createdAt,
                updatedAt: createdAt,
            }
            handleAddNutrition(nutritionEntry)
        }
        router.back()
    }

    const listHeader = (
        <>
            <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                    <Bookmark size={40} color="#22C922" strokeWidth={2.5} />
                </View>
            </View>

            <Text style={styles.title}>Saved Meals</Text>
            <Text style={styles.subtitle}>Your frequently used meals</Text>

            {addedItems.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Added Items ({addedItems.length})</Text>
                    {addedItems.map((row) => {
                        const q = row.quantity
                        const s = row.savedItem
                        return (
                            <View key={row.lineId} style={styles.stagedRow}>
                                <View style={styles.stagedInfo}>
                                    <Text style={styles.stagedName}>
                                        {s.name}
                                        {q > 1 ? ` (x${q})` : ''}
                                    </Text>
                                    <Text style={styles.stagedMacros}>
                                        {Math.round(s.calories * q)} cal • {Math.round(s.protein * q * 10) / 10}g P • {Math.round(s.carbs * q * 10) / 10}g C • {Math.round(s.fats * q * 10) / 10}g F
                                    </Text>
                                </View>
                                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveStaged(row.lineId)} activeOpacity={0.5}>
                                    <X size={18} color="#FF453A" strokeWidth={2.5} />
                                </TouchableOpacity>
                            </View>
                        )
                    })}
                </View>
            )}

            {savedNutritionEntries.length > 0 ?
                <Text style={styles.sectionTitle}>Saved</Text>
            :   null}
        </>
    )

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No saved meals yet</Text>
            <Text style={styles.emptySubtext}>Save meals to quickly add them later</Text>
        </View>
    )

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <Modal visible={quantityInputItem !== null} transparent animationType="fade" onRequestClose={cancelAddItem}>
                <View style={styles.quantityModal}>
                    <View style={styles.quantityContent}>
                        <Text style={styles.quantityTitle}>How many servings?</Text>
                        <Text style={styles.quantitySubtitle}>{quantityInputItem?.name}</Text>
                        <TextInput style={styles.quantityInput} placeholder="1" placeholderTextColor="#666" value={quantityValue} onChangeText={setQuantityValue} keyboardType="numeric" autoFocus />
                        <View style={styles.quantityButtons}>
                            <TouchableOpacity style={[styles.quantityButton, styles.cancelButton]} onPress={cancelAddItem} activeOpacity={0.5}>
                                <X size={18} color="#FF453A" strokeWidth={2.5} />
                                <Text style={[styles.quantityButtonText, styles.cancelButtonText]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.quantityButton, styles.confirmButton]} onPress={confirmAddItem} activeOpacity={0.5}>
                                <Check size={18} color="#22C922" strokeWidth={2.5} />
                                <Text style={[styles.quantityButtonText, styles.confirmButtonText]}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.body}>
                <FlatList
                    data={savedNutritionEntries}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={listHeader}
                    renderItem={({ item }) => (
                        <SavedEntry name={item.name} calories={item.calories} protein={item.protein} carbs={item.carbs} fats={item.fats} onAddPress={() => openQuantityModal(item)} onDeletePress={() => handleUnsaveNutrition(item.id)} />
                    )}
                    ListEmptyComponent={renderEmptyState}
                    contentContainerStyle={[styles.listContent, savedNutritionEntries.length === 0 && styles.listContentEmpty]}
                    showsVerticalScrollIndicator={false}
                />

                {addedItems.length > 0 && (
                    <View style={styles.addAllContainer}>
                        <TouchableOpacity onPress={handleAddAll} activeOpacity={0.8} style={styles.addAllButtonTouchable}>
                            <LinearGradient colors={['#3CB855', '#22C922', '#5CE073']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addAllButton}>
                                <Text style={styles.addAllButtonText}>
                                    Add {addedItems.length} Item{addedItems.length > 1 ? 's' : ''}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
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
    body: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 24,
    },
    listContentEmpty: {
        flexGrow: 1,
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
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    stagedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#282A2C',
    },
    stagedInfo: {
        flex: 1,
        marginRight: 12,
    },
    stagedName: {
        fontSize: 15,
        color: '#FFF',
        marginBottom: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    stagedMacros: {
        fontSize: 12,
        color: '#888',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 69, 58, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 69, 58, 0.25)',
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
    addAllContainer: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#121212',
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
    },
    addAllButtonTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#22C922',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        paddingBottom: 12,
    },
    addAllButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addAllButtonText: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    quantityModal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 50,
    },
    quantityContent: {
        backgroundColor: '#1e1e1e',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    quantityTitle: {
        fontSize: 20,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    quantitySubtitle: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    quantityInput: {
        backgroundColor: '#121212',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#22C922',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Poppins_400Regular',
    },
    quantityButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    quantityButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 69, 58, 0.12)',
        borderColor: 'rgba(255, 69, 58, 0.25)',
    },
    confirmButton: {
        backgroundColor: 'rgba(76, 217, 100, 0.12)',
        borderColor: 'rgba(76, 217, 100, 0.25)',
    },
    quantityButtonText: {
        fontSize: 15,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    cancelButtonText: {
        color: '#FF453A',
    },
    confirmButtonText: {
        color: '#22C922',
    },
})
