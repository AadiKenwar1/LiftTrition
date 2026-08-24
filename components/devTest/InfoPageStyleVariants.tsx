import { ExampleStep, FormulaPanel, InfoNote, InfoSection, InfoTable, SpecRow } from '@/components/NeutralComponents/InfoPage'
import { fonts, radius, spacing, useColors, withAlpha, type Colors } from '@/context/ThemeContext'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/**
 * Style studies for the two info screens (howNutritionIsCalculated / howGraphsWork). Every variant
 * renders the SAME nutrition-math content so only the visual system differs; the harness
 * (InfoPageStyleTest) picks one at a time. Variant 0 composes the shipped NeutralComponents/InfoPage
 * primitives — the baseline every candidate is judged against.
 */

export const EXAMPLE_PERSON = '30-year-old man · 180 lb · 5\'10" · moderately active · lose 1 lb/week'

// One entry per math step; each variant lays this same data out its own way.
export const STEPS = [
    {
        n: 1,
        title: 'Resting burn',
        body: 'Calories your body burns just staying alive — breathing, pumping blood, staying warm. This is your BMR.',
        formulaLabel: 'Mifflin-St Jeor · 1990',
        formula: 'BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5',
        specs: [['For women', 'the same formula, but it ends in − 161 instead of + 5.']] as [string, string][],
        example: [['816 + 1,111 − 150 + 5', '≈ 1,783 kcal']] as [string, string][],
    },
    {
        n: 2,
        title: 'Daily burn',
        body: 'You don\'t lie in bed all day, so we multiply by an activity factor. The result is your maintenance calories.',
        formula: 'maintenance = BMR × activity factor',
        table: { headers: ['Activity level', 'Multiplier'] as [string, string], rows: [['Sedentary', '× 1.2'], ['Light', '× 1.375'], ['Moderate', '× 1.55'], ['Active', '× 1.725'], ['Gym rat', '× 1.9']] as [string, string][], highlight: 2 },
        example: [['1,783 × 1.55 (moderate)', '≈ 2,763 kcal']] as [string, string][],
    },
    {
        n: 3,
        title: 'Your target',
        body: 'One pound of body fat holds about 3,500 calories, so your weekly pace becomes a daily calorie change.',
        formula: 'target = maintenance ± (pace × 3500) ÷ 7',
        specs: [['The cap', 'the pace slider stops at 2 lb (0.9 kg) per week for everyone.']] as [string, string][],
        example: [['2,763 − 500 (lose 1 lb/week)', '≈ 2,263 kcal']] as [string, string][],
        note: 'We never quietly change this number — targets under 1,500 kcal (men) or 1,200 kcal (women) just get a warning.',
    },
    {
        n: 4,
        title: 'Splitting into macros',
        body: 'Your target is cut into protein, fat, and carbs by percentage, then percentages become grams.',
        formula: 'grams = target × percent ÷ calories per gram',
        example: [['Protein · 2,263 × 30% ÷ 4', '≈ 170 g'], ['Fat · 2,263 × 30% ÷ 9', '≈ 75 g'], ['Carbs · 2,263 × 40% ÷ 4', '≈ 226 g']] as [string, string][],
    },
] as const

type Step = (typeof STEPS)[number]

//V0 — what ships today: the chapter-card system composed from the production InfoPage primitives.
export function VariantShipped() {
    const colors = useColors()
    return (
        <View>
            {STEPS.map((s) => (
                <InfoSection key={s.n} index={s.n} title={s.title} body={s.body} accent={colors.nutrition} kicker={`Step ${s.n}`}>
                    <FormulaPanel label={'formulaLabel' in s ? s.formulaLabel : undefined} lines={[s.formula]} />
                    {'table' in s ? <InfoTable headers={s.table.headers} rows={s.table.rows} highlightIndex={s.table.highlight} accent={colors.nutrition} /> : null}
                    {'specs' in s ? s.specs.map(([term, description]) => <SpecRow key={term} term={term} description={description} />) : null}
                    {s.example.map(([text, value]) => (
                        <ExampleStep key={text} text={text} value={value} />
                    ))}
                    {'note' in s ? <InfoNote>{s.note}</InfoNote> : null}
                </InfoSection>
            ))}
        </View>
    )
}

