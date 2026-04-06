import { useSettings } from '@/context/SettingsContext'
import { Search } from 'lucide-react-native'
import { useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export interface ScrollableListItem {
    id: string
    title: string
    exerciseMetadata?: {
        equipment?: string
        muscles?: string
    }
}

interface ScrollableListProps {
    data: ScrollableListItem[]
    searchPlaceholder?: string
    onPress?: (item: ScrollableListItem) => void
    selectedIds?: string[]
}

export default function ScrollableList({ data, searchPlaceholder = 'Search...', onPress, selectedIds }: ScrollableListProps) {
    const { mode } = useSettings()
    const [searchQuery, setSearchQuery] = useState('')

    // Filter data based on search query
    const filteredData = data.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))

    const renderItem = ({ item }: { item: ScrollableListItem }) => {
        const ItemWrapper = onPress ? TouchableOpacity : View
        const isSelected = selectedIds?.includes(item.id) ?? false

        return (
            <ItemWrapper onPress={onPress ? () => onPress(item) : undefined} activeOpacity={0.5}>
                <View style={[styles.itemWrapper, isSelected && styles.itemWrapperSelected]}>
                    <View style={[styles.accentBar, { backgroundColor: mode ? '#2f80ed' : '#22C922' }]} />
                    <View style={styles.item}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle} numberOfLines={1}>
                                {item.title}
                            </Text>
                            {item.exerciseMetadata && (
                                <View style={styles.metadataContainer}>
                                    {item.exerciseMetadata.equipment && <Text style={styles.metadataText}>Equipment: {item.exerciseMetadata.equipment}</Text>}
                                    {item.exerciseMetadata.muscles && <Text style={styles.metadataText}>Muscles Targeted: {item.exerciseMetadata.muscles}</Text>}
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </ItemWrapper>
        )
    }

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchIconContainer}>
                    <Search size={20} color="#888" strokeWidth={2} />
                </View>
                <TextInput style={styles.searchInput} placeholder={searchPlaceholder} placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" autoCorrect={false} />
                {searchQuery.length > 0 && (
                    <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')} activeOpacity={0.5}>
                        <Text style={styles.clearText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* List */}
            <FlatList data={filteredData} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#282A2C',
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#242424',
    },
    searchIconContainer: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#FFF',
        paddingVertical: 12,
        fontWeight: '400',
        fontFamily: 'Poppins_400Regular',
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    clearText: {
        fontSize: 18,
        color: '#888',
        fontWeight: '600',
        fontFamily: 'Poppins_600SemiBold',
    },
    listContent: {
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    itemWrapper: {
        flexDirection: 'row',
        marginVertical: 6,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#282A2C',
        borderWidth: 1,
        borderColor: '#242424',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    itemWrapperSelected: {
        backgroundColor: 'rgba(45, 156, 255, 0.15)',
        borderColor: '#2f80ed',
    },
    accentBar: {
        width: 4,
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    item: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    itemInfo: {
        flex: 1,
        marginRight: 12,
    },
    itemTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFF',
        letterSpacing: 0.3,
        marginBottom: 4,
        fontFamily: 'Poppins_400Regular',
    },
    metadataContainer: {
        marginTop: 4,
        gap: 2,
    },
    metadataText: {
        fontSize: 13,
        fontWeight: '400',
        color: '#888',
        letterSpacing: 0.2,
    },
    rightContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
})
