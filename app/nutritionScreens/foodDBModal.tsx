import PromptCard from '@/components/NeutralComponents/PromptCard'
import StagedSection from '@/components/NeutralComponents/StagedSection'
import FoodRow from '@/components/NutritionComponents/FoodRow'
import { useAuth } from '@/context/AuthContext'
import { useBilling } from '@/context/BillingContext'
import { useNutrition } from '@/context/NutritionContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { getFoodItem, getFoodSearchResults } from '@/lib/foodDB/foodDB'
import { POPULAR_FOODS, type PopularFood } from '@/lib/foodDB/popularFoods'
import { FoodItem, FoodSearchResult } from '@/lib/foodDB/types'
import { useSubmitOnce } from '@/lib/hooks/useSubmitOnce'
import { parseNumericInput } from '@/lib/utils/number'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Check, Database, X } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import uuid from 'react-native-uuid'

interface FoodItemWithQuantity extends FoodItem {
    quantity?: number
}

export default function FoodDBModal() {
    const { handleAddNutrition, selectedDate } = useNutrition()
    const { userID } = useAuth()
    const { hasPremium } = useBilling()
    const locked = !hasPremium
    const router = useRouter()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const [guardSubmit, submitting] = useSubmitOnce()
    const [upsellVisible, setUpsellVisible] = useState(false)

    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)

    const [addedItems, setAddedItems] = useState<FoodItemWithQuantity[]>([])
    const [combineItems, setCombineItems] = useState(false)
    const [quantityInputItem, setQuantityInputItem] = useState<FoodItem | null>(null)
    const [quantityValue, setQuantityValue] = useState('1')
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [selectedSearchItem, setSelectedSearchItem] = useState<FoodSearchResult | null>(null)

    useEffect(() => {
        if (addedItems.length < 2) setCombineItems(false)
    }, [addedItems.length])

    function openGate() {
        Keyboard.dismiss()
        setUpsellVisible(true)
    }

    // Editing invalidates the previous search so stale results never show;
    // the debounce below refreshes them ~700ms after typing settles.
    function handleQueryChange(text: string) {
        setSearchQuery(text)
        if (hasSearched) {
            setHasSearched(false)
            setSearchResults([])
        }
    }

    // Debounced auto-search — premium only (free users are gated at the
    // keyboard, so this can never fire for them).
    useEffect(() => {
        if (locked) return
        const q = searchQuery.trim()
        if (!q) return
        const timeoutId = setTimeout(async () => {
            setIsSearching(true)
            try {
                setSearchResults(await getFoodSearchResults(q))
            } catch {
                setSearchResults([])
                Alert.alert('Search Failed', 'Unable to search the food database. Check your connection and try again.')
            } finally {
                setIsSearching(false)
                setHasSearched(true)
            }
        }, 700)
        return () => clearTimeout(timeoutId)
    }, [searchQuery, locked])

    function handleAddPopular(food: PopularFood) {
        if (locked) {
            openGate()
            return
        }
        setQuantityInputItem({ id: food.id, name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats })
        setQuantityValue('1')
    }

    async function handleAddResult(searchItem: FoodSearchResult) {
        if (locked) {
            openGate()
            return
        }
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

    function cancelAddItem() {
        setQuantityInputItem(null)
        setQuantityValue('1')
        setSelectedSearchItem(null)
    }

    function handleRemoveItem(id: string) {
        setAddedItems(addedItems.filter((item) => item.id !== id))
    }

    function handleAddAll() {
        if (locked) {
            openGate()
            return
        }
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
                handleAddNutrition({
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
                })
            }
        }
        router.back()
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                <Modal visible={isLoadingDetails} transparent animationType="fade">
                    <View style={styles.loadingModal}>
                        <View style={styles.loadingContent}>
                            <ActivityIndicator size="large" color={colors.nutrition} />
                            <Text style={styles.loadingText}>Loading food details...</Text>
                        </View>
                    </View>
                </Modal>

                <Modal visible={quantityInputItem !== null} transparent animationType="fade" onRequestClose={cancelAddItem}>
                    <View style={styles.quantityModal}>
                        <View style={styles.quantityContent}>
                            <Text style={styles.quantityTitle}>How many servings?</Text>
                            <Text style={styles.quantitySubtitle}>{quantityInputItem?.name}</Text>
                            <TextInput
                                style={styles.quantityInput}
                                placeholder="1"
                                placeholderTextColor={colors.placeholder}
                                value={quantityValue}
                                onChangeText={setQuantityValue}
                                keyboardType="decimal-pad"
                                autoFocus
                            />
                            <View style={styles.quantityButtons}>
                                <TouchableOpacity style={[styles.quantityButton, styles.cancelButton]} onPress={cancelAddItem} activeOpacity={0.5}>
                                    <X size={18} color={colors.destructive} strokeWidth={2.5} />
                                    <Text style={[styles.quantityButtonText, styles.cancelButtonText]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.quantityButton, styles.confirmButton, !quantityValid && styles.confirmButtonDisabled]}
                                    onPress={confirmAddItem}
                                    disabled={!quantityValid}
                                    activeOpacity={0.5}
                                >
                                    <Check size={18} color={colors.nutrition} strokeWidth={2.5} />
                                    <Text style={[styles.quantityButtonText, styles.confirmButtonText]}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Database size={40} color={colors.nutrition} strokeWidth={2.5} />
                        </View>
                    </View>
                    <Text style={styles.title}>Food Database</Text>
                    <Text style={styles.subtitle}>Search and add food items</Text>

                    {locked ?
                        // Inert (non-focusable) input for free users so tapping raises the gate
                        // directly instead of flashing the keyboard open then dismissing it.
                        <TouchableOpacity style={styles.searchContainer} activeOpacity={0.7} onPress={openGate}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search foods..."
                                placeholderTextColor={colors.placeholder}
                                editable={false}
                                pointerEvents="none"
                            />
                        </TouchableOpacity>
                    :   <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search foods..."
                                placeholderTextColor={colors.placeholder}
                                value={searchQuery}
                                onChangeText={handleQueryChange}
                                returnKeyType="search"
                            />
                            {isSearching && (
                                <View style={styles.searchLoader}>
                                    <ActivityIndicator size="small" color={colors.nutrition} />
                                </View>
                            )}
                        </View>
                    }

                    {addedItems.length > 0 && (
                        <StagedSection label="Added" count={addedItems.length} color={colors.nutrition} combineItems={combineItems} onCombineItemsChange={setCombineItems}>
                            {addedItems.map((item) => {
                                const q = item.quantity || 1
                                return (
                                    <View key={item.id} style={styles.stagedRow}>
                                        <View style={styles.stagedInfo}>
                                            <Text style={styles.stagedName}>
                                                {item.name}
                                                {q > 1 ?
                                                    <Text style={styles.stagedQty}> ×{q}</Text>
                                                :   ''}
                                            </Text>
                                            <View style={styles.macroRow}>
                                                <View style={styles.macroPill}>
                                                    <Text style={styles.macroPillText}>{Math.round(item.calories * q)} kcal</Text>
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

                    {searchQuery.trim() === '' ?
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Popular foods</Text>
                            {POPULAR_FOODS.map((food) => (
                                <FoodRow
                                    key={food.id}
                                    name={food.name}
                                    servingSize={food.servingSize}
                                    macros={food}
                                    onAdd={() => handleAddPopular(food)}
                                    added={!!addedItems.find((item) => item.id === food.id)}
                                />
                            ))}
                        </View>
                    :   <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{hasSearched ? `Results (${searchResults.length})` : 'Search'}</Text>
                            {isSearching || !hasSearched ?
                                <View style={styles.emptyState}>
                                    <ActivityIndicator size="large" color={colors.nutrition} />
                                    <Text style={styles.emptyText}>Searching...</Text>
                                </View>
                            : searchResults.length > 0 ?
                                searchResults.map((item) => {
                                    const isAdded = !!addedItems.find((addedItem) => addedItem.id === item.fdcId)
                                    const isLoading = isLoadingDetails && selectedSearchItem?.fdcId === item.fdcId
                                    return (
                                        <FoodRow
                                            key={item.fdcId}
                                            name={item.description}
                                            brandName={item.brandName}
                                            onAdd={() => handleAddResult(item)}
                                            added={isAdded}
                                            loading={isLoading}
                                        />
                                    )
                                })
                            :   <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No results found</Text>
                                    <Text style={styles.emptySubtext}>Try a different search term</Text>
                                </View>
                            }
                        </View>
                    }
                </ScrollView>
            </KeyboardAvoidingView>

            {addedItems.length > 0 && (
                <View style={styles.addAllContainer}>
                    <TouchableOpacity onPress={guardSubmit(handleAddAll)} disabled={submitting} activeOpacity={0.8} style={styles.addAllButtonTouchable}>
                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addAllButton}>
                            <Text style={styles.addAllButtonText}>
                                {combineItems && addedItems.length >= 2 ? 'Add 1 combined meal' : `Add ${addedItems.length} Item${addedItems.length > 1 ? 's' : ''}`}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            {upsellVisible && (
                <PromptCard
                    icon={Database}
                    title="Unlock the Food Database"
                    message="Search a million-plus foods and log macros in seconds. Upgrade to add foods straight from the database."
                    ctaLabel="Upgrade to Continue"
                    onPress={() => router.replace('/settingsScreens/subscription')}
                    onGoBack={() => setUpsellVisible(false)}
                />
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
        body: {
            flex: 1,
            paddingHorizontal: 16,
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
            marginBottom: 20,
            position: 'relative',
        },
        searchInput: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingRight: 50,
            fontSize: 15,
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
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
