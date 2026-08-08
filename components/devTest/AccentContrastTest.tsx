import { fonts, palettes, radius, useColors, useColorScheme, useSetColorScheme, type ColorScheme, type Colors } from '@/context/ThemeContext'
import { ACCENT_SETS, setAccentPreview, useAccentPreview, type AccentSet } from '@/lib/devtools/accentPreview'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Dev-only review of the accent candidates in lib/devtools/accentPreview.ts. Measures
 * every accent against the three surfaces it actually lands on (surface, background,
 * surfaceInset), against both white and near-black for CTA fills, and reports CIE L*
 * plus OKLCH chroma — the two numbers that together decide whether the green and the
 * blue read at the same intensity. Swatches and samples below are literal hexes, so
 * they are unaffected by the app-wide selector at the top; apply a set and back out to
 * judge it on real screens.
 */

const TEXT_AA = 4.5
const LARGE_AA = 3

// Chroma difference at which two accents stop reading as one intensity
const CHROMA_TOLERANCE = 0.015

type CandidateSet = Exclude<AccentSet, 'off'>

const SET_LABELS: Record<CandidateSet, string> = { aa: 'AA candidate', matched: 'L*+C matched' }

// The near-black each scheme would use as a CTA label, for the dark-text-on-fill measurement
const NEAR_BLACK: Record<ColorScheme, string> = { light: '#16171A', dark: '#0F1012' }

// sRGB channel linearized for the WCAG relative-luminance sum
function linearize(channel: number): number {
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
}

// WCAG relative luminance of a #rrggbb hex
function luminance(hex: string): number {
    const r = linearize(parseInt(hex.slice(1, 3), 16) / 255)
    const g = linearize(parseInt(hex.slice(3, 5), 16) / 255)
    const b = linearize(parseInt(hex.slice(5, 7), 16) / 255)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// WCAG 2.1 contrast ratio between two hexes (order-independent)
function contrast(a: string, b: string): number {
    const la = luminance(a)
    const lb = luminance(b)
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// CIE L* perceptual lightness (0-100) — equal contrast ratios do NOT imply equal
// lightness, because the WCAG luminance sum is green-weighted.
function lightness(hex: string): number {
    const y = luminance(hex)
    return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y
}

// OKLCH chroma — the saturation axis. Matching L* alone is not enough: two accents at
// the same lightness but different chroma still read at different intensities, and equal
// chroma is also what cancels the Helmholtz-Kohlrausch lift on the saturated blue.
function chroma(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => linearize(parseInt(hex.slice(i, i + 2), 16) / 255))
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return Math.hypot(1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s)
}

// The shipped palette with a candidate patch applied, for side-by-side comparison
function proposedPalette(scheme: ColorScheme, set: CandidateSet): Colors {
    return { ...palettes[scheme], ...ACCENT_SETS[set][scheme] }
}

// What the reviewed set is trying to do in this scheme, in one line
function setNote(set: CandidateSet, scheme: ColorScheme): string {
    if (set === 'aa') {
        return scheme === 'dark' ?
                'Both fills move to L* ~59-60 so the green stops outshining the blue. Inks keep the neon. Chroma is untouched, so the pair is matched in lightness only.'
            :   'Fills are already matched at L* 48 and do not move — only nutritionInk deepens, giving green text a compliant variant it never had. That widens the chroma gap against workoutInk.'
    }
    return scheme === 'dark' ?
            'L* 60 is where green and blue hold equal maximum chroma in sRGB. Every token clears AA as text, so fill and ink collapse to one value per hue — but white on the fill is large-text only.'
        :   'L* 42 is the ceiling for AA against the darkest light surface. Green binds the shared chroma, so the blue desaturates to meet it. Fill and ink collapse to one value per hue.'
}

const SURFACES = [
    { key: 'surface', label: 'surface' },
    { key: 'background', label: 'background' },
    { key: 'surfaceInset', label: 'inset' },
] as const

const ACCENTS = [
    { key: 'nutrition', label: 'nutrition' },
    { key: 'workout', label: 'workout' },
    { key: 'nutritionInk', label: 'nutritionInk' },
    { key: 'workoutInk', label: 'workoutInk' },
] as const

function RatioCell({ current, proposed, threshold }: { current: number; proposed: number; threshold: number }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const passes = proposed >= threshold
    const changed = Math.abs(proposed - current) > 0.01
    return (
        <View style={styles.cell}>
            <Text style={[styles.cellValue, { color: passes ? colors.nutritionInk : colors.destructive }]}>
                {proposed.toFixed(2)} {passes ? '✓' : '✗'}
            </Text>
            {changed && <Text style={styles.cellWas}>was {current.toFixed(2)}</Text>}
        </View>
    )
}

function Swatch({ label, hex }: { label: string; hex: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.swatchCol}>
            <View style={[styles.swatch, { backgroundColor: hex }]} />
            <Text style={styles.swatchLabel}>{label}</Text>
            <Text style={styles.swatchHex}>{hex}</Text>
            <Text style={styles.swatchMeta}>L* {lightness(hex).toFixed(1)}</Text>
            <Text style={styles.swatchMeta}>C {chroma(hex).toFixed(3)}</Text>
        </View>
    )
}

