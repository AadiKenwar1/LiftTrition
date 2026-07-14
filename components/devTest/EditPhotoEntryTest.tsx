import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Menu of editPhotoEntry redesign candidates (AUDIT issue 12). Each row opens a
 * full-screen sheet variant seeded with the chosen scenario. Every variant bakes
 * in the issue-12 fixes (draft-string editing, decimal-pad, quantity ?? 1), so the
 * "Edge cases" scenario also demonstrates the 0-serving and decimal behavior.
 */
type VariantItem = { key: string; label: string; description: string }

const VARIANTS: VariantItem[] = [
    { key: 'ledger', label: '1 · Ledger', description: 'Flat receipt-style rows — name + inline serving stepper + a compact P/C/F/Cal strip per line, running meal total pinned at the bottom. Everything editable at once.' },
    { key: 'accordion', label: '2 · Accordion', description: 'Collapsed list showing name · servings · calories; tap to expand one ingredient into full macro editing. Scales cleanly to many ingredients.' },
    { key: 'tiles', label: '3 · Tiles', description: '2×2 big-numeral macro tiles per ingredient with an inline stepper and a gradient meal-total card. Rich editing, no redundant per-item totals grid.' },
    { key: 'inset', label: '4 · Inset panel', description: "Based on the Add Nutrition modal — a calorie hero row + P/C/F cells grouped in one inset panel per ingredient. No top icon; left-aligned header. Meal total mirrors the same panel." },
    { key: 'insetStrip', label: '4b · Inset strip', description: 'Inset DNA compressed to a single band — Cal (accented, wider) + P/C/F in one horizontal strip, servings stepper inline in the header. Roughly half the height of 4.' },
    { key: 'insetHeader', label: '4c · Calorie in header', description: 'Calories move up beside the name as an editable badge; P/C/F + the servings stepper share one inset band below. Shortest single-band card.' },
    { key: 'insetSplit', label: '4d · Two-column split', description: 'Name + servings on the left, a 2×2 Cal/P/C/F macro grid on the right — trades vertical height for horizontal width. Most compact for long lists.' },
    { key: 'insetSplitRow', label: '4e · Stacked — stepper servings', description: 'Stacked title / servings / macro strip (units under each value). Servings as a −/＋ stepper. Baseline for the servings comparisons below.' },
    { key: 'servChips', label: '4e-i · Servings: quick chips', description: 'Servings as tappable preset chips (0.5 / 1 / 1.5 / 2 / 3) plus a custom field — fastest for the common serving sizes.' },
    { key: 'servPill', label: '4e-ii · Servings: pill', description: 'A single rounded −/＋ pill with the value and the word “servings” inside it, left-aligned.' },
    { key: 'servField', label: '4e-iii · Servings: plain field', description: 'Minimal — “Servings” label + a bordered decimal field, no steppers. Type the number directly.' },
]

export default function EditPhotoEntryTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [scenario, setScenario] = useState<'default' | 'many' | 'edge'>('default')

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented
                    value={isDark ? 'dark' : 'light'}
                    onChange={(v) => setColorScheme(v as 'light' | 'dark')}
                    options={[
                        { label: 'Light', value: 'light' },
                        { label: 'Dark', value: 'dark' },
                    ]}
                />
            </Field>
            <Field label="Scenario">
                <Segmented
                    value={scenario}
                    onChange={setScenario}
                    options={[
                        { label: 'Default (4)', value: 'default' },
                        { label: 'Many (8)', value: 'many' },
                        { label: 'Edge cases', value: 'edge' },
                    ]}
                />
            </Field>

            <Text style={styles.hint}>“Edge cases” includes a 0-serving item (excluded from totals), a 0.5 serving, and a very long name.</Text>

            {VARIANTS.map((v) => (
                <TouchableOpacity key={v.key} style={styles.row} activeOpacity={0.6} onPress={() => router.push(`/devTest/editPhotoVariant?variant=${v.key}&scenario=${scenario}` as never)}>
                    <View style={styles.rowText}>
                        <Text style={styles.rowLabel}>{v.label}</Text>
                        <Text style={styles.rowDescription}>{v.description}</Text>
                    </View>
                    <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
                </TouchableOpacity>
            ))}
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        hint: { fontSize: 12, color: colors.textMuted, marginBottom: 16, marginLeft: 2, lineHeight: 16, fontFamily: fonts.regular },
        row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        rowText: { flex: 1 },
        rowLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 2 },
        rowDescription: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
    })
}
