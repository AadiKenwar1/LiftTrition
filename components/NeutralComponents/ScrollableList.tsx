import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { useSettings } from '@/context/SettingsContext'
import { IMAGE_MAP } from '@/context/WorkoutContext/exerciseLibrary/dataV2/imageMap'
import { Image } from 'expo-image'
import { Dumbbell, Search } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export interface ScrollableListItem {
    id: string
    title: string
    exerciseMetadata?: {
        equipment?: string
        muscles?: string
        imgUrl?: string
    }
}

interface ScrollableListProps {
    data: ScrollableListItem[]
    searchPlaceholder?: string
    onPress?: (item: ScrollableListItem) => void
    selectedIds?: string[]
    /** Enable when this list sits inside another vertical scroll (e.g. screen ScrollView). Android only; improves nested scroll handoff. */
    nestedScrollEnabled?: boolean
    /** Exercise lists only: show thumbnail or dumbbell fallback. Hide for macro/other pickers. */
    showExerciseThumbnail?: boolean
}

export default function ScrollableList({
    data,
    searchPlaceholder = 'Search...',
    onPress,
    selectedIds,
    nestedScrollEnabled,
    showExerciseThumbnail = false,
}: ScrollableListProps) {
    const { mode } = useSettings()
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
    const [searchQuery, setSearchQuery] = useState('')
    const accent = mode ? colors.workout : colors.nutrition

    const queryLower = searchQuery.toLowerCase()
    const filteredData = data
        .filter((item) => item.title.toLowerCase().includes(queryLower))
        .sort((a, b) => {
            if (!queryLower) return 0
            return a.title.toLowerCase().indexOf(queryLower) - b.title.toLowerCase().indexOf(queryLower)
        })

    const renderItem = ({ item }: { item: ScrollableListItem }) => {
        const ItemWrapper = onPress ? TouchableOpacity : View
        const isSelected = selectedIds?.includes(item.id) ?? false

        const filename = showExerciseThumbnail ? item.exerciseMetadata?.imgUrl?.split('/').pop() : undefined
        const imageSource = filename ? IMAGE_MAP[filename] : undefined

        return (
            <ItemWrapper style={styles.itemOuter} onPress={onPress ? () => onPress(item) : undefined} activeOpacity={0.5}>
                <View style={[styles.itemWrapper, isSelected && styles.itemWrapperSelected]}>
                    <View style={[styles.accentBar, { backgroundColor: accent }]} />
                    <View style={styles.item}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle} numberOfLines={3}>
                                {item.title}
                            </Text>
                            {item.exerciseMetadata && (
                                <View style={styles.metadataContainer}>
                                    {item.exerciseMetadata.equipment && <Text style={styles.metadataText}>Equipment: {item.exerciseMetadata.equipment}</Text>}
                                    {item.exerciseMetadata.muscles && <Text style={styles.metadataText}>Muscles Targeted: {item.exerciseMetadata.muscles}</Text>}
                                </View>
                            )}
                        </View>
                        {showExerciseThumbnail && (
                            <View
                                style={[
                                    styles.imageGlowRing,
                                    { borderColor: accent, shadowColor: accent },
                                ]}
                            >
                                <View style={styles.imageCircle}>
                                    {imageSource ?
                                        <Image source={imageSource} style={styles.exerciseImage} contentFit="contain" />
                                    :   <Dumbbell size={25} color={colors.text} strokeWidth={1.8} />}
                                </View>
                            </View>
                        )}
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
                    <Search size={20} color={colors.textMuted} strokeWidth={2} />
                </View>
                <TextInput style={styles.searchInput} placeholder={searchPlaceholder} placeholderTextColor={colors.placeholder} value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" autoCorrect={false} />
                {searchQuery.length > 0 && (
                    <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')} activeOpacity={0.5} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Text style={styles.clearText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* List */}
            <FlatList
                data={filteredData}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={nestedScrollEnabled}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onScrollBeginDrag={Keyboard.dismiss}
            />
        </View>
    )
}

function makeStyles(colors: Colors, isDark: boolean) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 12,
            marginTop: 12,
            marginBottom: 8,
            paddingHorizontal: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        searchIconContainer: {
            marginRight: 8,
        },
        searchInput: {
            flex: 1,
            fontSize: 16,
            color: colors.text,
            paddingVertical: 12,
            fontFamily: fonts.regular,
        },
        clearButton: {
            padding: 4,
            marginLeft: 8,
        },
        clearText: {
            fontSize: 18,
            color: colors.textMuted,
            fontFamily: fonts.semibold,
        },
        listContent: {
            paddingHorizontal: 0,
            paddingVertical: 0,
        },
        itemOuter: isDark ? { marginVertical: 6 } : {
            marginVertical: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
        },
        itemWrapper: {
            flexDirection: 'row',
            borderRadius: radius.card,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        itemWrapperSelected: {
            backgroundColor: colors.iconChipBg,
            borderColor: colors.workout,
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
            color: colors.text,
            letterSpacing: 0.3,
            marginBottom: 4,
            fontFamily: fonts.semibold,
        },
        metadataContainer: {
            marginTop: 4,
            gap: 2,
        },
        metadataText: {
            fontSize: 13,
            color: colors.textMuted,
            letterSpacing: 0.2,
            fontFamily: fonts.regular,
        },
        imageGlowRing: {
            width: 72,
            height: 72,
            borderRadius: 36,
            marginLeft: 12,
            flexShrink: 0,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
        },
        imageCircle: {
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: colors.surfaceInset,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
        },
        exerciseImage: {
            width: 52,
            height: 52,
            tintColor: colors.text,
        },
        rightContent: {
            justifyContent: 'center',
            alignItems: 'center',
        },
    })
}