// A card rendered in literal palette hexes — shows accent text at the sizes the app really uses
function SampleCard({ label, set }: { label: string; set: Colors }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.sampleCol}>
            <View style={[styles.sampleCard, { backgroundColor: set.surface, borderColor: set.hairline }]}>
                <Text style={[styles.sampleNumeral, { color: set.nutritionInk }]}>1,842</Text>
                <Text style={[styles.sampleBody, { color: set.nutrition }]}>Protein on target</Text>
                <Text style={[styles.sampleBody, { color: set.workout }]}>Bench Press · 4 sets</Text>
                <Text style={[styles.sampleSmall, { color: set.workoutInk }]}>View all logs</Text>
                <View style={[styles.sampleInset, { backgroundColor: set.surfaceInset }]}>
                    <Text style={[styles.sampleSmall, { color: set.nutritionInk }]}>Food DB · 11px on inset</Text>
                    <Text style={[styles.sampleSmall, { color: set.workoutInk }]}>Charts · 11px on inset</Text>
                </View>
            </View>
            <Text style={styles.sampleCaption}>{label}</Text>
        </View>
    )
}

function CtaChip({ label, gradient, onFill }: { label: string; gradient: readonly [string, string]; onFill: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const ratio = contrast(onFill, gradient[0])
    return (
        <View style={styles.ctaCol}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                <Text style={[styles.ctaText, { color: onFill }]}>Subscribe Now</Text>
            </LinearGradient>
            <Text style={[styles.ctaCaption, { color: ratio >= LARGE_AA ? colors.textMuted : colors.destructive }]}>
                {label} · {ratio.toFixed(2)}
            </Text>
        </View>
    )
}

export default function AccentContrastTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const scheme = useColorScheme()
    const setColorScheme = useSetColorScheme()
    const applied = useAccentPreview()
    const [reviewing, setReviewing] = useState<CandidateSet>('matched')

    const current = palettes[scheme]
    const proposed = useMemo(() => proposedPalette(scheme, reviewing), [scheme, reviewing])
    const nearBlack = NEAR_BLACK[scheme]

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={[styles.toggleRow, applied !== 'off' && styles.toggleRowActive]}>
                <Text style={styles.toggleLabel}>Apply app-wide</Text>
                {applied === 'off' ?
                    <Text style={styles.toggleHint}>Pick a set, back out of the Dev Hub, and browse the real screens</Text>
                :   <Text style={styles.toggleWarning}>{SET_LABELS[applied]} is live on every screen — persists across restarts</Text>}
                <View style={styles.toggleChips}>
                    <Segmented
                        value={applied}
                        onChange={(v) => void setAccentPreview(v)}
                        options={[
                            { label: 'Shipped', value: 'off' as AccentSet },
                            { label: SET_LABELS.aa, value: 'aa' as AccentSet },
                            { label: SET_LABELS.matched, value: 'matched' as AccentSet },
                        ]}
                    />
                </View>
            </View>

            <Field label="Reviewing (drives every table below)">
                <Segmented
                    value={reviewing}
                    onChange={setReviewing}
                    options={[
                        { label: SET_LABELS.aa, value: 'aa' as CandidateSet },
                        { label: SET_LABELS.matched, value: 'matched' as CandidateSet },
                    ]}
                />
            </Field>

            <Field label="Page theme (tables + samples below are literal, unaffected)">
                <Segmented
                    value={scheme}
                    onChange={(v) => setColorScheme(v as ColorScheme)}
                    options={[
                        { label: 'Light', value: 'light' },
                        { label: 'Dark', value: 'dark' },
                    ]}
                />
            </Field>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    {SET_LABELS[reviewing]} — {scheme}
                </Text>
                <Text style={styles.sectionNote}>{setNote(reviewing, scheme)}</Text>
                <View style={styles.row}>
                    <Swatch label="green now" hex={current.nutrition} />
                    <Swatch label="green cand." hex={proposed.nutrition} />
                    <Swatch label="blue now" hex={current.workout} />
                    <Swatch label="blue cand." hex={proposed.workout} />
                </View>
                <View style={[styles.row, styles.rowSpaced]}>
                    <Swatch label="g. ink now" hex={current.nutritionInk} />
                    <Swatch label="g. ink cand." hex={proposed.nutritionInk} />
                    <Swatch label="b. ink now" hex={current.workoutInk} />
                    <Swatch label="b. ink cand." hex={proposed.workoutInk} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>As text on each surface</Text>
                <Text style={styles.sectionNote}>
                    Small text needs {TEXT_AA.toFixed(1)}:1; a token doing icon / border / chart work only needs {LARGE_AA.toFixed(1)}:1. The fill tokens are not icon-only — nutritionScreens, workoutScreens and progress all set
                    `color: colors.nutrition` / `colors.workout` on real body copy, so a ✗ on those rows is a live failure.
                    {reviewing === 'matched' && ' In this set the ink rows repeat the fill rows: every token clears AA, so the split is no longer needed.'}
                </Text>
                <View style={styles.tableHeader}>
                    <Text style={[styles.headerLabel, styles.tokenCol]}>token</Text>
                    {SURFACES.map((s) => (
                        <Text key={s.key} style={[styles.headerLabel, styles.cell]}>
                            {s.label}
                        </Text>
                    ))}
                </View>
                {ACCENTS.map((a) => (
                    <View key={a.key} style={styles.tableRow}>
                        <Text style={[styles.rowLabel, styles.tokenCol]}>{a.label}</Text>
                        {SURFACES.map((s) => (
                            <RatioCell key={s.key} current={contrast(current[a.key], current[s.key])} proposed={contrast(proposed[a.key], proposed[s.key])} threshold={TEXT_AA} />
                        ))}
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Label text on the CTA fill</Text>
                <Text style={styles.sectionNote}>
                    Needs {TEXT_AA.toFixed(1)}:1, or {LARGE_AA.toFixed(1)}:1 at 18.7px bold or larger. The real CTA is 17px semibold, so a fill that only clears 3:1 wants a type bump to be formally compliant — or a near-black label, the
                    trade measurementGradient already makes.
                </Text>
                <View style={styles.row}>
                    <CtaChip label="green now" gradient={current.nutritionGradient} onFill="#FFFFFF" />
                    <CtaChip label="green cand." gradient={proposed.nutritionGradient} onFill="#FFFFFF" />
                </View>
                <View style={[styles.row, styles.rowSpaced]}>
                    <CtaChip label="blue now" gradient={current.workoutGradient} onFill="#FFFFFF" />
                    <CtaChip label="blue cand." gradient={proposed.workoutGradient} onFill="#FFFFFF" />
                </View>
                <View style={[styles.row, styles.rowSpaced]}>
                    <CtaChip label="green cand. / dark" gradient={proposed.nutritionGradient} onFill={nearBlack} />
                    <CtaChip label="blue cand. / dark" gradient={proposed.workoutGradient} onFill={nearBlack} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Intensity balance (L* and chroma)</Text>
                <Text style={styles.sectionNote}>
                    Equal contrast ratios do not mean equal visual weight — the WCAG sum weights green 0.7152 and blue 0.0722, so match L* instead. But L* alone is not enough: two hues at the same lightness and different chroma still read
                    at different intensities. Both deltas have to close.
                </Text>
                <View style={styles.tableHeader}>
                    <Text style={[styles.headerLabel, styles.tokenCol]}>metric</Text>
                    <Text style={[styles.headerLabel, styles.cell]}>green</Text>
                    <Text style={[styles.headerLabel, styles.cell]}>blue</Text>
                    <Text style={[styles.headerLabel, styles.cell]}>delta</Text>
                </View>
                {(
                    [
                        { label: 'L* now', g: lightness(current.nutrition), b: lightness(current.workout), digits: 1, tolerance: 6 },
                        { label: 'L* cand.', g: lightness(proposed.nutrition), b: lightness(proposed.workout), digits: 1, tolerance: 6 },
                        { label: 'chroma now', g: chroma(current.nutrition), b: chroma(current.workout), digits: 4, tolerance: CHROMA_TOLERANCE },
                        { label: 'chroma cand.', g: chroma(proposed.nutrition), b: chroma(proposed.workout), digits: 4, tolerance: CHROMA_TOLERANCE },
                    ] as const
                ).map((r) => {
                    const delta = Math.abs(r.g - r.b)
                    return (
                        <View key={r.label} style={styles.tableRow}>
                            <Text style={[styles.rowLabel, styles.tokenCol]}>{r.label}</Text>
                            <Text style={[styles.cellValue, styles.cell]}>{r.g.toFixed(r.digits)}</Text>
                            <Text style={[styles.cellValue, styles.cell]}>{r.b.toFixed(r.digits)}</Text>
                            <Text style={[styles.cellValue, styles.cell, { color: delta > r.tolerance ? colors.destructive : colors.nutritionInk }]}>{delta.toFixed(r.digits)}</Text>
                        </View>
                    )
                })}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Side by side, in context</Text>
                <Text style={styles.sectionNote}>Real type sizes on a real card, including the nested inset where the shipped light green fails.</Text>
                <View style={styles.row}>
                    <SampleCard label="now" set={current} />
                    <SampleCard label="candidate" set={proposed} />
                </View>
            </View>
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 16,
            paddingBottom: 80,
        },
        toggleRow: {
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginBottom: 16,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        toggleRowActive: {
            borderColor: colors.warning,
            borderWidth: 1,
        },
        toggleChips: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 10,
        },
        toggleLabel: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.text,
        },
        toggleWarning: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.warning,
            marginTop: 2,
            lineHeight: 16,
        },
        toggleHint: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.textMuted,
            marginTop: 2,
            lineHeight: 16,
        },
        section: {
            marginTop: 24,
        },
        sectionTitle: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: colors.text,
            marginBottom: 4,
        },
        sectionNote: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.textMuted,
            marginBottom: 12,
            lineHeight: 17,
        },
        row: {
            flexDirection: 'row',
            gap: 12,
        },
        rowSpaced: {
            marginTop: 14,
        },
        tableHeader: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingBottom: 6,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.hairline,
        },
        tableRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.divider,
        },
        tokenCol: {
            flex: 1.4,
        },
        headerLabel: {
            fontFamily: fonts.semibold,
            fontSize: 11,
            color: colors.labelMuted,
        },
        rowLabel: {
            fontFamily: fonts.medium,
            fontSize: 12,
            color: colors.text,
        },
        cell: {
            flex: 1,
        },
        cellValue: {
            fontFamily: fonts.semibold,
            fontSize: 12,
        },
        cellWas: {
            fontFamily: fonts.regular,
            fontSize: 10,
            color: colors.textFaint,
            marginTop: 1,
        },
        swatchCol: {
            flex: 1,
            alignItems: 'center',
        },
        swatch: {
            width: '100%',
            height: 58,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        swatchLabel: {
            fontFamily: fonts.semibold,
            fontSize: 11,
            color: colors.text,
            marginTop: 6,
        },
        swatchHex: {
            fontFamily: fonts.regular,
            fontSize: 10,
            color: colors.textMuted,
            marginTop: 1,
        },
        swatchMeta: {
            fontFamily: fonts.regular,
            fontSize: 10,
            color: colors.textFaint,
            marginTop: 1,
        },
        ctaCol: {
            flex: 1,
            alignItems: 'center',
            gap: 6,
        },
        cta: {
            width: '100%',
            height: 52,
            borderRadius: radius.cardLg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ctaText: {
            fontFamily: fonts.semibold,
            fontSize: 17,
            color: '#FFFFFF',
            letterSpacing: -0.3,
        },
        ctaCaption: {
            fontFamily: fonts.medium,
            fontSize: 11,
            color: colors.textMuted,
        },
        sampleCol: {
            flex: 1,
            gap: 6,
        },
        sampleCard: {
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            padding: 14,
            gap: 6,
        },
        sampleNumeral: {
            fontFamily: fonts.extrabold,
            fontSize: 26,
            letterSpacing: -0.6,
        },
        sampleBody: {
            fontFamily: fonts.semibold,
            fontSize: 15,
        },
        sampleSmall: {
            fontFamily: fonts.medium,
            fontSize: 11,
        },
        sampleInset: {
            borderRadius: radius.card,
            padding: 10,
            marginTop: 4,
            gap: 4,
        },
        sampleCaption: {
            fontFamily: fonts.medium,
            fontSize: 11,
            color: colors.textMuted,
            textAlign: 'center',
        },
    })
}
