import { useAuth } from '@/context/AuthContext'
import { useNutrition } from '@/context/NutritionContext'
import { getFoodItem, getFoodSearchResults } from '@/lib/foodDB/foodDB'
import { FoodItem, FoodSearchResult } from '@/lib/foodDB/types'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Check, Database, Plus, X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import uuid from 'react-native-uuid'

interface FoodItemWithQuantity extends FoodItem {
    quantity?: number
}

export default function FoodDBModal() {
    const { handleAddNutrition, selectedDate } = useNutrition()
    const { userID } = useAuth()
    const router = useRouter()

    const [searchQuery, setSearchQuery] = useState('')
    const [addedItems, setAddedItems] = useState<FoodItemWithQuantity[]>([])
    const [isFocused, setIsFocused] = useState(false)
    const [quantityInputItem, setQuantityInputItem] = useState<FoodItem | null>(null)
    const [quantityValue, setQuantityValue] = useState('1')

    // API integration states
    const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [selectedSearchItem, setSelectedSearchItem] = useState<FoodSearchResult | null>(null)

    // Debounced search effect
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.trim()) {
                setIsSearching(true)
                try {
                    const results = await getFoodSearchResults(searchQuery)
                    setSearchResults(results)
                } catch {
                    setSearchResults([])
                    Alert.alert('Search Failed', 'Unable to search the food database. Check your connection and try again.')
                } finally {
                    setIsSearching(false)
                }
            } else {
                setSearchResults([])
            }
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [searchQuery])

    //Adds item from the list of search results
    async function handleAddItem(searchItem: FoodSearchResult) {
        if (addedItems.find((item) => item.id === searchItem.fdcId)) return
        setIsLoadingDetails(true)
        setSelectedSearchItem(searchItem)
        const foodItem = await getFoodItem(searchItem)
        if (foodItem) {
            setQuantityInputItem(foodItem)
            setQuantityValue('1')
        } else {
            Alert.alert('Failed to Load', 'Could not load food details. Check your connection and try again.')
        }
        setIsLoadingDetails(false)
    }

    //Adds item in the list of added items
    function confirmAddItem() {
        if (quantityInputItem) {
            const quantity = parseInt(quantityValue) || 1
            setAddedItems([...addedItems, { ...quantityInputItem, quantity }])
            setQuantityInputItem(null)
            setQuantityValue('1')
            setSelectedSearchItem(null)
        }
    }

    //Cancels the addition of an item
    function cancelAddItem() {
        setQuantityInputItem(null)
        setQuantityValue('1')
        setSelectedSearchItem(null)
    }

    //Removes an item from the list of added items
    function handleRemoveItem(id: string) {
        setAddedItems(addedItems.filter((item) => item.id !== id))
    }

    //Adds all items from the list of added items to the nutrition context
    function handleAddAll() {
        const now = new Date(selectedDate)
        for (const item of addedItems) {
            const quantity = item.quantity || 1
            const nutritionEntry = {
                id: uuid.v4() as string,
                userId: userID,
                name: item.name,
                date: now,
                time: now.getTime(),
                protein: item.protein * quantity,
                carbs: item.carbs * quantity,
                fats: item.fats * quantity,
                calories: item.calories * quantity,
                isPhoto: false,
                ingredients: [],
                createdAt: now,
                updatedAt: now,
            }
            handleAddNutrition(nutritionEntry)
        }
        router.back()
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            {/* Loading Modal for Details */}
            <Modal visible={isLoadingDetails} transparent animationType="fade">
                <View style={styles.loadingModal}>
                    <View style={styles.loadingContent}>
                        <ActivityIndicator size="large" color="#22C922" />
                        <Text style={styles.loadingText}>Loading food details...</Text>
                    </View>
                </View>
            </Modal>

            {/* Quantity Input Modal */}
            <Modal visible={quantityInputItem !== null} transparent animationType="fade" onRequestClose={cancelAddItem}>
                <View style={styles.quantityModal}>
                    <View style={styles.quantityContent}>
                        <Text style={styles.quantityTitle}>How many servings?</Text>
                        <Text style={styles.quantitySubtitle}>{quantityInputItem?.name}</Text>
                        <TextInput style={styles.quantityInput} placeholder="1" placeholderTextColor="#666" value={quantityValue} onChangeText={setQuantityValue} keyboardType="numeric" autoFocus />
                        <View style={styles.quantityButtons}>
                            <TouchableOpacity style={[styles.quantityButton, styles.cancelButton]} onPress={cancelAddItem} activeOpacity={0.7}>
                                <X size={18} color="#FF453A" strokeWidth={2.5} />
                                <Text style={[styles.quantityButtonText, styles.cancelButtonText]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.quantityButton, styles.confirmButton]} onPress={confirmAddItem} activeOpacity={0.7}>
                                <Check size={18} color="#22C922" strokeWidth={2.5} />
                                <Text style={[styles.quantityButtonText, styles.confirmButtonText]}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Icon Section */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Database size={40} color="#22C922" strokeWidth={2.5} />
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Food Database</Text>
                    <Text style={styles.subtitle}>Search and add food items</Text>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={[styles.searchInput, isFocused && styles.searchInputFocused]}
                            placeholder="Search foods..."
                            placeholderTextColor="#666"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                        {isSearching && (
                            <View style={styles.searchLoader}>
                                <ActivityIndicator size="small" color="#22C922" />
                            </View>
                        )}
                    </View>

                    {/* Added Items Section */}
                    {addedItems.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Added Items ({addedItems.length})</Text>
                            {addedItems.map((item) => (
                                <View key={item.id} style={styles.foodItem}>
                                    <View style={styles.foodInfo}>
                                        <Text style={styles.foodName}>
                                            {item.name} {item.quantity && item.quantity > 1 ? `(x${item.quantity})` : ''}
                                        </Text>
                                        <Text style={styles.foodMacros}>
                                            {item.calories * (item.quantity || 1)} cal • {item.protein * (item.quantity || 1)}g P • {item.carbs * (item.quantity || 1)}g C • {item.fats * (item.quantity || 1)}g F
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveItem(item.id)} activeOpacity={0.7}>
                                        <X size={18} color="#FF453A" strokeWidth={2.5} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Search Results Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{searchQuery ? `Results (${searchResults.length})` : 'Start searching for foods...'}</Text>
                        {isSearching ?
                            <View style={styles.emptyState}>
                                <ActivityIndicator size="large" color="#22C922" />
                                <Text style={styles.emptyText}>Searching...</Text>
                            </View>
                        : searchResults.length > 0 ?
                            searchResults.map((item) => {
                                const isAdded = addedItems.find((addedItem) => addedItem.id === item.fdcId)
                                const isLoading = isLoadingDetails && selectedSearchItem?.fdcId === item.fdcId
                                return (
                                    <View key={item.fdcId} style={styles.foodItem}>
                                        <View style={styles.foodInfo}>
                                            <Text style={styles.foodName}>{item.description}</Text>
                                            {item.brandName && <Text style={styles.brandName}>{item.brandName}</Text>}
                                            {isLoading && <Text style={styles.loadingDetailsText}>Loading details...</Text>}
                                        </View>
                                        <TouchableOpacity style={[styles.addButton, (isAdded || isLoading) && styles.addButtonDisabled]} onPress={() => handleAddItem(item)} activeOpacity={0.7} disabled={!!isAdded || isLoading}>
                                            {isLoading ?
                                                <ActivityIndicator size="small" color="#666" />
                                            :   <Plus size={18} color={isAdded ? '#666' : '#22C922'} strokeWidth={2.5} />}
                                        </TouchableOpacity>
                                    </View>
                                )
                            })
                        : searchQuery ?
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No results found</Text>
                                <Text style={styles.emptySubtext}>Try a different search term</Text>
                            </View>
                        :   <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Enter a search term to find foods</Text>
                            </View>
                        }
                    </View>
                </View>
            </ScrollView>

            {/* Add All Button - Fixed at bottom */}
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
    scrollView: {
        flex: 1,
    },
    content: {
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
    searchContainer: {
        marginBottom: 24,
        position: 'relative',
    },
    searchInput: {
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        paddingRight: 50,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#282A2C',
        fontFamily: 'Poppins_400Regular',
    },
    searchInputFocused: {
        borderColor: '#22C922',
    },
    searchLoader: {
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: [{ translateY: -10 }],
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    foodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#282A2C',
    },
    foodInfo: {
        flex: 1,
        marginRight: 12,
    },
    foodName: {
        fontSize: 15,
        color: '#FFF',
        marginBottom: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    foodMacros: {
        fontSize: 12,
        color: '#888',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(76, 217, 100, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(76, 217, 100, 0.25)',
    },
    addButtonDisabled: {
        backgroundColor: 'rgba(102, 102, 102, 0.12)',
        borderColor: 'rgba(102, 102, 102, 0.25)',
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
        paddingVertical: 40,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#aaa',
    },
    emptySubtext: {
        fontSize: 12,
        color: '#aaa',
    },
    brandName: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
        fontStyle: 'italic',
    },
    loadingDetailsText: {
        fontSize: 11,
        color: '#22C922',
        marginTop: 4,
        fontStyle: 'italic',
    },
    loadingModal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContent: {
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#FFF',
        fontSize: 14,
    },
    quantityModal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 30,
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
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    confirmButtonText: {
        color: '#22C922',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
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
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        paddingBottom: 20,
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
})
