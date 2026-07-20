import Entry from '@/components/NutritionComponents/Entry'
import { fonts, useColorScheme, useColors, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { confirmDelete } from '@/lib/utils/confirmDelete'
import { useMemo, useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Dev-only preview for Issue C4: the nutrition-entry row Options menu now routes Delete
 * through confirmDelete instead of destroying the entry on a single tap. Mirrors the real
 * `handleEdit` Options Alert in app/nutritionScreens/nutritionScreen.tsx and calls the real
 * confirmDelete helper; the running count verifies Cancel keeps a row and Delete removes it.
 */
type MockEntry = { id: string; name: string; calories: number; protein: number; carbs: number; fats: number }

const POOL: Omit<MockEntry, 'id'>[] = [
    { name: 'Grilled Chicken & Rice', calories: 620, protein: 52, carbs: 68, fats: 14 },
    { name: 'Greek Yogurt with Berries', calories: 180, protein: 18, carbs: 22, fats: 3 },
    { name: 'Protein Shake', calories: 240, protein: 30, carbs: 12, fats: 6 },
    { name: 'Avocado Toast', calories: 320, protein: 9, carbs: 34, fats: 18 },
    { name: 'Salmon & Asparagus', calories: 540, protein: 44, carbs: 8, fats: 34 },
    { name: 'Peanut Butter Banana Oatmeal Breakfast Bowl', calories: 480, protein: 16, carbs: 62, fats: 18 },
]

// Build N mock entry rows, cycling the pool so ids stay unique past its length.
function makeEntries(n: number): MockEntry[] {
    return Array.from({ length: n }, (_, i) => ({ id: `entry-${i}`, ...POOL[i % POOL.length] }))
}

export default function NutritionEntryMenuTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [count, setCount] = useState<number>(6)
    const [entries, setEntries] = useState<MockEntry[]>(() => makeEntries(6))

    const reset = (n: number) => { setCount(n); setEntries(makeEntries(n)) }

    // Mirrors nutritionScreen's Options Alert: Delete goes through confirmDelete, never a bare delete.
    function handleEdit(entry: MockEntry) {
        Alert.alert(`Options for Nutrition Entry: ${entry.name}`, ``, [
            { text: 'Edit', style: 'default', onPress: () => {} },
            { text: 'Save', style: 'default', onPress: () => {} },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => confirmDelete({ title: `Delete ${entry.name}?`, message: 'This nutrition entry will be permanently removed. This cannot be undone.', onConfirm: () => setEntries((prev) => prev.filter((e) => e.id !== entry.id)) }),
            },
            { text: 'Cancel', style: 'cancel' },
        ])
    }

    return (
        <View style={styles.screen}>
            <View style={styles.controls}>
                <Field label="Theme">
                    <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
                </Field>
                <Field label="Reset with N rows">
                    <Segmented value={count} onChange={reset} options={[{ label: '3', value: 3 }, { label: '6', value: 6 }, { label: '12', value: 12 }]} />
                </Field>
                <Text style={styles.hint}>Tap the pencil on a row → Delete → a confirm dialog now appears (Issue C4). Cancel keeps the row, Delete removes it. {entries.length} left.</Text>
            </View>
            <View style={styles.listCard}>
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <Entry name={item.name} calories={item.calories} protein={item.protein} carbs={item.carbs} fats={item.fats} onEditPress={() => handleEdit(item)} />}
                    ListEmptyComponent={<Text style={styles.hint}>No entries left — reset above.</Text>}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        controls: { padding: 16 },
        hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.labelMuted, marginTop: 4, paddingHorizontal: 16 },
        listCard: { flex: 1 },
        listContent: { paddingTop: 8, paddingBottom: 40 },
    })
}
