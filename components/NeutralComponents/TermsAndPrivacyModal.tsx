import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import TermsAndPrivacyContent from './TermsAndPrivacyContent'

type Props = {
    visible: boolean
    onClose: () => void
}

export default function TermsAndPrivacyModal({ visible, onClose }: Props) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Terms & Privacy</Text>
                    <Pressable onPress={onClose} style={styles.closeButton} hitSlop={16}>
                        <Ionicons name="close" size={28} color={colors.text} />
                    </Pressable>
                </View>
                <View style={styles.content}>
                    <TermsAndPrivacyContent />
                </View>
            </View>
        </Modal>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 60,
            paddingBottom: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.hairline,
        },
        title: {
            fontSize: 20,
            color: colors.text,
            fontFamily: fonts.semibold,
        },
        closeButton: {
            padding: 4,
        },
        content: {
            flex: 1,
        },
    })
}
