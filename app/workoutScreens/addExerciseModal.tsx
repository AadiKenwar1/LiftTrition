import { ScrollableListItem } from '@/components/NeutralComponents/ScrollableList'
import StagedSection from '@/components/NeutralComponents/StagedSection'
import { useAuth } from '@/context/AuthContext'
import { useWorkout } from '@/context/WorkoutContext'
import { EQUIPMENT_TYPES, MUSCLE_GROUPS } from '@/context/WorkoutContext/exerciseLibrary/constants'
import { IMAGE_MAP } from '@/context/WorkoutContext/exerciseLibrary/dataV2/imageMap'
import { CreateExerciseData } from '@/context/WorkoutContext/types'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Fuse from 'fuse.js'
import { Dumbbell, Plus, X } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function AddExerciseModal() {
    const { handleAddExercises, handleCreateUserExercise, fullExerciseLibAsList, fullExerciseLib, exercises } = useWorkout()
    const { workoutId } = useLocalSearchParams<{ workoutId: string }>()
    const { userID } = useAuth()
    const router = useRouter()

    // Add exercise state
    const [selectedItems, setSelectedItems] = useState<ScrollableListItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    // Quick-create sheet state
    const [showCreateSheet, setShowCreateSheet] = useState(false)
    const [createName, setCreateName] = useState('')
    const [createIsCompound, setCreateIsCompound] = useState(false)
    const [createMuscle, setCreateMuscle] = useState('')
    const [createEquipment, setCreateEquipment] = useState('')

    const fuse = useMemo(() => new Fuse(fullExerciseLibAsList, {
        keys: ['title', 'exerciseMetadata.muscles'],
        threshold: 0.4,
        minMatchCharLength: 2,
        ignoreLocation: true,
    }), [fullExerciseLibAsList])

    const filteredExercises = useMemo(() => {
        const q = searchQuery.trim()
        if (!q) return fullExerciseLibAsList
        return fuse.search(q).map((r) => r.item)
    }, [fuse, searchQuery])

    const selectedIds = useMemo(() => new Set(selectedItems.map((i) => i.id)), [selectedItems])

    function handleToggle(item: ScrollableListItem) {
        if (selectedIds.has(item.id)) {
            setSelectedItems((prev) => prev.filter((i) => i.id !== item.id))
            return
        }
        const alreadyExists = exercises.some((e) => e.workoutID === workoutId && e.name.toLowerCase() === item.title.toLowerCase() && !e.archived)
        if (alreadyExists) {
            Alert.alert('Already in Workout', `${item.title} is already in this workout. If you don't see it, it may be archived.`)
            return
        }
        setSelectedItems((prev) => [...prev, item])
    }

    function handleRemoveStaged(id: string) {
        setSelectedItems((prev) => prev.filter((i) => i.id !== id))
    }

    function handleAddAll() {
        handleAddExercises(workoutId, userID, selectedItems.map((i) => i.title))
        router.back()
    }

    function openCreateSheet() {
        setCreateName(searchQuery.trim())
        setCreateIsCompound(false)
        setCreateMuscle('')
        setCreateEquipment('')
        setShowCreateSheet(true)
    }

    function handleCreateAndStage() {
        const name = createName.trim()
        if (!name) {
            Alert.alert('Name Required', 'Please enter a name for your exercise.')
            return
        }
        if (name in fullExerciseLib) {
            Alert.alert('Duplicate Name', 'An exercise with this name already exists. Please choose a different name.')
            return
        }
        if (!createMuscle) {
            Alert.alert('Muscle Required', 'Please select a primary muscle group.')
            return
        }
        if (!createEquipment) {
            Alert.alert('Equipment Required', 'Please select an equipment type.')
            return
        }
        const exerciseData: CreateExerciseData = {
            name,
            mainMuscle: createMuscle,
            isCompound: createIsCompound,
            equipment: createEquipment,
        }
        handleCreateUserExercise(exerciseData, userID)
        setSelectedItems((prev) => [...prev, {
            id: name,
            title: name,
            exerciseMetadata: { muscles: createMuscle, equipment: createEquipment },
        }])
        setShowCreateSheet(false)
        setSearchQuery('')
    }

    const listHeader = (
        <>
            <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                    <Dumbbell size={40} color="#2f80ed" strokeWidth={2} />
                </View>
            </View>
            <Text style={styles.title}>Add Exercises</Text>
            <Text style={styles.subtitle}>Choose from over 1300 exercises</Text>

            <TouchableOpacity style={styles.createExerciseButton} onPress={openCreateSheet} activeOpacity={0.8}>
                <Plus size={15} color="#2f80ed" strokeWidth={2.5} />
                <Text style={styles.createExerciseText}>Create custom exercise</Text>
            </TouchableOpacity>

            {selectedItems.length > 0 && (
                <StagedSection label="Selected" count={selectedItems.length} color="#2f80ed">
                    <View style={styles.chipsRow}>
                        {selectedItems.map((item) => (
                            <View key={item.id} style={styles.chip}>
                                <Text style={styles.chipText}>{item.title}</Text>
                                <TouchableOpacity onPress={() => handleRemoveStaged(item.id)} activeOpacity={0.5} hitSlop={6} style={styles.chipRemove}>
                                    <X size={12} color="#2f80ed" strokeWidth={3} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </StagedSection>
            )}

            <View style={styles.searchContainer}>
                <TextInput
                    style={[styles.searchInput, isFocused && styles.searchInputFocused]}
                    placeholder="Search exercises..."
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')} activeOpacity={0.5}>
                        <Text style={styles.clearText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
        </>
    )

    function renderListEmpty() {
        const q = searchQuery.trim()
        if (!q) return null
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No results for "{q}"</Text>
                <TouchableOpacity style={styles.createPromptButton} onPress={openCreateSheet} activeOpacity={0.8}>
                    <Plus size={16} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.createPromptText}>Create "{q}"</Text>
                </TouchableOpacity>
            </View>
        )
    }

    function renderItem({ item }: { item: ScrollableListItem }) {
        const isSelected = selectedIds.has(item.id)
        const filename = item.exerciseMetadata?.imgUrl?.split('/').pop()
        const imageSource = filename ? IMAGE_MAP[filename] : undefined

        return (
            <TouchableOpacity onPress={() => handleToggle(item)} activeOpacity={0.5}>
                <View style={[styles.itemWrapper, isSelected && styles.itemWrapperSelected]}>
                    <View style={styles.accentBar} />
                    <View style={styles.item}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                            {item.exerciseMetadata?.muscles && (
                                <Text style={styles.itemMeta} numberOfLines={1}>Muscles: {item.exerciseMetadata.muscles}</Text>
                            )}
                            {item.exerciseMetadata?.equipment && (
                                <Text style={styles.itemMeta} numberOfLines={1}>Equipment: {item.exerciseMetadata.equipment}</Text>
                            )}
                        </View>
                        <View style={styles.imageGlowRing}>
                            <View style={styles.imageCircle}>
                                {imageSource
                                    ? <Image source={imageSource} style={styles.exerciseImage} contentFit="contain" transition={150} />
                                    : <Dumbbell size={22} color="#ffffff" strokeWidth={1.8} />
                                }
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                <View style={styles.body}>
                    <FlatList
                        data={filteredExercises}
                        keyExtractor={(item) => item.id}
                        ListHeaderComponent={listHeader}
                        renderItem={renderItem}
                        ListEmptyComponent={renderListEmpty}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        onScrollBeginDrag={Keyboard.dismiss}
                    />
                </View>
            </KeyboardAvoidingView>

            {selectedItems.length > 0 && (
                <View style={styles.addAllContainer}>
                    <TouchableOpacity onPress={handleAddAll} activeOpacity={0.8} style={styles.addAllButton}>
                        <Text style={styles.addAllButtonText}>
                            Add {selectedItems.length} Exercise{selectedItems.length > 1 ? 's' : ''}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Quick-create bottom sheet */}
            <Modal visible={showCreateSheet} animationType="slide" transparent onRequestClose={() => setShowCreateSheet(false)}>
                <View style={styles.sheetOverlay}>
                    <View style={styles.sheet}>
                            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                                <Text style={styles.sheetTitle}>Create Custom Exercise</Text>
                                <Text style={styles.sheetSubtitle}>Fill in the details below</Text>

                                <Text style={styles.sheetLabel}>Exercise Name</Text>
                                <TextInput
                                    style={styles.sheetInput}
                                    value={createName}
                                    onChangeText={setCreateName}
                                    placeholder="e.g. Cable Chest Fly"
                                    placeholderTextColor="#555"
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                />

                                <Text style={styles.sheetLabel}>Type</Text>
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity
                                        style={[styles.toggleButton, !createIsCompound && styles.toggleButtonActive]}
                                        onPress={() => setCreateIsCompound(false)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.toggleText, !createIsCompound && styles.toggleTextActive]}>Isolation</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleButton, createIsCompound && styles.toggleButtonActive]}
                                        onPress={() => setCreateIsCompound(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.toggleText, createIsCompound && styles.toggleTextActive]}>Compound</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.sheetLabel}>Primary Muscle</Text>
                                <View style={styles.chipGrid}>
                                    {MUSCLE_GROUPS.map((muscle) => (
                                        <TouchableOpacity
                                            key={muscle}
                                            style={[styles.gridChip, createMuscle === muscle && styles.gridChipActive]}
                                            onPress={() => setCreateMuscle(muscle)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.gridChipText, createMuscle === muscle && styles.gridChipTextActive]}>{muscle}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.sheetLabel}>Equipment</Text>
                                <View style={styles.chipGrid}>
                                    {EQUIPMENT_TYPES.map((eq) => (
                                        <TouchableOpacity
                                            key={eq}
                                            style={[styles.gridChip, createEquipment === eq && styles.gridChipActive]}
                                            onPress={() => setCreateEquipment(eq)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.gridChipText, createEquipment === eq && styles.gridChipTextActive]}>{eq}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            <View style={styles.sheetButtons}>
                                <TouchableOpacity style={styles.sheetCancelButton} onPress={() => setShowCreateSheet(false)} activeOpacity={0.7}>
                                    <Text style={styles.sheetCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.sheetCreateButton} onPress={handleCreateAndStage} activeOpacity={0.8}>
                                    <Text style={styles.sheetCreateText}>Create & Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
            </Modal>
        </View>
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
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 4,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2f80ed',
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
        marginBottom: 10,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    createExerciseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: 'rgba(47, 128, 237, 0.4)',
        borderRadius: 20,
        paddingVertical: 7,
        paddingHorizontal: 14,
        marginBottom: 14,
        backgroundColor: 'rgba(47, 128, 237, 0.08)',
    },
    createExerciseText: {
        fontSize: 13,
        color: '#2f80ed',
        fontFamily: 'Poppins_500Medium',
        letterSpacing: -0.2,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(47, 128, 237, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(47, 128, 237, 0.4)',
        borderRadius: 20,
        paddingVertical: 5,
        paddingLeft: 12,
        paddingRight: 8,
        gap: 6,
        flexShrink: 1,
        minWidth: 0,
        maxWidth: '100%',
    },
    chipText: {
        fontSize: 13,
        color: '#fff',
        fontFamily: 'Poppins_500Medium',
        letterSpacing: -0.2,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    chipRemove: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(47, 128, 237, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        marginBottom: 8,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#242424',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#FFF',
        paddingVertical: 12,
        fontFamily: 'Poppins_400Regular',
    },
    searchInputFocused: {
        color: '#fff',
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    clearText: {
        fontSize: 16,
        color: '#888',
        fontFamily: 'Poppins_600SemiBold',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 24,
        gap: 14,
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
    },
    createPromptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2f80ed',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 20,
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    createPromptText: {
        fontSize: 14,
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.3,
    },
    itemWrapper: {
        flexDirection: 'row',
        marginVertical: 5,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: '#242424',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 5,
    },
    itemWrapperSelected: {
        backgroundColor: 'rgba(47, 128, 237, 0.12)',
        borderColor: '#2f80ed',
    },
    accentBar: {
        width: 4,
        backgroundColor: '#2f80ed',
    },
    item: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    itemInfo: {
        flex: 1,
        marginRight: 10,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
        letterSpacing: -0.3,
        marginBottom: 3,
        fontFamily: 'Poppins_600SemiBold',
    },
    itemMeta: {
        fontSize: 12,
        color: '#888',
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.1,
    },
    imageGlowRing: {
        width: 60,
        height: 60,
        borderRadius: 30,
        flexShrink: 0,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2f80ed',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    imageCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    exerciseImage: {
        width: 42,
        height: 42,
        tintColor: '#fff',
    },
    addAllContainer: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 32 : 20,
        paddingTop: 12,
        backgroundColor: '#121212',
        borderTopWidth: 1,
        borderTopColor: '#1e1e1e',
    },
    addAllButton: {
        backgroundColor: '#2f80ed',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    addAllButtonText: {
        fontSize: 16,
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.3,
    },

    // Quick-create sheet
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#121212',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '88%',
    },
    sheetContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
    },
    sheetTitle: {
        fontSize: 22,
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    sheetSubtitle: {
        fontSize: 14,
        color: '#888',
        fontFamily: 'Poppins_400Regular',
        marginBottom: 20,
        letterSpacing: 0.1,
    },
    sheetLabel: {
        fontSize: 13,
        color: '#aaa',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    sheetInput: {
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 16,
        color: '#fff',
        fontFamily: 'Poppins_500Medium',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        marginBottom: 20,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#2a2a2a',
        backgroundColor: '#1e1e1e',
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: 'rgba(47, 128, 237, 0.15)',
        borderColor: '#2f80ed',
    },
    toggleText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.3,
    },
    toggleTextActive: {
        color: '#fff',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    gridChip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#2a2a2a',
        backgroundColor: '#1e1e1e',
    },
    gridChipActive: {
        backgroundColor: 'rgba(47, 128, 237, 0.15)',
        borderColor: '#2f80ed',
    },
    gridChipText: {
        fontSize: 13,
        color: '#666',
        fontFamily: 'Poppins_500Medium',
        letterSpacing: -0.2,
    },
    gridChipTextActive: {
        color: '#fff',
    },
    sheetButtons: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        borderTopWidth: 1,
        borderTopColor: '#1e1e1e',
    },
    sheetCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        backgroundColor: '#1e1e1e',
        alignItems: 'center',
    },
    sheetCancelText: {
        fontSize: 15,
        color: '#aaa',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.3,
    },
    sheetCreateButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#2f80ed',
        alignItems: 'center',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    sheetCreateText: {
        fontSize: 15,
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.3,
    },
})
