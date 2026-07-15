import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { Plus } from 'lucide-react-native'
import { useMemo } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface FoodRowProps {
    name: string
    brandName?: string
    servingSize?: string
    macros?: { calories: number; protein: number; carbs: number; fats: number }
    onAdd: () => void
    added?: boolean
    loading?: boolean
}

export default function FoodRow({ name, brandName, servingSize, macros, onAdd, added, loading }: FoodRowProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const disabled = added || loading

    return (
        <View style={styles.foodItem}>
            <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{name}</Text>
                {brandName && <Text style={styles.brandName}>{brandName}</Text>}
                {servingSize && <Text style={styles.servingSize}>{servingSize}</Text>}
                {macros && (
                    <View style={styles.macroRow}>
                        <View style={styles.macroPill}>
                            <Text style={styles.macroPillText}>{Math.round(macros.calories)} cal</Text>
                        </View>
                        <View style={styles.macroPill}>
                            <Text style={styles.macroPillText}>{Math.round(macros.fats * 10) / 10}g F</Text>
                        </View>
                        <View style={styles.macroPill}>
                            <Text style={styles.macroPillText}>{Math.round(macros.carbs * 10) / 10}g C</Text>
                        </View>
                        <View style={styles.macroPill}>
                            <Text style={styles.macroPillText}>{Math.round(macros.protein * 10) / 10}g P</Text>
                        </View>
                    </View>
                )}
            </View>
            <TouchableOpacity style={[styles.addButton, disabled && styles.addButtonDisabled]} onPress={onAdd} activeOpacity={0.5} disabled={disabled}>
                {loading ?
                    <ActivityIndicator size="small" color={colors.placeholder} />
                :   <Plus size={18} color={added ? colors.placeholder : colors.nutrition} strokeWidth={2.5} />}
            </TouchableOpacity>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        foodItem: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 14,
            marginBottom: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        foodInfo: {
            flex: 1,
            marginRight: 12,
        },
        foodName: {
            fontSize: 15,
            color: colors.text,
            marginBottom: 4,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        brandName: {
            fontSize: 12,
            color: colors.textMuted,
            marginTop: 2,
            fontStyle: 'italic',
        },
        servingSize: {
            fontSize: 12,
            color: colors.textMuted,
            marginTop: 2,
        },
        macroRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 5,
            marginTop: 6,
        },
        macroPill: {
            backgroundColor: colors.surfaceInset,
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
        },
        macroPillText: {
            fontSize: 11,
            color: colors.textMuted,
            fontFamily: fonts.medium,
        },
        addButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.nutrition + '22',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.nutrition + '66',
        },
        addButtonDisabled: {
            backgroundColor: colors.textMuted + '1F',
            borderColor: colors.textMuted + '40',
        },
    })
}
