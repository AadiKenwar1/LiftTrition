import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { ChevronRight, Pencil, Sparkles } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface EntryProps {
    name: string
    calories: number
    protein: number
    carbs: number
    fats: number
    onEditPress?: () => void
    showBreakdown?: boolean
    onBreakdownPress?: () => void
    subtitle?: string | null
}

export default function Entry({ name, calories, protein, carbs, fats, onEditPress, showBreakdown, onBreakdownPress, subtitle }: EntryProps) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])

    return (
        <View style={styles.outerwrapper}>
            <View style={styles.wrapper}>
                <View style={styles.accentBar} />
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={styles.headerText}>
                            <Text style={styles.name} numberOfLines={7}>
                                {name}
                            </Text>
                            {subtitle ? (
                                <Text style={styles.subtitle} numberOfLines={1}>
                                    {subtitle}
                                </Text>
                            ) : null}
                            <View style={styles.caloriesRow}>
                                <Text style={styles.caloriesValue}>{calories}</Text>
                                <Text style={styles.caloriesLabel}>kcal</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.iconButton} onPress={onEditPress} activeOpacity={0.5}>
                            <View style={styles.iconCircle}>
                                <Pencil size={18} color={colors.nutrition} strokeWidth={2.5} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.macrosRow}>
                        <View style={styles.macroCell}>
                            <Text style={styles.macroValue}>{fats}g</Text>
                            <Text style={styles.macroLabel}>Fats</Text>
                        </View>
                        <View style={styles.macroCell}>
                            <Text style={styles.macroValue}>{carbs}g</Text>
                            <Text style={styles.macroLabel}>Carbs</Text>
                        </View>
                        <View style={styles.macroCell}>
                            <Text style={styles.macroValue}>{protein}g</Text>
                            <Text style={styles.macroLabel}>Protein</Text>
                        </View>
                    </View>

                    {showBreakdown && (
                        <TouchableOpacity style={styles.photoFooter} onPress={onBreakdownPress} activeOpacity={0.6}>
                            <Sparkles size={14} color={colors.nutrition} strokeWidth={2.5} />
                            <Text style={styles.photoFooterText}>Tap to see the breakdown</Text>
                            <ChevronRight size={14} color={colors.nutrition} strokeWidth={2.5} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors, isDark: boolean) {
    return StyleSheet.create({
        outerwrapper:
            isDark ?
                { marginHorizontal: 20, marginVertical: 6 }
            :   {
                    marginHorizontal: 20,
                    marginVertical: 6,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                },
        wrapper: {
            flexDirection: 'row',
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
            paddingVertical: 16,
            paddingHorizontal: 16,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        headerText: {
            flex: 1,
            marginRight: 10,
        },
        name: {
            fontSize: 17,
            color: colors.text,
            letterSpacing: -0.3,
            fontFamily: fonts.bold,
        },
        subtitle: {
            fontSize: 12,
            color: colors.textMuted,
            marginTop: 2,
            fontStyle: 'italic',
            fontFamily: fonts.regular,
        },
        caloriesRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 5,
            marginTop: 4,
        },
        caloriesValue: {
            fontSize: 20,
            color: colors.nutritionInk,
            letterSpacing: -0.3,
            fontFamily: fonts.extrabold,
        },
        caloriesLabel: {
            fontSize: 11,
            color: colors.labelMuted,
            fontFamily: fonts.medium,
        },
        iconButton: {
            padding: 2,
        },
        iconCircle: {
            width: 36,
            height: 36,
            borderRadius: radius.iconButton,
            backgroundColor: colors.nutrition + '22',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.nutrition + '66',
        },
        macrosRow: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 12,
        },
        macroCell: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: colors.surfaceInset,
            borderRadius: radius.macroCell,
            paddingVertical: 9,
        },
        macroValue: {
            fontSize: 15,
            color: colors.text,
            letterSpacing: -0.3,
            fontFamily: fonts.bold,
        },
        macroLabel: {
            fontSize: 11,
            color: colors.labelMuted,
            marginTop: 1,
            fontFamily: fonts.medium,
        },
        photoFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 14,
            marginHorizontal: -16,
            marginBottom: -16,
            paddingVertical: 11,
            paddingHorizontal: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.hairline,
            backgroundColor: colors.nutrition + '12',
        },
        photoFooterText: {
            fontSize: 12.5,
            color: colors.nutrition,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
    })
}
