import type { Settings } from '@/context/SettingsContext/types'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useMemo } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

/**
 * What the pace under the thumb actually costs, shown live beneath both shipped pace sliders. The
 * calorie number alone is not decidable — 2,076 means nothing without knowing what it is 2,076
 * against — so the maintenance line is the point of the component, not decoration.
 *
 * Shared because app/onboardingScreens/pace.tsx and settingsScreens/adjustNutrition/adjustNutrition2
 * are near-copies of each other; a second inline version of this would drift from the first.
 *
 * Maintain never reaches either slider (both flows route it past pace), but the delta line is
 * rendered only for a real deficit or surplus, so a maintain caller degrades to the calorie line.
 */
type Props = {
    target: number
    maintenance: number
    goalType: Settings['goalType']
    style?: StyleProp<ViewStyle>
}

export default function PaceCalorieReadout({ target, maintenance, goalType, style }: Props) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const roundedMaintenance = Math.round(maintenance)
    const delta = Math.abs(roundedMaintenance - target)
    // Sub-1 kcal deltas round to "0 below your …", which reads as a bug rather than a tiny deficit.
    const showDelta = goalType !== 'maintain' && delta >= 1

    return (
        <View style={style}>
            <Text style={styles.kcal}>≈ {target.toLocaleString()} kcal a day</Text>
            {showDelta && (
                <Text style={styles.delta}>
                    {delta.toLocaleString()} {goalType === 'gain' ? 'above' : 'below'} your {roundedMaintenance.toLocaleString()} maintenance
                </Text>
            )}
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        kcal: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textSecondary, letterSpacing: -0.2, textAlign: 'center' },
        delta: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, letterSpacing: 0.2, textAlign: 'center', marginTop: 3 },
    })
}
