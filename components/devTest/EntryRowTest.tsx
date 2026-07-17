import Entry from '@/components/NutritionComponents/Entry'
import SavedEntry from '@/components/NutritionComponents/SavedEntry'
import { entrySubtitle } from '@/context/NutritionContext/functions/entryBuilders'
import { Item } from '@/context/NutritionContext/types'
import { fonts, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/** Collapsed-row scenarios: 1 item w/ brand, 1 item no brand, N items, legacy 0 items, long names. */
const it = (name: string, brand: string | null, quantity = 1): Item => ({ name, brand, quantity, protein: 10, carbs: 5, fats: 2, calories: 100 })

const CASES: { label: string; name: string; items: Item[] }[] = [
    { label: '1 item — brand subtitle', name: 'Greek Yogurt', items: [it('Greek Yogurt', 'Fage')] },
    { label: '1 item — no brand (no subtitle)', name: 'Egg', items: [it('Egg', null)] },
    { label: '3 items — "3 items"', name: 'Greek Yogurt + Oats + Peanut Butter', items: [it('Greek Yogurt', 'Fage'), it('Oats', null), it('Peanut Butter', 'Skippy')] },
    { label: 'Legacy — 0 item rows (no subtitle)', name: 'Old Manual Meal', items: [] },
    { label: 'Long names', name: 'Natural Creamy Peanut Butter Spread With Honey On Whole Wheat', items: [it('Natural Creamy Peanut Butter Spread With Honey', 'Skippy Natural Brand Company')] },
]

export default function EntryRowTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            {CASES.map((c) => (
                <View key={c.label}>
                    <Text style={styles.caption}>{c.label}</Text>
                    <Entry name={c.name} calories={520} protein={32} carbs={45} fats={18} subtitle={entrySubtitle(c.items)} onEditPress={() => {}} showBreakdown onBreakdownPress={() => {}} />
                    <View style={styles.savedWrap}>
                        <SavedEntry name={c.name} calories={520} protein={32} carbs={45} fats={18} subtitle={entrySubtitle(c.items)} onAddPress={() => {}} onDeletePress={() => {}} />
                    </View>
                </View>
            ))}
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        caption: { fontSize: 12, color: colors.labelMuted, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 18, marginBottom: 4, marginLeft: 2 },
        savedWrap: { marginHorizontal: 20 },
    })
}
