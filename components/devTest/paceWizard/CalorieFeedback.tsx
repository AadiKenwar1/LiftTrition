import { CARB_WARNING_G } from '@/components/devTest/paceWizard/devMacroMath'
import type { Settings } from '@/context/SettingsContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { TriangleAlert } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

/**
 * The wizard's calorie warnings, prototyped for the paceWizard copies. Three things can be worth saying:
 * the number is under this body's own nutrition floor (protein and fat no longer fit — only a hand-edit
 * reaches that), the day's carbohydrate sits under the 130 g line (routine on a cut near the cap, which
 * runs keto-low on purpose), or the number points the wrong way for the goal and so has no date to
 * project. Loud but never blocking: an alert card with an icon and a bold headline. Renders nothing when
 * the plan is fine, so callers mount it unconditionally.
 *
 * The shipped adequacy line (LOW_CALORIE_THRESHOLDS, 1,500 / 1,200) is NOT one of these rows — it has its
 * own shipped component, components/NutritionComponents/LowCalorieWarning.tsx. This card only speaks to
 * the dev prototype's own per-body arithmetic, so the two never say the same thing twice.
 */
type Props = {
    calories: number
    maintenance: number
    goalType: Settings['goalType']
    /** This body's protein + fat cost — devFloorCalories at the caller's basis weight. */
    floorCalories: number
    /** The day's carb grams, when the caller has them; drives the 130 g warning. */
    carbGrams?: number
    align?: 'left' | 'center'
    style?: StyleProp<ViewStyle>
}

export default function CalorieFeedback({ calories, maintenance, goalType, floorCalories, carbGrams, align = 'left', style }: Props) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    const maintenanceLabel = Math.round(maintenance).toLocaleString()
    const rows: { title: string; body: string }[] = []

    if (calories < floorCalories) {
        rows.push({
            title: `Under your ≈ ${floorCalories.toLocaleString()} kcal floor`,
            body: `At this number your protein and fat alone no longer fit in the day — the plan can't be followed as written.`,
        })
    }

    // The carb line yields to the floor row — a day whose macros don't fit doesn't also need its carbs
    // itemized. A computed cut near the cap lands here on purpose, keto-low by design.
    if (carbGrams != null && carbGrams < CARB_WARNING_G && calories >= floorCalories) {
        rows.push({
            title: `Under ${CARB_WARNING_G} g of carbs a day`,
            body: `Below the commonly recommended daily carbohydrate. Fine for a hard, keto-style cut — expect lower training energy while you're here.`,
        })
    }

    if (goalType === 'lose' ? calories >= maintenance : goalType === 'gain' ? calories <= maintenance : false) {
        rows.push({
            title: `You won't ${goalType === 'gain' ? 'gain' : 'lose'} weight at these calories`,
            body: `This target is at or ${goalType === 'gain' ? 'below' : 'above'} your ≈ ${maintenanceLabel} kcal maintenance, so there is no ${goalType === 'gain' ? 'surplus' : 'deficit'} to project a date from.`,
        })
    }

    if (rows.length === 0) return null

    // An impossible plan is the only red tier; the advisory rows stay amber so the escalation reads.
    const tone = calories < floorCalories ? colors.destructive : colors.warning
    const centered = align === 'center'
    return (
        <View style={[styles.card, { backgroundColor: tone + '1F', borderColor: tone + '4D' }, style]}>
            {rows.map((row, i) => (
                <View key={row.title} style={i > 0 && styles.spaced}>
                    <View style={[styles.head, centered && styles.headCentered]}>
                        <TriangleAlert size={16} color={tone} strokeWidth={2.6} />
                        <Text style={[styles.title, { color: tone }, centered && styles.centeredText]}>{row.title}</Text>
                    </View>
                    <Text style={[styles.body, centered && styles.centeredText]}>{row.body}</Text>
                </View>
            ))}
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        card: {
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            paddingVertical: 12,
            paddingHorizontal: 14,
        },
        spaced: {
            marginTop: 12,
        },
        head: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
        },
        headCentered: {
            justifyContent: 'center',
        },
        title: {
            flexShrink: 1,
            fontFamily: fonts.bold,
            fontSize: 14,
            letterSpacing: -0.2,
        },
        body: {
            fontFamily: fonts.medium,
            fontSize: 12.5,
            color: colors.textSecondary,
            lineHeight: 18,
            marginTop: 4,
        },
        centeredText: {
            textAlign: 'center',
        },
    })
}
