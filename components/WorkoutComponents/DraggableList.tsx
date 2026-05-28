import React, { useCallback } from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist'

interface DraggableListProps<T> {
    data: T[]
    onDragEnd: (data: T[]) => void
    renderItem: (params: RenderItemParams<T>) => React.ReactElement
    keyExtractor: (item: T) => string
    contentContainerStyle?: ViewStyle
    ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null
}

export default function DraggableList<T>({ data, onDragEnd, renderItem, keyExtractor, contentContainerStyle, ListHeaderComponent }: DraggableListProps<T>) {
    const wrappedRenderItem = useCallback(
        (params: RenderItemParams<T>) => <ScaleDecorator>{renderItem(params)}</ScaleDecorator>,
        [renderItem],
    )

    const wrappedOnDragEnd = useCallback(
        ({ data: reordered }: { data: T[] }) => onDragEnd(reordered),
        [onDragEnd],
    )

    return (
        <DraggableFlatList
            data={data}
            onDragEnd={wrappedOnDragEnd}
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
