import { goalReachedBannerCopy } from '@/context/SettingsContext/functions/bodyWeightFunctions'
import type { Settings } from '@/context/SettingsContext/types'
import { fonts, radius, useColors, useColorScheme, type Colors } from '@/context/ThemeContext'
import { ChevronRight, Trophy } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'

/**
 * Persistent "goal reached" nudge (Issue 8). Pure derived state — render while goalType is
 * lose/gain AND bodyWeight is at/past goalWeight; it disappears on its own once a new goal is
 * set. Copy tracks the scale: past the display band it names the distance past goal. Same
 * visual language as ActivityBanner (tinted pill, accent icon, bold label), but tappable:
 * onPress routes to the adjustNutrition wizard.
 */
export default function GoalReachedBanner({ state, onPress }: { state: Pick<Settings, 'goalType' | 'bodyWeight' | 'goalWeight' | 'unitSystem'>; onPress: () => void }) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = colors.nutrition
    const fill = accent + (isDark ? '1A' : '29')

    return (
        <TouchableOpacity style={[styles.banner, { backgroundColor: fill }]} onPress={onPress} activeOpacity={0.7}>
            <Trophy size={18} color={accent} strokeWidth={2.4} />
            <Text numberOfLines={1} style={styles.label}>
                {goalReachedBannerCopy(state)}
            </Text>
            <ChevronRight size={18} color={accent} strokeWidth={2.4} />
        </TouchableOpacity>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        banner: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderRadius: radius.card,
            paddingVertical: 9,
            paddingHorizontal: 12,
            marginBottom: 12,
        },
        label: {
            flex: 1,
            fontSize: 13.5,
            fontFamily: fonts.bold,
            color: colors.text,
            letterSpacing: -0.2,
        },
    })
}
