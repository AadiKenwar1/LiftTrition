import { fonts, radius, spacing, useColors, withAlpha, type Colors } from '@/context/ThemeContext'
import { useMemo, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Polyline } from 'react-native-svg'

/**
 * "Chapter card" primitives shared by the two info screens (howNutritionIsCalculated,
 * howGraphsWork) — the winner of the devTest infoPageStyle bench. One quiet surface per
 * section with a thin accent top bar and a small kicker; formulas sit on inset panels with
 * an optional research citation line. One style system in one file so the screens can't drift.
 */

// Splits a formula string so math operators render muted while variables stay strong.
const OPERATOR_SPLIT = /(\s[×÷=+−±]\s|[()])/

// Scroll scaffold for an info screen: background, screen padding, safe-area bottom pad, lede paragraph.
export function InfoPage({ lede, children }: { lede: string; children: ReactNode }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const insets = useSafeAreaInsets()
    return (
        <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]} showsVerticalScrollIndicator={false}>
            <Text style={styles.lede}>{lede}</Text>
            {children}
        </ScrollView>
    )
}

// Chapter card: accent top bar, uppercase kicker (defaults to the padded index), title, optional body, children.
export function InfoSection({ index, title, body, accent, kicker, children }: { index: number; title: string; body?: string; accent: string; kicker?: string; children?: ReactNode }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.card}>
            <View style={[styles.accentBar, { backgroundColor: accent }]} />
            <Text style={styles.kicker}>{kicker ?? String(index).padStart(2, '0')}</Text>
            <Text style={styles.title}>{title}</Text>
            {body ? <Text style={styles.body}>{body}</Text> : null}
            {children}
        </View>
    )
}

// Inset formula panel: caption label, formula line(s) with muted operators, optional research citation line.
export function FormulaPanel({ label, lines, cite }: { label?: string; lines: string[]; cite?: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.formulaInset}>
            {label ? <Text style={styles.formulaLabel}>{label}</Text> : null}
            {lines.map((line) => (
                <Text key={line} style={styles.formulaText}>
                    {line.split(OPERATOR_SPLIT).map((part, i) => (
                        <Text key={`${i}-${part}`} style={OPERATOR_SPLIT.test(part) ? styles.formulaOperator : undefined}>{part}</Text>
                    ))}
                </Text>
            ))}
            {cite ? <Text style={styles.formulaCite}>{cite}</Text> : null}
        </View>
    )
}

// Definition line: semibold term flowing straight into its description, so the pair reads as one sentence.
export function SpecRow({ term, description }: { term: string; description: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <Text style={styles.specText}>
            <Text style={styles.specTerm}>{term}</Text>
            {' — '}
            {description}
        </Text>
    )
}

// Flat two-column table with hairline row separators; highlightIndex tints the worked example's row with the accent.
export function InfoTable({ headers, rows, highlightIndex, accent }: { headers: [string, string]; rows: [string, string][]; highlightIndex?: number; accent?: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
                <Text style={styles.tableHeader}>{headers[0]}</Text>
                <Text style={[styles.tableHeader, styles.tableRight]}>{headers[1]}</Text>
            </View>
            {rows.map(([left, right], i) => (
                <View key={left} style={[styles.tableRow, i === highlightIndex && accent ? { backgroundColor: withAlpha(accent, 0.12) } : null]}>
                    <Text style={styles.tableCell}>{left}</Text>
                    <Text style={[styles.tableValue, styles.tableRight]}>{right}</Text>
                </View>
            ))}
        </View>
    )
}

// Worked-example line: step text left, computed number right.
export function ExampleStep({ text, value }: { text: string; value: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.exampleRow}>
            <Text style={styles.exampleText}>{text}</Text>
            <Text style={styles.exampleValue}>{value}</Text>
        </View>
    )
}

