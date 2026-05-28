import React, { useCallback } from 'react'
import { ListRenderItemInfo, StyleSheet, ViewStyle } from 'react-native'
import ReorderableList, { ReorderableListReorderEvent, reorderItems, useReorderableDrag } from 'react-native-reorderable-list'

export interface DraggableListRenderParams<T> {
    item: T
    drag: () => void
}

interface DraggableListProps<T> {
    data: T[]
    onDragEnd: (data: T[]) => void
    renderItem: (params: DraggableListRenderParams<T>) => React.ReactElement
    keyExtractor: (item: T) => string
    contentContainerStyle?: ViewStyle
    ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null
}

function DraggableItem<T>({ item, renderItem }: { item: T; renderItem: (p: DraggableListRenderParams<T>) => React.ReactElement }) {
    const drag = useReorderableDrag()
    return renderItem({ item, drag })
}

export default function DraggableList<T>({ data, onDragEnd, renderItem, keyExtractor, contentContainerStyle, ListHeaderComponent }: DraggableListProps<T>) {
    const handleReorder = useCallback(
        ({ from, to }: ReorderableListReorderEvent) => {
            onDragEnd(reorderItems(data, from, to))
        },
        [data, onDragEnd],
    )

    const wrappedRenderItem = useCallback(
        ({ item }: ListRenderItemInfo<T>) => <DraggableItem item={item} renderItem={renderItem} />,
        [renderItem],
    )

    return (
        <ReorderableList
            data={data}
            onReorder={handleReorder}
            keyExtractor={keyExtractor}
            renderItem={wrappedRenderItem}
            contentContainerStyle={[styles.content, contentContainerStyle]}
            ListHeaderComponent={ListHeaderComponent}
        />
    )
}

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 150,
    },
})
