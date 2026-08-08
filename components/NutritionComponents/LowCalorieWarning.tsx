import { belowCalorieMinimum, LOW_CALORIE_THRESHOLDS } from '@/context/SettingsContext/functions/macroCalculation'
import type { Settings } from '@/context/SettingsContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { TriangleAlert } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

/**
 * The app's only calorie-adequacy warning: the target sits under this body's daily minimum
 * (LOW_CALORIE_THRESHOLDS). Advisory by design — nothing clamps to the line any more, so the number
 * beside this card is the honest one and Next stays enabled. Renders null when the plan is fine, so
 * callers mount it unconditionally rather than repeating the predicate.
 *
 * One tier, one tone. There is no second, harsher threshold to escalate to, so the card is always
 * amber; a red variant would imply a severity the app no longer distinguishes.
 *
 * The copy names no control, because the same card appears under a pace slider and beside a
 * hand-editable calorie card.
 */
type Props = {
    calories: number
    gender: Settings['gender']
    align?: 'left' | 'center'
    style?: StyleProp<ViewStyle>
}

export default function LowCalorieWarning({ calories, gender, align = 'left', style }: Props) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    if (!belowCalorieMinimum(calories, gender)) return null

    const tone = colors.warning
    const centered = align === 'center'
    return (
        <View style={[styles.card, { backgroundColor: tone + '1F', borderColor: tone + '4D' }, style]}>
            <View style={[styles.head, centered && styles.headCentered]}>
                <TriangleAlert size={16} color={tone} strokeWidth={2.6} />
                <Text style={[styles.title, { color: tone }, centered && styles.centeredText]}>Under {LOW_CALORIE_THRESHOLDS[gender].toLocaleString()} kcal a day</Text>
            </View>
            <Text style={[styles.body, centered && styles.centeredText]}>Below the commonly recommended daily minimum for {gender === 'female' ? 'women' : 'men'}. Eating here for an extended stretch is worth discussing with a healthcare provider.</Text>
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
