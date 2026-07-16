import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Launcher for the Add Nutrition teaser preview (icon header + AI paywall gate).
 * The modal opens pristine via the ?tier= param — same launcher/variant pattern
 * as the Food DB teaser.
 */
export default function AddNutritionTeaserTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const [simTier, setSimTier] = useState<'free' | 'premium'>('free')

    return (
        <View style={styles.screen}>
            <View style={styles.content}>
                <Field label="Simulate">
                    <Segmented
                        value={simTier}
                        onChange={setSimTier}
                        options={[
                            { label: 'Free', value: 'free' },
                            { label: 'Premium', value: 'premium' },
                        ]}
                    />
                </Field>

                <TouchableOpacity style={styles.openRow} onPress={() => router.push(`/devTest/addNutritionTeaserVariant?tier=${simTier}` as never)} activeOpacity={0.6}>
                    <Text style={styles.openRowLabel}>Open Add Nutrition modal ({simTier})</Text>
                    <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 16,
        },
        openRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        openRowLabel: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.text,
        },
    })
}
