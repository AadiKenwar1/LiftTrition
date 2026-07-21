import StagedSection from '@/components/NeutralComponents/StagedSection'
import { entrySubtitle, foodItemToItem, resolveCombinedName } from '@/context/NutritionContext/functions/entryBuilders'
import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import type { FoodItem } from '@/lib/foodDB/types'
import { useCombineName } from '@/context/NutritionContext/hooks/useCombineName'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Combine-UI harness: StagedSection with the combined-name field, driven by the
 * real useCombineName hook. Verifies: pre-fill from joined names, edits stick,
 * clear → "Combined Items" fallback, per-item brands visible, 2 vs many items.
 */
const TWO: (FoodItem & { quantity: number })[] = [
    { id: '1', name: 'Greek Yogurt', brand: 'Fage', calories: 220, protein: 22.8, carbs: 13.6, fats: 8.5, quantity: 1 },
    { id: '2', name: 'Oats', brand: null, calories: 145, protein: 6.1, carbs: 25.4, fats: 2.4, quantity: 2 },
]
const MANY: (FoodItem & { quantity: number })[] = [
    ...TWO,
    { id: '3', name: 'Natural Creamy Peanut Butter Spread', brand: 'Skippy', calories: 190, protein: 7, carbs: 7, fats: 16, quantity: 1 },
    { id: '4', name: 'Bananas', brand: null, calories: 105, protein: 1.3, carbs: 27, fats: 0.4, quantity: 1 },
    { id: '5', name: 'Whole Milk', brand: 'Horizon Organic', calories: 146, protein: 7.9, carbs: 11, fats: 7.9, quantity: 1 },
]

export default function CombineTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [scenario, setScenario] = useState<'two' | 'many'>('two')
    const [combineItems, setCombineItems] = useState(true)

    const staged = scenario === 'two' ? TWO : MANY
    const stagedNames = useMemo(() => staged.map((i) => ({ name: i.name, quantity: i.quantity })), [staged])
    const [combineName, onCombineNameChange] = useCombineName(combineItems, stagedNames)
    const items = staged.map((i) => foodItemToItem(i, i.quantity))

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            <Field label="Staged items">
                <Segmented value={scenario} onChange={setScenario} options={[{ label: '2 items', value: 'two' }, { label: '5 items', value: 'many' }]} />
            </Field>

            <StagedSection label="Added" count={staged.length} color={colors.nutrition} combineItems={combineItems} onCombineItemsChange={setCombineItems} combineName={combineName} onCombineNameChange={onCombineNameChange}>
                {staged.map((i) => (
                    <View key={i.id} style={styles.row}>
                        <Text style={styles.rowName}>
                            {i.name}
                            {i.quantity > 1 ? <Text style={styles.rowQty}> ×{i.quantity}</Text> : ''}
                        </Text>
                        {i.brand ? <Text style={styles.rowBrand}>{i.brand}</Text> : null}
                    </View>
                ))}
            </StagedSection>

            <Text style={styles.caption}>Entry that would be written on Add:</Text>
            <Text style={styles.result}>name: “{combineItems ? resolveCombinedName(combineName) : '(separate entries)'}”</Text>
            <Text style={styles.result}>subtitle: “{entrySubtitle(items) ?? '—'}”</Text>
            <Text style={styles.result}>items: {items.map((i) => `${i.name}${i.brand ? ` (${i.brand})` : ''} ×${i.quantity}`).join(', ')}</Text>
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        row: { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginTop: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        rowName: { fontSize: 14, color: colors.text, fontFamily: fonts.semibold, letterSpacing: -0.3 },
        rowQty: { color: colors.nutrition, fontFamily: fonts.regular },
        rowBrand: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontStyle: 'italic', fontFamily: fonts.regular },
        caption: { fontSize: 12, color: colors.labelMuted, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 20, marginBottom: 6 },
        result: { fontSize: 13, color: colors.text, fontFamily: fonts.regular, marginBottom: 4, lineHeight: 19 },
    })
}
