import ScrollableList, { ScrollableListItem } from '@/components/NeutralComponents/ScrollableList'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { Dumbbell, Utensils } from 'lucide-react-native'
import { useMemo } from 'react'
import { Modal, StyleSheet, Text, View } from 'react-native'

interface SelectionModalProps {
    visible: boolean
    onClose: () => void
    onSelect: (value: string) => void
    mode: boolean
    data: ScrollableListItem[]
}

export default function SelectionModal({ visible, onClose, onSelect, mode, data }: SelectionModalProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = mode ? colors.workout : colors.nutrition

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} transparent={false}>
            <View style={styles.container}>
                {/* Drag Handle */}
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                {/* Header Section */}
                <View style={styles.header}>
                    <View style={[styles.iconCircle, { borderColor: accent }]}>
                        {mode ?
                            <Dumbbell size={32} color={accent} strokeWidth={2.5} />
                        :   <Utensils size={32} color={accent} strokeWidth={2.5} />}
                    </View>
                    <Text style={styles.title}>{mode ? 'Select Exercise' : 'Select Macro'}</Text>
                    <Text style={styles.subtitle}>{mode ? 'Choose which exercise to track' : 'Choose which macro to track'}</Text>
                </View>

                {/* Scrollable List */}
                <ScrollableList
                    data={data}
                    showExerciseThumbnail={mode}
                    searchPlaceholder={mode ? 'Search exercises...' : 'Search macros...'}
                    onPress={(item: ScrollableListItem) => {
                        onSelect(item.title)
                        onClose()
                    }}
                />
            </View>
        </Modal>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 24,
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
        header: {
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 16,
        },
        iconCircle: {
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            marginBottom: 16,
        },
        title: {
            fontSize: 24,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
            fontFamily: fonts.bold,
        },
        subtitle: {
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
            fontFamily: fonts.regular,
        },
    })
}
