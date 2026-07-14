import StagedSection from '@/components/NeutralComponents/StagedSection'
import SavedEntry from '@/components/NutritionComponents/SavedEntry'
import { useAuth } from '@/context/AuthContext'
import { useNutrition } from '@/context/NutritionContext'
import { getFilteredSavedNutritionEntries } from '@/context/NutritionContext/functions/crudFunctions'
import { scaleIngredients } from '@/context/NutritionContext/functions/ingredients'
import { Ingredient, NutritionEntry } from '@/context/NutritionContext/types'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useSubmitOnce } from '@/lib/hooks/useSubmitOnce'
import { confirmDelete } from '@/lib/utils/confirmDelete'
import { parseNumericInput } from '@/lib/utils/number'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Bookmark, Check, X } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import uuid from 'react-native-uuid'

type StagedSavedMeal = {
    lineId: string
    savedItem: NutritionEntry
    quantity: number
}

export default function SavedNutritionModal() {
    const { savedNutritionEntries, handleUnsaveNutrition, handleAddNutrition, selectedDate } = useNutrition()
    const { userID } = useAuth()
    const router = useRouter()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const [guardSubmit, submitting] = useSubmitOnce()
    const [addedItems, setAddedItems] = useState<StagedSavedMeal[]>([])
    const [combineItems, setCombineItems] = useState(false)
    const [quantityInputItem, setQuantityInputItem] = useState<NutritionEntry | null>(null)
    const [quantityValue, setQuantityValue] = useState('1')
    const [searchQuery, setSearchQuery] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    const filteredSavedEntries = useMemo(() => getFilteredSavedNutritionEntries(savedNutritionEntries, searchQuery), [savedNutritionEntries, searchQuery])

    useEffect(() => {
        if (addedItems.length < 2) setCombineItems(false)
    }, [addedItems.length])

    function openQuantityModal(savedItem: NutritionEntry) {
        setQuantityInputItem(savedItem)
        setQuantityValue('1')
    }

    const parsedQuantity = parseNumericInput(quantityValue)
    const quantityValid = parsedQuantity !== null && parsedQuantity > 0

    function confirmAddItem() {
        if (!quantityInputItem || !quantityValid) return
        setAddedItems((prev) => [
            ...prev,
            {
                lineId: uuid.v4() as string,
                savedItem: quantityInputItem,
                quantity: parsedQuantity,
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

    function confirmUnsave(savedItem: NutritionEntry) {
        confirmDelete({ title: 'Remove saved meal?', message: `"${savedItem.name}" will be removed from your saved meals.`, confirmText: 'Remove', onConfirm: () => handleUnsaveNutrition(savedItem.id) })
    }

    async function handleAddAll() {
        if (combineItems && addedItems.length >= 2) {
            const createdAt = new Date()
            let protein = 0
            let carbs = 0
            let fats = 0
            let calories = 0
            const ingredients: Ingredient[] = []
            const names: string[] = []

            for (const row of addedItems) {
                const q = row.quantity
                const base = row.savedItem
                names.push(q > 1 ? `${base.name} ×${q}` : base.name)
                protein += base.protein * q
                carbs += base.carbs * q
                fats += base.fats * q
                calories += base.calories * q
                ingredients.push(...scaleIngredients(base.ingredients, q))
            }

            const nutritionEntry: NutritionEntry = {
                id: uuid.v4() as string,
                userId: userID,
                name: names.join(' + '),
                date: new Date(selectedDate),
                time: createdAt.getTime(),
                protein: Math.round(protein * 10) / 10,
                carbs: Math.round(carbs * 10) / 10,
                fats: Math.round(fats * 10) / 10,
                calories: Math.round(calories),
                isPhoto: false,
                ingredients,
                createdAt,
                updatedAt: createdAt,
            }
            handleAddNutrition(nutritionEntry)
        } else {
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
        }
        router.back()
    }

    const listHeader = (
        <>
            <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                    <Bookmark size={40} color={colors.nutrition} strokeWidth={2.5} />
                </View>
            </View>

            <Text style={styles.title}>Saved Meals</Text>
            <Text style={styles.subtitle}>Sorted by most recently saved</Text>

            {addedItems.length > 0 && (
                <StagedSection label="Added" count={addedItems.length} color={colors.nutrition} combineItems={combineItems} onCombineItemsChange={setCombineItems}>
                    {addedItems.map((row) => {
                        const q = row.quantity
                        const s = row.savedItem
                        return (
                            <View key={row.lineId} style={styles.stagedRow}>
                                <View style={styles.stagedInfo}>
                                    <Text style={styles.stagedName}>
                                        {s.name}
                                        {q > 1 ?
                                            <Text style={styles.stagedQty}> ×{q}</Text>
                                        :   ''}
                                    </Text>
                                    <View style={styles.macroRow}>
                                        <View style={styles.macroPill}>
                                            <Text style={styles.macroPillText}>{Math.round(s.calories * q)} cal</Text>
                                        </View>
                                        <View style={styles.macroPill}>
                                            <Text style={styles.macroPillText}>{Math.round(s.fats * q * 10) / 10}g F</Text>
                                        </View>
                                        <View style={styles.macroPill}>
                                            <Text style={styles.macroPillText}>{Math.round(s.carbs * q * 10) / 10}g C</Text>
                                        </View>
                                        <View style={styles.macroPill}>
                                            <Text style={styles.macroPillText}>{Math.round(s.protein * q * 10) / 10}g P</Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveStaged(row.lineId)} activeOpacity={0.5}>
                                    <X size={14} color={colors.nutrition} strokeWidth={3} />
                                </TouchableOpacity>
                            </View>
                        )
                    })}
                </StagedSection>
            )}

            {savedNutritionEntries.length > 0 && (
                <View style={styles.searchContainer}>
                    <TextInput style={[styles.searchInput, isFocused && styles.searchInputFocused]} placeholder="Search saved meals..." placeholderTextColor={colors.placeholder} value={searchQuery} onChangeText={setSearchQuery} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
                </View>
            )}
        </>
    )

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No saved meals yet</Text>
            <Text style={styles.emptySubtext}>Save meals to quickly add them later</Text>
        </View>
    )

    const renderNoSearchResults = () => (
        <View style={styles.emptyState}>
            <Text style={styles.noResultsText}>
                No meals match your search. <Text style={styles.noResultsHint}>Try a different name.</Text>
            </Text>
        </View>
    )

    const renderListEmpty = () => {
        if (savedNutritionEntries.length === 0) return renderEmptyState()
        return renderNoSearchResults()
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

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

                <View style={styles.body}>
                    <FlatList
                        data={filteredSavedEntries}
                        extraData={savedNutritionEntries.length}
                        keyExtractor={(item) => item.id}
                        ListHeaderComponent={listHeader}
                        renderItem={({ item }) => <SavedEntry name={item.name} calories={item.calories} protein={item.protein} carbs={item.carbs} fats={item.fats} onAddPress={() => openQuantityModal(item)} onDeletePress={() => confirmUnsave(item)} />}
                        ListEmptyComponent={renderListEmpty}
                        contentContainerStyle={[styles.listContent, savedNutritionEntries.length === 0 && styles.listContentEmpty]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    />
                </View>
            </KeyboardAvoidingView>

            {addedItems.length > 0 && (
                <View style={styles.addAllContainer}>
                    <TouchableOpacity onPress={guardSubmit(handleAddAll)} disabled={submitting} activeOpacity={0.8} style={styles.addAllButtonTouchable}>
                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addAllButton}>
                            <Text style={styles.addAllButtonText}>{combineItems && addedItems.length >= 2 ? 'Add 1 combined meal' : `Add ${addedItems.length} Item${addedItems.length > 1 ? 's' : ''}`}</Text>
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
            marginBottom: 8,
            position: 'relative',
        },
        searchInput: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: colors.text,
            borderWidth: 2,
            borderColor: colors.hairline,
            fontFamily: fonts.regular,
        },
        searchInputFocused: {
            borderColor: colors.nutrition,
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
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
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
        noResultsText: {
            fontSize: 15,
            color: colors.textMuted,
            textAlign: 'center',
            lineHeight: 22,
            fontFamily: fonts.medium,
        },
        noResultsHint: {
            color: colors.labelMuted,
            fontFamily: fonts.regular,
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
            fontFamily: fonts.semibold,
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
        },
        confirmButtonText: {
            color: colors.nutrition,
        },
    })
}
