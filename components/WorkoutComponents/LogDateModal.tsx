import DatePicker from '@/components/NeutralComponents/DatePicker'
import { isDateAfterToday } from '@/lib/utils/dateHelper'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

type LogDateModalProps = {
    visible: boolean
    selectedDate: Date
    onConfirm: (date: Date) => void
    onClose: () => void
    onInvalidDate: () => void
}

export default function LogDateModal({ visible, selectedDate, onConfirm, onClose, onInvalidDate }: LogDateModalProps) {
    const [tempDate, setTempDate] = useState<Date>(selectedDate)

    useEffect(() => {
        if (!visible) return
        setTempDate(selectedDate)
    }, [visible, selectedDate])

    const handleDone = () => {
        if (isDateAfterToday(tempDate)) {
            onInvalidDate()
            return
        }
        onConfirm(tempDate)
    }

    // If the modal is closed while async state updates happen, avoid stale values.
    useEffect(() => {
        if (!visible) setTempDate(selectedDate)
    }, [visible, selectedDate])

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>
                <View style={styles.content}>
                    <Text style={styles.title}>Change Date</Text>
                    <Text style={styles.subtitle}>Logs will be added to the selected date</Text>
                    <DatePicker selectedDate={tempDate} onDateChange={setTempDate} color="#2f80ed" />
                    <TouchableOpacity onPress={handleDone} activeOpacity={0.8} style={styles.confirmTouchable}>
                        <LinearGradient colors={['#1A7AD4', '#2f80ed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmButton}>
                            <Text style={styles.confirmText}>Done</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(63, 63, 63, 0.85)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    content: {
        backgroundColor: '#121212',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 24,
        paddingBottom: 48,
        paddingTop: 16,
        maxHeight: '70%',
    },
    title: {
        fontSize: 24,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        fontFamily: 'Poppins_400Regular',
        marginBottom: 16,
        textAlign: 'center',
    },
    confirmTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 16,
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    confirmButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmText: {
        fontSize: 17,
        color: '#FFF',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
})
