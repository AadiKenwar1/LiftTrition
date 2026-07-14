import StagedSection from '@/components/NeutralComponents/StagedSection'
import { useAuth } from '@/context/AuthContext'
import { useNutrition } from '@/context/NutritionContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { getFoodItem, getFoodSearchResults } from '@/lib/foodDB/foodDB'
import { FoodItem, FoodSearchResult } from '@/lib/foodDB/types'
import { parseNumericInput } from '@/lib/utils/number'
import { useSubmitOnce } from '@/lib/hooks/useSubmitOnce'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Check, Database, Plus, X } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import uuid from 'react-native-uuid'

interface FoodItemWithQuantity extends FoodItem {
    quantity?: number
}

export default function FoodDBModal() {
    const { handleAddNutrition, selectedDate } = useNutrition()
    const { userID } = useAuth()
    const router = useRouter()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const [guardSubmit, submitting] = useSubmitOnce()
    const [searchQuery, setSearchQuery] = useState('')
    const [addedItems, setAddedItems] = useState<FoodItemWithQuantity[]>([])
    const [combineItems, setCombineItems] = useState(false)
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

    useEffect(() => {
        if (addedItems.length < 2) setCombineItems(false)
    }, [addedItems.length])

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
    const parsedQuantity = parseNumericInput(quantityValue)
    const quantityValid = parsedQuantity !== null && parsedQuantity > 0

    function confirmAddItem() {
        if (quantityInputItem && quantityValid) {
            setAddedItems([...addedItems, { ...quantityInputItem, quantity: parsedQuantity }])
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
        if (combineItems && addedItems.length >= 2) {
            const createdAt = new Date()
            let protein = 0
            let carbs = 0
            let fats = 0
            let calories = 0
            const names: string[] = []

            for (const item of addedItems) {
                const quantity = item.quantity || 1
                names.push(quantity > 1 ? `${item.name} ×${quantity}` : item.name)
                protein += item.protein * quantity
                carbs += item.carbs * quantity
                fats += item.fats * quantity
                calories += item.calories * quantity
            }

            handleAddNutrition({
                id: uuid.v4() as string,
                userId: userID,
                name: names.join(' + '),
                date: new Date(selectedDate),
                time: createdAt.getTime(),
                protein,
                carbs,
                fats,
                calories,
                isPhoto: false,
                ingredients: [],
                createdAt,
                updatedAt: createdAt,
            })
        } else {
            for (const item of addedItems) {
                const createdAt = new Date()
                const quantity = item.quantity || 1
                const nutritionEntry = {
                    id: uuid.v4() as string,
                    userId: userID,
                    name: item.name,
                    date: new Date(selectedDate),
                    time: createdAt.getTime(),
                    protein: item.protein * quantity,
                    carbs: item.carbs * quantity,
                    fats: item.fats * quantity,
                    calories: item.calories * quantity,
                    isPhoto: false,
                    ingredients: [],
                    createdAt,
                    updatedAt: createdAt,
                }
                handleAddNutrition(nutritionEntry)
            }
        }
        router.back()
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            {/* Loading Modal for Details */}
            <Modal visible={isLoadingDetails} transparent animationType="fade">
                <View style={styles.loadingModal}>
                    <View style={styles.loadingContent}>
                        <ActivityIndicator size="large" color={colors.nutrition} />
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
                        <TextInput style={styles.quantityInput} placeholder="1" placeholderTextColor={colors.placeholder} value={quantityValue} onChangeText={setQuantityValue} keyboardType="decimal-pad" autoFocus />
                        <View style={styles.quantityButtons}>
                            <TouchableOpacity style={[styles.quantityButton, styles.cancelButton]} onPress={cancelAddItem} activeOpacity={0.5}>
                                <X size={18} color={colors.destructive} strokeWidth={2.5} />
                                <Text style={[styles.quantityButtonText, styles.cancelButtonText]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.quantityButton, styles.confirmButton, !quantityValid && styles.confirmButtonDisabled]} onPress={confirmAddItem} disabled={!quantityValid} activeOpacity={0.5}>
                                <Check size={18} color={colors.nutrition} strokeWidth={2.5} />
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
                            <Database size={40} color={colors.nutrition} strokeWidth={2.5} />
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
                            placeholderTextColor={colors.placeholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                        {isSearching && (
                            <View style={styles.searchLoader}>
                                <ActivityIndicator size="small" color={colors.nutrition} />
                            </View>
                        )}
                    </View>

                    {/* Added Items Section */}
                    {addedItems.length > 0 && (
                        <StagedSection
                            label="Added"
                            count={addedItems.length}
                            color={colors.nutrition}
                            combineItems={combineItems}
                            onCombineItemsChange={setCombineItems}
                        >
                            {addedItems.map((item) => {
                                const q = item.quantity || 1
                                return (
                                    <View key={item.id} style={styles.stagedRow}>
                                        <View style={styles.stagedInfo}>
                                            <Text style={styles.stagedName}>
                                                {item.name}{q > 1 ? <Text style={styles.stagedQty}> ×{q}</Text> : ''}
                                            </Text>
                                            <View style={styles.macroRow}>
                                                <View style={styles.macroPill}>
                                                    <Text style={styles.macroPillText}>{Math.round(item.calories * q)} cal</Text>
                                                </View>
                                                <View style={styles.macroPill}>
                                                    <Text style={styles.macroPillText}>{Math.round(item.fats * q * 10) / 10}g F</Text>
                                                </View>
                                                <View style={styles.macroPill}>
                                                    <Text style={styles.macroPillText}>{Math.round(item.carbs * q * 10) / 10}g C</Text>
                                                </View>
                                                <View style={styles.macroPill}>
                                                    <Text style={styles.macroPillText}>{Math.round(item.protein * q * 10) / 10}g P</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveItem(item.id)} activeOpacity={0.5}>
                                            <X size={14} color={colors.nutrition} strokeWidth={3} />
                                        </TouchableOpacity>
                                    </View>
                                )
                            })}
                        </StagedSection>
                    )}

                    {/* Search Results Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{searchQuery ? `Results (${searchResults.length})` : 'Start searching for foods...'}</Text>
                        {isSearching ?
                            <View style={styles.emptyState}>
                                <ActivityIndicator size="large" color={colors.nutrition} />
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
                                        <TouchableOpacity style={[styles.addButton, (isAdded || isLoading) && styles.addButtonDisabled]} onPress={() => handleAddItem(item)} activeOpacity={0.5} disabled={!!isAdded || isLoading}>
                                            {isLoading ?
                                                <ActivityIndicator size="small" color={colors.placeholder} />
                                            :   <Plus size={18} color={isAdded ? colors.placeholder : colors.nutrition} strokeWidth={2.5} />}
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

            </KeyboardAvoidingView>

            {/* Add All Button - Fixed at bottom */}
            {addedItems.length > 0 && (
                <View style={styles.addAllContainer}>
                    <TouchableOpacity onPress={guardSubmit(handleAddAll)} disabled={submitting} activeOpacity={0.8} style={styles.addAllButtonTouchable}>
                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addAllButton}>
                            <Text style={styles.addAllButtonText}>
                                {combineItems && addedItems.length >= 2
                                    ? 'Add 1 combined meal'
                                    : `Add ${addedItems.length} Item${addedItems.length > 1 ? 's' : ''}`}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
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
        keyboardView: {
            flex: 1,
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
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.nutrition,
        },
        title: {
            fontSize: 24,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 4,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        subtitle: {
            fontSize: 16,
            color: colors.labelMuted,
            textAlign: 'center',
            marginBottom: 20,
            fontFamily: fonts.regular,
            letterSpacing: 0.2,
        },
        searchContainer: {
            marginBottom: 24,
            position: 'relative',
        },
        searchInput: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            paddingRight: 50,
            fontSize: 15,
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        searchInputFocused: {
            borderColor: colors.nutrition,
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
            color: colors.text,
            marginBottom: 12,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        foodItem: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 14,
            marginBottom: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        foodInfo: {
            flex: 1,
            marginRight: 12,
        },
        foodName: {
            fontSize: 15,
            color: colors.text,
            marginBottom: 4,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        foodMacros: {
            fontSize: 12,
            color: colors.textMuted,
            letterSpacing: 0.2,
            fontFamily: fonts.regular,
        },
        stagedRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginTop: 6,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        stagedInfo: {
            flex: 1,
            marginRight: 10,
        },
        stagedName: {
            fontSize: 14,
            color: colors.text,
            marginBottom: 6,
            letterSpacing: -0.3,
            fontFamily: fonts.semibold,
        },
        stagedQty: {
            color: colors.nutrition,
            fontFamily: fonts.regular,
        },
        macroRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 5,
        },
        macroPill: {
            backgroundColor: colors.surfaceInset,
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
        },
        macroPillText: {
            fontSize: 11,
            color: colors.textMuted,
            fontFamily: fonts.medium,
        },
        addButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.nutrition + '22',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.nutrition + '66',
        },
        addButtonDisabled: {
            backgroundColor: colors.textMuted + '1F',
            borderColor: colors.textMuted + '40',
        },
        removeButton: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.nutrition + '22',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.nutrition + '66',
        },
        emptyState: {
            paddingVertical: 40,
            alignItems: 'center',
            gap: 8,
        },
        emptyText: {
            fontSize: 14,
            color: colors.labelMuted,
        },
        emptySubtext: {
            fontSize: 12,
            color: colors.labelMuted,
        },
        brandName: {
            fontSize: 12,
            color: colors.textMuted,
            marginTop: 2,
            fontStyle: 'italic',
        },
        loadingDetailsText: {
            fontSize: 11,
            color: colors.nutrition,
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
            marginBottom: 50,
        },
        quantityContent: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        quantityTitle: {
            fontSize: 20,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        quantitySubtitle: {
            fontSize: 14,
            color: colors.labelMuted,
            textAlign: 'center',
            marginBottom: 20,
            letterSpacing: 0.2,
            fontFamily: fonts.regular,
        },
        quantityInput: {
            backgroundColor: colors.surfaceInset,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 18,
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.nutrition,
            textAlign: 'center',
            marginBottom: 20,
            fontFamily: fonts.regular,
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
            backgroundColor: colors.destructive + '1F',
            borderColor: colors.destructive + '40',
        },
        confirmButton: {
            backgroundColor: colors.nutrition + '1F',
            borderColor: colors.nutrition + '40',
        },
        confirmButtonDisabled: {
            opacity: 0.4,
        },
        quantityButtonText: {
            fontSize: 15,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        cancelButtonText: {
            color: colors.destructive,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        confirmButtonText: {
            color: colors.nutrition,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        addAllContainer: {
            paddingHorizontal: 24,
            paddingVertical: 16,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
        },
        addAllButtonTouchable: {
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
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
            fontFamily: fonts.semibold,
        },
    })
}
