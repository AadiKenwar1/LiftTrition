import { useAuth } from '@/context/AuthContext'
import { editEntryHref } from '@/context/NutritionContext/functions/entryRouting'
import { Item, NutritionEntry } from '@/context/NutritionContext/types'
import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import uuid from 'react-native-uuid'
import { Field, Segmented } from './DevControls'

/**
 * Opens the REAL editEntry screen seeded with edge-case entries. Saving writes
 * a real entry to today's log (same precedent as the FoodDB prototype) — the
 * hint below reminds the reviewer; delete test entries from the log afterward.
 */
function mk(name: string, items: Item[], extra: Partial<NutritionEntry> = {}): Omit<NutritionEntry, 'id' | 'userId'> {
    const totals = items.reduce((t, i) => ({ protein: t.protein + i.protein * i.quantity, carbs: t.carbs + i.carbs * i.quantity, fats: t.fats + i.fats * i.quantity, calories: t.calories + i.calories * i.quantity }), { protein: 0, carbs: 0, fats: 0, calories: 0 })
    return { name, date: new Date(), time: Date.now(), ...totals, isPhoto: false, items, createdAt: new Date(), updatedAt: new Date(), ...extra }
}

const it = (name: string, brand: string | null, cal: number, p: number, c: number, f: number, quantity = 1): Item => ({ name, brand, quantity, protein: p, carbs: c, fats: f, calories: cal })

const SCENARIOS: { label: string; entry: Omit<NutritionEntry, 'id' | 'userId'> }[] = [
    { label: '1 item, with brand (name sync)', entry: mk('Greek Yogurt', [it('Greek Yogurt', 'Fage', 220, 22.8, 13.6, 8.5)]) },
    { label: '1 item, no brand', entry: mk('Egg', [it('Egg', null, 74, 6.3, 0.4, 5)]) },
    { label: 'Combined — 3 items, mixed brands', entry: mk('Greek Yogurt + Oats + Peanut Butter', [it('Greek Yogurt', 'Fage', 220, 22.8, 13.6, 8.5), it('Oats', null, 145, 6.1, 25.4, 2.4, 2), it('Peanut Butter', 'Skippy', 190, 7, 7, 16)]) },
    { label: 'Many items (6), long names', entry: mk('Big Meal', [it('Natural Creamy Peanut Butter Spread With Honey', 'Skippy Natural Brand Company', 190, 7, 7, 16), it('Whole Wheat Seed Bread', null, 142, 5.5, 24.5, 3.5, 2), it('Whole Milk', 'Horizon Organic', 146, 7.9, 11, 7.9), it('Bananas', null, 105, 1.3, 27, 0.4), it('Almonds', null, 7, 0.3, 0.2, 0.6, 10), it('Salmon', null, 41, 6.1, 0, 1.7, 3)]) },
    { label: 'Legacy manual entry (0 item rows)', entry: mk('Old Manual Meal', []) },
    { label: 'Photo entry', entry: mk('Chicken Bowl', [it('Chicken Breast', null, 195, 29.6, 0, 7.7), it('White Rice', null, 204, 4.2, 44.1, 0.4)], { isPhoto: true }) },
]

export default function EditEntryTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const { userID } = useAuth()
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    function open(entry: Omit<NutritionEntry, 'id' | 'userId'>) {
        router.push(editEntryHref({ ...entry, id: uuid.v4() as string, userId: userID }) as never)
    }

    // Push the editor with a deliberately corrupt entry param to exercise the JSON.parse guard (should back out cleanly, not crash).
    function openMalformed() {
        router.push({ pathname: '/nutritionScreens/editEntry', params: { entry: 'not-json' } } as never)
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            <Text style={styles.hint}>Also verify: clear the meal name and save (single item → item name; multi → “Unnamed Entry”); remove items down to the “at least one” guard; edit a brand; rapid double-tap “Save changes” → exactly one write + one pop. ⚠️ Save writes a REAL entry to today’s log — delete it afterward.</Text>
            {SCENARIOS.map((s) => (
                <TouchableOpacity key={s.label} style={styles.row} activeOpacity={0.6} onPress={() => open(s.entry)}>
                    <Text style={styles.rowLabel}>{s.label}</Text>
                    <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
                </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={openMalformed}>
                <Text style={styles.rowLabel}>Malformed entry param (corrupt JSON)</Text>
                <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
            </TouchableOpacity>
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        hint: { fontSize: 12, color: colors.textMuted, marginBottom: 16, marginLeft: 2, lineHeight: 16, fontFamily: fonts.regular },
        row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        rowLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
    })
}
