import ScrollableList, { ScrollableListItem } from '@/components/NeutralComponents/ScrollableList'
import { Dumbbell, Utensils } from 'lucide-react-native'
import { Modal, StyleSheet, Text, View } from 'react-native'

interface SelectionModalProps {
    visible: boolean
    onClose: () => void
    onSelect: (value: string) => void
    mode: boolean
    data: ScrollableListItem[]
}

export default function SelectionModal({ visible, onClose, onSelect, mode, data }: SelectionModalProps) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} transparent={false}>
            <View style={styles.container}>
                {/* Drag Handle */}
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                {/* Header Section */}
                <View style={styles.header}>
                    <View style={[styles.iconCircle, { borderColor: mode ? '#2f80ed' : '#34C759' }]}>
                        {mode ?
                            <Dumbbell size={32} color="#2f80ed" strokeWidth={2.5} />
                        :   <Utensils size={32} color="#34C759" strokeWidth={2.5} />}
                    </View>
                    <Text style={styles.title}>{mode ? 'Select Exercise' : 'Select Macro'}</Text>
                    <Text style={styles.subtitle}>{mode ? 'Choose which exercise to track' : 'Choose which macro to track'}</Text>
                </View>

                {/* Scrollable List */}
                <ScrollableList
                    data={data}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 25,
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
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
    },
})
