import { ScrollableListItem } from '@/components/NeutralComponents/ScrollableList'
import StagedSection from '@/components/NeutralComponents/StagedSection'
import { useAuth } from '@/context/AuthContext'
import { useWorkout } from '@/context/WorkoutContext'
import { IMAGE_MAP } from '@/context/WorkoutContext/exerciseLibrary/dataV2/imageMap'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Dumbbell, X } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function AddExerciseModal() {
    const { handleAddExercises, fullExerciseLibAsList, exercises } = useWorkout()
    const { workoutId } = useLocalSearchParams<{ workoutId: string }>()
    const { userID } = useAuth()
    const router = useRouter()

    const [selectedItems, setSelectedItems] = useState<ScrollableListItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    const filteredExercises = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return fullExerciseLibAsList
        return fullExerciseLibAsList
            .filter((item) => item.title.toLowerCase().includes(q))
            .sort((a, b) => a.title.toLowerCase().indexOf(q) - b.title.toLowerCase().indexOf(q))
    }, [fullExerciseLibAsList, searchQuery])

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

    const listHeader = (
        <>
            <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                    <Dumbbell size={40} color="#2f80ed" strokeWidth={2} />
                </View>
            </View>
            <Text style={styles.title}>Add Exercises</Text>
            <Text style={styles.subtitle}>Choose from over 1300 exercises</Text>
            <TouchableOpacity onPress={() => router.replace('/settingsScreens/createExercise/createExercise1')}>
                <Text style={[styles.subtitle, { color: '#2f80ed', marginBottom: 16 }]}>Or click here to create an exercise</Text>
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
                        {imageSource && (
                            <View style={styles.imageGlowRing}>
                                <View style={styles.imageCircle}>
                                    <Image source={imageSource} style={styles.exerciseImage} contentFit="contain" transition={150} />
                                </View>
                            </View>
                        )}
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
        marginBottom: 4,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
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
        shadowOpacity: 0.7,
        shadowRadius: 8,
        elevation: 10,
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
})