//V1 — receipt ledger: number-forward running tally, label left / amount right, heavy total rule; prose reduced to captions.
export function VariantReceipt() {
    const colors = useColors()
    const styles = useMemo(() => makeReceiptStyles(colors), [colors])
    const rows: { label: string; value: string; kind: 'line' | 'adjust' | 'total' }[] = [
        { label: 'Resting burn (BMR)', value: '1,783', kind: 'line' },
        { label: '× Activity — moderate (1.55)', value: '2,763', kind: 'line' },
        { label: '− Lose 1 lb/week (500 ÷ day)', value: '−500', kind: 'adjust' },
        { label: 'DAILY TARGET', value: '2,263', kind: 'total' },
    ]
    return (
        <View>
            <Text style={styles.caption}>THE MATH — EXAMPLE PERSON</Text>
            <Text style={styles.person}>{EXAMPLE_PERSON}</Text>
            <View style={styles.block}>
                {rows.map((r) => (
                    <View key={r.label} style={[styles.row, r.kind === 'total' && styles.totalRow]}>
                        <Text style={[styles.rowLabel, r.kind === 'total' && styles.totalLabel]}>{r.label}</Text>
                        <Text style={[styles.rowValue, r.kind === 'adjust' && { color: colors.nutrition }, r.kind === 'total' && styles.totalValue]}>{r.value}</Text>
                    </View>
                ))}
            </View>
            <Text style={styles.caption}>HOW EACH LINE IS COMPUTED</Text>
            {STEPS.map((s) => (
                <View key={s.n} style={styles.formulaRow}>
                    <Text style={styles.formulaTitle}>{s.title}</Text>
                    <Text style={styles.formulaText}>{s.formula}</Text>
                </View>
            ))}
            <Text style={styles.caption}>SPLIT INTO MACROS</Text>
            <View style={styles.block}>
                {STEPS[3].example.map(([text, value]) => (
                    <View key={text} style={styles.row}>
                        <Text style={styles.rowLabel}>{text}</Text>
                        <Text style={styles.rowValue}>{value}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

//V2 — quiet chapter cards: one surface per step with a thin accent top bar, definition rows inside, no icon circles or badges.
export function VariantChapterCards() {
    const colors = useColors()
    const styles = useMemo(() => makeCardStyles(colors), [colors])
    return (
        <View>
            {STEPS.map((s) => (
                <View key={s.n} style={styles.card}>
                    <View style={[styles.accentBar, { backgroundColor: colors.nutrition }]} />
                    <Text style={styles.kicker}>Step {s.n}</Text>
                    <Text style={styles.title}>{s.title}</Text>
                    <Text style={styles.body}>{s.body}</Text>
                    <View style={styles.formulaInset}>
                        <Text style={styles.formulaText}>{s.formula}</Text>
                    </View>
                    {s.example.map(([text, value]) => (
                        <View key={text} style={styles.exampleRow}>
                            <Text style={styles.exampleText}>{text}</Text>
                            <Text style={styles.exampleValue}>{value}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    )
}

//V3 — timeline rail: numbered dots on a continuous vertical hairline, content indented; formulas as accent-tinted bands.
export function VariantTimeline() {
    const colors = useColors()
    const styles = useMemo(() => makeTimelineStyles(colors), [colors])
    return (
        <View>
            {STEPS.map((s, i) => (
                <View key={s.n} style={styles.step}>
                    <View style={styles.railColumn}>
                        <View style={[styles.dot, { borderColor: colors.nutrition }]}>
                            <Text style={[styles.dotText, { color: colors.nutrition }]}>{s.n}</Text>
                        </View>
                        {i < STEPS.length - 1 ? <View style={styles.rail} /> : null}
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.title}>{s.title}</Text>
                        <Text style={styles.body}>{s.body}</Text>
                        <View style={[styles.formulaBand, { backgroundColor: withAlpha(colors.nutrition, 0.09) }]}>
                            <Text style={styles.formulaText}>{s.formula}</Text>
                        </View>
                        {s.example.map(([text, value]) => (
                            <View key={text} style={styles.exampleRow}>
                                <Text style={styles.exampleText}>{text}</Text>
                                <Text style={styles.exampleValue}>{value}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </View>
    )
}

//V4 — ghost numeral magazine: oversized translucent step numerals behind the titles, formulas as full-width tinted bands, maximum type contrast.
export function VariantGhostNumeral() {
    const colors = useColors()
    const styles = useMemo(() => makeGhostStyles(colors), [colors])
    return (
        <View>
            {STEPS.map((s) => (
                <View key={s.n} style={styles.step}>
                    <Text style={styles.ghost}>{String(s.n).padStart(2, '0')}</Text>
                    <Text style={styles.title}>{s.title}</Text>
                    <Text style={styles.body}>{s.body}</Text>
                    <View style={[styles.formulaBand, { borderColor: withAlpha(colors.nutrition, 0.35) }]}>
                        <Text style={styles.formulaText}>{s.formula}</Text>
                    </View>
                    {s.example.map(([text, value]) => (
                        <View key={text} style={styles.exampleRow}>
                            <Text style={styles.exampleText}>{text}</Text>
                            <Text style={styles.exampleValue}>{value}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    )
}

function makeReceiptStyles(colors: Colors) {
    return StyleSheet.create({
        caption: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, letterSpacing: 1.2, marginBottom: 8, marginTop: 18 },
        person: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textSecondary, marginBottom: 4 },
        block: { marginTop: 4 },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
        rowLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
        rowValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, letterSpacing: 0.3, fontVariant: ['tabular-nums'] },
        totalRow: { borderBottomWidth: 0, borderTopWidth: 1.5, borderTopColor: colors.text, marginTop: 2, paddingTop: 10 },
        totalLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, letterSpacing: 1 },
        totalValue: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text, letterSpacing: -0.3 },
        formulaRow: { marginBottom: 10 },
        formulaTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginBottom: 1 },
        formulaText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.4 },
    })
}

function makeCardStyles(colors: Colors) {
    return StyleSheet.create({
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: spacing.cardPadLg, marginBottom: spacing.cardGap, overflow: 'hidden' },
        accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
        kicker: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
        title: { fontFamily: fonts.bold, fontSize: 17, color: colors.text, letterSpacing: -0.3, marginBottom: 6 },
        body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, marginBottom: 10 },
        formulaInset: { backgroundColor: colors.surfaceInset, borderRadius: radius.card, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
        formulaText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text, letterSpacing: 0.4, lineHeight: 20 },
        exampleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 },
        exampleText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
        exampleValue: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.text },
    })
}

function makeTimelineStyles(colors: Colors) {
    return StyleSheet.create({
        step: { flexDirection: 'row', gap: 14 },
        railColumn: { alignItems: 'center', width: 28 },
        dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
        dotText: { fontFamily: fonts.bold, fontSize: 13 },
        rail: { flex: 1, width: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: 4 },
        content: { flex: 1, paddingBottom: 24 },
        title: { fontFamily: fonts.bold, fontSize: 16.5, color: colors.text, letterSpacing: -0.3, marginTop: 4, marginBottom: 5 },
        body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, marginBottom: 10 },
        formulaBand: { borderRadius: radius.card, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
        formulaText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text, letterSpacing: 0.4, lineHeight: 20 },
        exampleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 },
        exampleText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
        exampleValue: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.text },
    })
}

function makeGhostStyles(colors: Colors) {
    return StyleSheet.create({
        step: { marginBottom: 30 },
        ghost: { position: 'absolute', top: -18, left: -4, fontFamily: fonts.extrabold, fontSize: 72, color: withAlpha(colors.text, 0.07), letterSpacing: -2 },
        title: { fontFamily: fonts.extrabold, fontSize: 21, color: colors.text, letterSpacing: -0.5, marginTop: 16, marginBottom: 6 },
        body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginBottom: 10 },
        formulaBand: { borderWidth: 1, borderRadius: radius.card, paddingVertical: 11, paddingHorizontal: 13, marginBottom: 10 },
        formulaText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, letterSpacing: 0.5, lineHeight: 21 },
        exampleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 },
        exampleText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
        exampleValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
    })
}
