import { Calendar } from 'lucide-react-native'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface RangeSelectionModalProps {
    visible: boolean
    onClose: () => void
    selectedRange: 7 | 14 | 21
    onSelectRange: (range: 7 | 14 | 21) => void
    mode: boolean
}

export default function RangeSelectionModal({ visible, onClose, selectedRange, onSelectRange, mode }: RangeSelectionModalProps) {
    const ranges: Array<7 | 14 | 21> = [7, 14, 21]
    const unit = mode ? 'Lifts' : 'Days'

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
                        <Calendar size={32} color={mode ? '#2f80ed' : '#34C759'} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.title}>Select Time Range</Text>
                    <Text style={styles.subtitle}>Choose how much data to display</Text>
                </View>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    {ranges.map((range) => (
                        <TouchableOpacity
                            key={range}
                            style={[styles.optionButton, selectedRange === range && styles.optionButtonSelected, selectedRange === range && { borderColor: mode ? '#2f80ed' : '#34C759' }]}
                            onPress={() => {
                                onSelectRange(range)
                                onClose()
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.optionText, selectedRange === range && styles.optionTextSelected, selectedRange === range && { color: mode ? '#2f80ed' : '#34C759' }]}>
                                Last {range} {unit}
                            </Text>
                            {selectedRange === range && <View style={[styles.checkmark, { backgroundColor: mode ? '#2f80ed' : '#34C759' }]} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
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
        paddingBottom: 24,
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
        color: '#888',
        textAlign: 'center',
    },
    optionsContainer: {
        paddingHorizontal: 24,
        gap: 12,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e1e1e',
        padding: 18,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#2a2a2a',
    },
    optionButtonSelected: {
        backgroundColor: 'rgba(45, 156, 255, 0.1)',
    },
    optionText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
    },
    optionTextSelected: {
        color: '#2f80ed',
    },
    checkmark: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
})
