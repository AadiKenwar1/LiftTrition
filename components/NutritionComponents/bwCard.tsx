import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { useRouter } from 'expo-router'
import { Pencil } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface CardProps {
    height?: number
}

export default function BwCard({ height = 120 }: CardProps) {
    const { settings } = useSettings()
    const router = useRouter()
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])

    // Format weight to 1 decimal place
    const formatWeight = (weight: number) => {
        return weight > 0 ? weight.toFixed(1) : '--'
    }

    const handleEditPress = () => {
        router.push('/nutritionScreens/updateBWModal')
    }

    return (
        <View style={styles.outerwrapper}>
            <View style={[styles.wrapper, { height }]}>
                <View style={styles.accentBar} />
                <View style={styles.content}>
                    <View style={styles.innerContainer}>
                        {/* Current Weight Display */}
                        <View style={styles.mainSection}>
                            <View style={styles.valueRow}>
                                <Text style={styles.mainValue}>{formatWeight(settings.bodyWeight)}</Text>
                                <Text style={styles.mainUnit}>{weightUnitLabel(settings.unitSystem)}</Text>
                            </View>
                            <Text style={styles.goalText}>
                                Goal: {formatWeight(settings.goalWeight)} {weightUnitLabel(settings.unitSystem)} {settings.bodyWeight == settings.goalWeight ? '🎉' : ''}
                            </Text>
                            <Text style={styles.hintText}>(Tap pencil to update)</Text>
                        </View>
                    </View>

                    {/* Edit Button - Positioned Absolute */}
                    <TouchableOpacity style={styles.editButton} onPress={handleEditPress} activeOpacity={0.5}>
                        <Pencil size={18} color={colors.nutrition} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors, isDark: boolean) {
    return StyleSheet.create({
        outerwrapper:
            isDark ?
                {}
            :   {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                },
        wrapper: {
            marginVertical: 8,
            borderRadius: radius.card,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        accentBar: {
            height: 3,
            backgroundColor: colors.nutrition,
        },

        content: {
            flex: 1,
            paddingHorizontal: 20,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
        },
        innerContainer: {
            flex: 1,
            justifyContent: 'space-between',
        },
        headerRow: {
            marginBottom: 0,
        },
        headerTitle: {
            fontSize: 14,
            color: colors.nutrition,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        hintText: {
            fontSize: 12,
            color: colors.textMuted,
            letterSpacing: 0.2,
            marginTop: 2,
            fontFamily: fonts.medium,
        },
        mainSection: {
            gap: 4,
            marginTop: 2,
        },
        valueRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 4,
        },
        mainValue: {
            fontSize: 32,
            color: colors.text,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        mainUnit: {
            fontSize: 16,
            color: colors.textMuted,
            marginBottom: 2,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        goalText: {
            fontSize: 13,
            color: colors.textMuted,
            letterSpacing: 0.2,
            fontFamily: fonts.medium,
        },
        editButton: {
            width: 36,
            height: 36,
            borderRadius: radius.iconButton,
            backgroundColor: colors.nutrition + '22',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.nutrition + '66',
            marginLeft: 12,
        },
    })
}
