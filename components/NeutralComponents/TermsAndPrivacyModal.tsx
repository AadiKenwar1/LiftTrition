import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import TermsAndPrivacyContent from './TermsAndPrivacyContent'

type Props = {
    visible: boolean
    onClose: () => void
}

export default function TermsAndPrivacyModal({ visible, onClose }: Props) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Terms & Privacy</Text>
                    <Pressable onPress={onClose} style={styles.closeButton} hitSlop={16}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </Pressable>
                </View>
                <View style={styles.content}>
                    <TermsAndPrivacyContent />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    title: {
        fontSize: 20,
        color: '#FFF',
        fontFamily: 'Poppins_600SemiBold',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
})
