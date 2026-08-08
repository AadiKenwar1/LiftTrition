import { wontReachGoal } from '@/context/SettingsContext/functions/macroCalculation'
import type { Settings } from '@/context/SettingsContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { TriangleAlert } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

/**
 * The direction warning: the target sits at, past, or too near maintenance for the goal to move the scale
 * — at or above it on a cut, at or below it on a bulk, or (metric) close enough that the pace rounds to
 * 0.0 kg/week. Advisory like its sibling — the number stays as typed and Next stays enabled, because a
 * user may deliberately hold at maintenance for a while.
 *
 * It fires on exactly the plans whose projection has no date to show (both ask wontReachGoal, which asks
 * derivedPace), so this card is the explanation for the "—" the next screen renders.
 *
 * Renders null when the plan points the right way, so callers mount it unconditionally rather than
 * repeating the predicate. Amber, matching LowCalorieWarning: one advisory tier, no escalation.
 */
type Props = {
    calories: number
    maintenance: number
    goalType: Settings['goalType']
    unitSystem: Settings['unitSystem']
    align?: 'left' | 'center'
    style?: StyleProp<ViewStyle>
}

export default function WontReachGoalWarning({ calories, maintenance, goalType, unitSystem, align = 'left', style }: Props) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    if (!wontReachGoal(calories, maintenance, goalType, unitSystem)) return null

    const gaining = goalType === 'gain'
    const tone = colors.warning
    const centered = align === 'center'
    return (
        <View style={[styles.card, { backgroundColor: tone + '1F', borderColor: tone + '4D' }, style]}>
            <View style={[styles.head, centered && styles.headCentered]}>
                <TriangleAlert size={16} color={tone} strokeWidth={2.6} />
                <Text style={[styles.title, { color: tone }, centered && styles.centeredText]}>You won't {gaining ? 'gain' : 'lose'} weight at these calories</Text>
            </View>
            <Text style={[styles.body, centered && styles.centeredText]}>
                Against your ≈ {Math.round(maintenance).toLocaleString()} kcal maintenance this leaves no measurable {gaining ? 'surplus to grow on' : 'deficit to lose from'}, so there's no date to project.
            </Text>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 14 },
        head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
        headCentered: { justifyContent: 'center' },
        title: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, letterSpacing: -0.2 },
        body: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginTop: 4 },
        centeredText: { textAlign: 'center' },
    })
}
