import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Calendar } from 'lucide-react-native'
import { useMemo } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface RangeSelectionModalProps {
    visible: boolean
    onClose: () => void
    selectedRange: 7 | 14 | 21
    onSelectRange: (range: 7 | 14 | 21) => void
    mode: boolean
    rangeUnit: 'Lifts' | 'Days'
}

export default function RangeSelectionModal({ visible, onClose, selectedRange, onSelectRange, mode, rangeUnit }: RangeSelectionModalProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = mode ? colors.workout : colors.nutrition
    const ranges: Array<7 | 14 | 21> = [7, 14, 21]

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} transparent={false}>
            <View style={styles.container}>
                {/* Drag Handle */}
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                {/* Header Section */}
                <View style={styles.header}>
                    <View style={[styles.iconCircle, { backgroundColor: accent + '1A' }]}>
                        <Calendar size={32} color={accent} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.title}>Select Time Range</Text>
                    <Text style={styles.subtitle}>Choose how much data to display</Text>
                </View>

                {/* Options (pills) */}
                <View style={styles.optionsContainer}>
                    {ranges.map((range) => {
                        const selected = selectedRange === range
                        return (
                            <TouchableOpacity
                                key={range}
                                style={[styles.pill, selected ? { backgroundColor: accent } : { backgroundColor: colors.surfaceInset, borderColor: colors.hairline, borderWidth: StyleSheet.hairlineWidth }]}
                                onPress={() => {
                                    onSelectRange(range)
                                    onClose()
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.pillText, { color: selected ? '#fff' : colors.textSecondary }]}>
                                    Last {range} {rangeUnit}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}
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
        handleContainer: {
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 8,
        },
        handle: {
            width: 40,
            height: 5,
            backgroundColor: colors.ringTrack,
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
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
        },
        title: {
            fontSize: 24,
            fontFamily: fonts.extrabold,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
            letterSpacing: -0.4,
        },
        subtitle: {
            fontSize: 15,
            fontFamily: fonts.regular,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        optionsContainer: {
            paddingHorizontal: 24,
            gap: 12,
        },
        pill: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
            borderRadius: radius.chip,
        },
        pillText: {
            fontSize: 16,
            fontFamily: fonts.bold,
            letterSpacing: -0.3,
        },
    })
}
