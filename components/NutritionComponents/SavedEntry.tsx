import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Plus, Trash2 } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface SavedEntryProps {
    name: string
    calories: number
    protein: number
    carbs: number
    fats: number
    onAddPress: () => void
    onDeletePress: () => void
}

export default function SavedEntry({ name, calories, protein, carbs, fats, onAddPress, onDeletePress }: SavedEntryProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.wrapper}>
            <View style={styles.accentBar} />
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.name} numberOfLines={7}>
                        {name}
                    </Text>
                    <View style={styles.macrosGrid}>
                        {/* Calories - Full Width */}
                        <View style={styles.caloriesRow}>
                            <Text style={styles.caloriesValue}>{calories}</Text>
                            <Text style={styles.caloriesLabel}>calories</Text>
                        </View>

                        {/* Macros Row */}
                        <View style={styles.macrosRow}>
                            <View style={styles.macroBox}>
                                <Text style={styles.macroValue}>{fats}g</Text>
                                <Text style={styles.macroLabel}>Fats</Text>
                            </View>
                            <View style={styles.macroDivider} />
                            <View style={styles.macroBox}>
                                <Text style={styles.macroValue}>{carbs}g</Text>
                                <Text style={styles.macroLabel}>Carbs</Text>
                            </View>
                            <View style={styles.macroDivider} />
                            <View style={styles.macroBox}>
                                <Text style={styles.macroValue}>{protein}g</Text>
                                <Text style={styles.macroLabel}>Protein</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stacked Action Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.iconButton} onPress={onAddPress} activeOpacity={0.5}>
                        <View style={styles.iconCircle}>
                            <Plus size={18 * 1.4} color={colors.nutrition} strokeWidth={2.5} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconButton} onPress={onDeletePress} activeOpacity={0.5}>
                        <View style={styles.icon2Circle}>
                            <Trash2 size={18} color={colors.destructive} strokeWidth={2.5} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        wrapper: {
            flexDirection: 'row',
            marginVertical: 6,
            marginHorizontal: 0,
            borderRadius: radius.card,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        accentBar: {
            width: 4,
            backgroundColor: colors.nutrition,
        },
        container: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 14,
        },
        content: {
            flex: 1,
            marginRight: 10,
        },
        name: {
            fontSize: 16,
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 8,
            fontFamily: fonts.semibold,
        },
        macrosGrid: {
            gap: 6,
        },
        caloriesRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 5,
            marginBottom: 6,
        },
        caloriesValue: {
            fontSize: 20,
            color: colors.nutritionInk,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        caloriesLabel: {
            fontSize: 12,
            color: colors.textMuted,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        macrosRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceInset,
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        macroBox: {
            flex: 1,
            alignItems: 'center',
        },
        macroValue: {
            fontSize: 14,
            color: colors.text,
            letterSpacing: -0.5,
            marginBottom: 2,
            fontFamily: fonts.semibold,
        },
        macroLabel: {
            fontSize: 10,
            color: colors.labelMuted,
            letterSpacing: -0.5,
            textTransform: 'uppercase',
            fontFamily: fonts.semibold,
        },
        macroDivider: {
            width: 1,
            height: 24,
            backgroundColor: colors.hairline,
            marginHorizontal: 3,
        },
        actionsContainer: {
            flexDirection: 'column',
            gap: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        iconButton: {
            padding: 2,
        },
        iconCircle: {
            width: 36 * 1.5,
            height: 36 * 1.5,
            borderRadius: 18 * 1.5,
            backgroundColor: colors.nutrition + '22',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.nutrition,
        },
        icon2Circle: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.destructive + '1F',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.destructive,
        },
        deleteIconCircle: {
            backgroundColor: colors.destructive + '1F',
            borderColor: colors.destructive,
        },
    })
}
