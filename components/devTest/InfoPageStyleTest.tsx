import { fonts, spacing, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useMemo, useState, type ComponentType } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'
import { EXAMPLE_PERSON, VariantChapterCards, VariantGhostNumeral, VariantReceipt, VariantShipped, VariantTimeline } from './InfoPageStyleVariants'

/**
 * Design bench for the info-screen visual system (howNutritionIsCalculated / howGraphsWork).
 * Variant 0 composes the shipped NeutralComponents/InfoPage primitives, so every candidate is
 * judged against what ships today over identical nutrition-math content. Winner gets ported
 * into InfoPage.tsx — both production screens then pick it up with no content changes.
 */
const VARIANTS: { name: string; note: string; Comp: ComponentType }[] = [
    { name: '0 · Shipped — chapter cards', note: 'The production primitives: quiet surface per step, accent top bar, formula insets with citations.', Comp: VariantShipped },
    { name: '1 · Receipt ledger', note: 'Number-forward running tally with a heavy total rule; prose demoted to captions.', Comp: VariantReceipt },
    { name: '2 · Chapter cards (source study)', note: 'The hand-rolled study variant 0 was ported from — kept for comparison.', Comp: VariantChapterCards },
    { name: '3 · Timeline rail', note: 'Numbered dots on a vertical rail, content indented, tinted formula bands.', Comp: VariantTimeline },
    { name: '4 · Ghost numeral', note: 'Oversized translucent step numerals behind the titles, magazine contrast.', Comp: VariantGhostNumeral },
]

export default function InfoPageStyleTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [variantIndex, setVariantIndex] = useState(0)

    const variant = VARIANTS[variantIndex]
    const Variant = variant.Comp

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Field label="Style variant">
                <Segmented options={VARIANTS.map((v, i) => ({ label: String(i), value: i }))} value={variantIndex} onChange={setVariantIndex} />
            </Field>
            <TouchableOpacity onPress={() => setColorScheme(isDark ? 'light' : 'dark')} activeOpacity={0.6}>
                <Text style={styles.themeToggle}>Theme: {isDark ? 'Dark' : 'Light'} (tap to flip)</Text>
            </TouchableOpacity>
            <Text style={styles.variantName}>{variant.name}</Text>
            <Text style={styles.variantNote}>{variant.note}</Text>

            <View style={styles.divider} />
            <Text style={styles.lede}>Example person: {EXAMPLE_PERSON}. (Not your numbers.)</Text>
            <Variant />
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { paddingHorizontal: spacing.screenH + 2, paddingTop: 16, paddingBottom: 80 },
        themeToggle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
        variantName: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, letterSpacing: -0.2 },
        variantNote: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: 16 },
        lede: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, marginBottom: 20 },
    })
}
