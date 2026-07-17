import FoodRow from '@/components/NutritionComponents/FoodRow'
import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { parseFoodDescription } from '@/lib/foodDB/parseFoodDescription'
import type { FoodSearchResult } from '@/lib/foodDB/types'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/** Search-row preview scenarios run through the REAL parser + FoodRow. */
const CASES: { label: string; result: FoodSearchResult }[] = [
    { label: 'Brand + macros', result: { description: 'Greek Yogurt', fdcId: '1', brandName: 'Fage', foodDescription: 'Per 100g - Calories: 97kcal | Fat: 5.00g | Carbs: 3.00g | Protein: 9.00g' } },
    { label: 'No brand', result: { description: 'Egg', fdcId: '2', foodDescription: 'Per 1 large - Calories: 74kcal | Fat: 4.97g | Carbs: 0.38g | Protein: 6.29g' } },
    { label: 'Long name', result: { description: 'Natural Creamy Peanut Butter Spread With Honey Roasted Nuts', fdcId: '3', brandName: 'Skippy Natural Brand Company', foodDescription: 'Per 2 tbsp - Calories: 190kcal | Fat: 16.00g | Carbs: 7.00g | Protein: 7.00g' } },
    { label: 'Malformed description (no preview)', result: { description: 'Chicken Breast', fdcId: '4', foodDescription: 'Grilled, boneless' } },
    { label: 'Missing description (old edge fn)', result: { description: 'White Rice', fdcId: '5' } },
]

export default function FoodRowTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            {CASES.map((c) => {
                const preview = parseFoodDescription(c.result.foodDescription)
                return (
                    <View key={c.result.fdcId}>
                        <Text style={styles.caption}>{c.label}</Text>
                        <FoodRow name={c.result.description} brandName={c.result.brandName} servingSize={preview?.basis} macros={preview ?? undefined} onAdd={() => {}} />
                    </View>
                )
            })}
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        caption: { fontSize: 12, color: colors.labelMuted, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 18, marginBottom: 6, marginLeft: 2 },
    })
}