// Labeled horizontal bars on a shared scale (each width ∝ value / max) — replaces value tables.
export function ScaleBars({ rows, accent }: { rows: { label: string; value: number; display: string }[]; accent: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    // || 1 guards the same divide-by-zero MiniLine's xFor guards below — an all-zero (or single
    // zero-value) rows array would otherwise divide 0/0 into a NaN width instead of an empty bar.
    const max = Math.max(...rows.map((r) => r.value)) || 1
    return (
        <View style={styles.viz}>
            {rows.map((r) => (
                <View key={r.label} style={styles.scaleRow}>
                    <Text style={styles.scaleLabel}>{r.label}</Text>
                    <View style={styles.scaleTrack}>
                        <View style={[styles.scaleFill, { width: `${(r.value / max) * 100}%`, backgroundColor: accent }]} />
                    </View>
                    <Text style={styles.scaleValue}>{r.display}</Text>
                </View>
            ))}
        </View>
    )
}

// Color-key row for the diagram below it.
export function Legend({ items }: { items: { label: string; color: string }[] }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.legend}>
            {items.map((item) => (
                <View key={item.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                </View>
            ))}
        </View>
    )
}

// One stacked percentage bar (segments must sum to 100) with the % printed inside each segment.
export function SplitBar({ label, segments }: { label: string; segments: { pct: number; color: string; textColor?: string }[] }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <View style={styles.scaleRow}>
            <Text style={styles.scaleLabel}>{label}</Text>
            <View style={styles.splitTrack}>
                {segments.map((s, i) => (
                    <View key={i} style={[styles.splitSegment, { width: `${s.pct}%`, backgroundColor: s.color }]}>
                        <Text style={[styles.splitText, { color: s.textColor ?? '#fff' }]}>{s.pct}%</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

// Diagram-only mini bar chart: 7-ish bars, optional day labels, optional goal line, faded flags
// for carried-forward values. Values are shapes, not data — same idea as GoalProjectionChart.
export function MiniBars({ values, labels, goal, faded, accent }: { values: number[]; labels?: string[]; goal?: number; faded?: boolean[]; accent: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const max = Math.max(...values, goal ?? 0)
    return (
        <View style={styles.viz}>
            <View style={styles.miniArea}>
                {values.map((v, i) => (
                    <View key={i} style={[styles.miniBar, v <= 0 ? { height: 3, backgroundColor: colors.ringTrack } : { height: Math.max(4, (v / max) * 64), backgroundColor: faded?.[i] ? withAlpha(accent, 0.35) : accent }]} />
                ))}
                {goal != null ? (
                    <>
                        <View style={[styles.miniGoalLine, { bottom: (goal / max) * 64 }]} />
                        <Text style={[styles.miniGoalLabel, { bottom: (goal / max) * 64 + 2 }]}>goal</Text>
                    </>
                ) : null}
            </View>
            {labels ? (
                <View style={styles.miniLabels}>
                    {labels.map((l, i) => (
                        <Text key={`${i}-${l}`} style={styles.miniLabel}>{l}</Text>
                    ))}
                </View>
            ) : null}
        </View>
    )
}

// Diagram-only mini line chart: a polyline through the values with a dot per point (faded flags
// for carried-forward days), optional goal line. Values are shapes, not data — see MiniBars.
export function MiniLine({ values, faded, goal, accent }: { values: number[]; faded?: boolean[]; goal?: number; accent: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const lo = Math.min(...values, goal ?? Infinity)
    const hi = Math.max(...values, goal ?? -Infinity)
    // Maps a value into the 64px area with 6px top/bottom padding; a flat series centers.
    const yFor = (v: number) => 58 - ((v - lo) / (hi - lo || 1)) * 52
    // Maps an index to a 0–100 x position; a single-point series (length - 1 === 0) places it at the start instead of dividing by zero.
    const xFor = (i: number) => (i / (values.length - 1 || 1)) * 100
    const points = values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ')
    return (
        <View style={styles.viz}>
            <View style={styles.miniLineArea}>
                {goal != null ? (
                    <>
                        <View style={[styles.miniGoalLine, { top: yFor(goal) }]} />
                        <Text style={[styles.miniGoalLabel, { top: yFor(goal) + 2 }]}>goal</Text>
                    </>
                ) : null}
                <Svg width="100%" height="64" viewBox="0 0 100 64" preserveAspectRatio="none">
                    <Polyline points={points} fill="none" stroke={accent} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                </Svg>
                {values.map((v, i) => (
                    <View key={i} style={[styles.miniDot, { left: `${xFor(i)}%`, top: yFor(v) - 3.5, backgroundColor: faded?.[i] ? withAlpha(accent, 0.35) : accent }]} />
                ))}
            </View>
        </View>
    )
}

// Short muted aside for caveats, set off by a hairline top rule inside the card.
export function InfoNote({ children }: { children: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return <Text style={styles.note}>{children}</Text>
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        page: { flex: 1, backgroundColor: colors.background },
        pageContent: { paddingHorizontal: spacing.screenH, paddingTop: 20 },
        lede: { fontFamily: fonts.medium, fontSize: 14.5, lineHeight: 22, color: colors.textSecondary, letterSpacing: -0.2, marginBottom: 16 },
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: spacing.cardPadLg, marginBottom: spacing.cardGap, overflow: 'hidden' },
        accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
        kicker: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
        title: { fontFamily: fonts.bold, fontSize: 17, color: colors.text, letterSpacing: -0.3, marginBottom: 6 },
        body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, marginBottom: 10 },
        formulaInset: { backgroundColor: colors.surfaceInset, borderRadius: radius.card, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10, gap: 2 },
        formulaLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
        formulaText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text, letterSpacing: 0.4, lineHeight: 20 },
        formulaOperator: { color: colors.textMuted },
        formulaCite: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
        specText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: 8 },
        specTerm: { fontFamily: fonts.semibold, color: colors.text, letterSpacing: -0.2 },
        table: { marginBottom: 10 },
        tableHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8 },
        tableHeader: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
        tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, borderRadius: radius.toggleInner },
        tableCell: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSecondary },
        tableValue: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text, letterSpacing: 0.2 },
        tableRight: { textAlign: 'right' },
        exampleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 },
        exampleText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
        exampleValue: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.text, letterSpacing: 0.2 },
        note: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.textMuted, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: 9, marginTop: 4 },
        viz: { marginBottom: 10, marginTop: 2 },
        scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
        scaleLabel: { width: 76, fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary },
        scaleTrack: { flex: 1, height: 10, borderRadius: radius.chip, backgroundColor: colors.ringTrack, overflow: 'hidden' },
        scaleFill: { height: '100%', borderRadius: radius.chip },
        scaleValue: { width: 72, fontFamily: fonts.semibold, fontSize: 12.5, color: colors.text, textAlign: 'right' },
        legend: { flexDirection: 'row', gap: 14, marginBottom: 9 },
        legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        legendDot: { width: 8, height: 8, borderRadius: 4 },
        legendLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
        splitTrack: { flex: 1, height: 20, borderRadius: radius.toggleInner, flexDirection: 'row', overflow: 'hidden' },
        splitSegment: { height: '100%', alignItems: 'center', justifyContent: 'center' },
        splitText: { fontFamily: fonts.bold, fontSize: 9.5 },
        miniArea: { height: 64, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
        miniBar: { flex: 1, borderRadius: 3 },
        miniLineArea: { height: 64 },
        miniDot: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5, marginLeft: -3.5 },
        miniGoalLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: colors.textMuted, opacity: 0.7 },
        miniGoalLabel: { position: 'absolute', right: 0, fontFamily: fonts.medium, fontSize: 9.5, color: colors.textMuted },
        miniLabels: { flexDirection: 'row', gap: 6, marginTop: 4 },
        miniLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted },
    })
}
