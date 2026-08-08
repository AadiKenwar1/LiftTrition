import { fonts, radius, useColors, useColorScheme, withAlpha, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { Dumbbell, Nut } from 'lucide-react-native'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

/**
 * Dev-only mode-switcher explorations. Where the shipping ModeSwitcher is a centered *floating pill*,
 * these variants reframe mode switching as an actual top header / tab bar — edge-to-edge chrome with a
 * bottom divider — so it reads as the screen's header rather than a control sitting on top of it.
 * Kept in components/devTest so Metro strips them from production. Once a direction wins, fold it into
 * components/NeutralComponents/ModeSwitcher.tsx and delete this file.
 */

export interface ModeHeaderProps {
    // true = Workout/Lift, false = Nutrition (matches useSettings().mode)
    mode: boolean
    setMode: (v: boolean) => void
    // Simulated status-bar inset for the preview; real usage would use useScreenTopPad().
    topPad?: number
    // Nav-bar background so the header reads as elevated chrome above the page. Defaults to the elevated
    // surface; pass colors.surfaceInset for a subtler lift, or colors.background to sit flush. Ignored by
    // the gradient "Chrome" variant, which fills the whole bar.
    bg?: string
}

interface ModeMeta {
    isLift: boolean
    label: string
    Icon: typeof Dumbbell
    gradient: readonly [string, string]
    accent: string
    rotate: boolean
}

// Build the two mode descriptors from the active palette.
function getModes(colors: Colors): ModeMeta[] {
    return [
        { isLift: true, label: 'Workout', Icon: Dumbbell, gradient: colors.workoutGradient, accent: colors.workout, rotate: true },
        { isLift: false, label: 'Nutrition', Icon: Nut, gradient: colors.nutritionGradient, accent: colors.nutrition, rotate: false },
    ]
}

// Linear blend between two #RRGGBB hexes (t=0 → a, t=1 → b).
function mixHex(a: string, b: string, t: number): string {
    const pa = a.replace('#', '')
    const pb = b.replace('#', '')
    const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16)
    const r = Math.round(ch(pa, 0) + (ch(pb, 0) - ch(pa, 0)) * t)
    const g = Math.round(ch(pa, 2) + (ch(pb, 2) - ch(pa, 2)) * t)
    const bl = Math.round(ch(pa, 4) + (ch(pb, 4) - ch(pa, 4)) * t)
    return `rgb(${r}, ${g}, ${bl})`
}

export type NavBgKey = 'flush' | 'subtle' | 'elevated'

/**
 * Resolve the nav-bar background for a lift level. In LIGHT mode a "subtle" lift must travel most of the
 * way to the white surface to read as elevated — light backgrounds compress perceived contrast, so the
 * darker surfaceInset that reads well in dark mode looks like a flat gray band in light. Dark keeps
 * surfaceInset. Derived from palette tokens so it tracks any theme change.
 */
export function resolveNavBg(colors: Colors, isDark: boolean, key: NavBgKey): string {
    if (key === 'flush') return colors.background
    if (key === 'elevated') return colors.surface
    return isDark ? colors.surfaceInset : mixHex(colors.background, colors.surface, 0.6)
}

const ICON = 20
const STROKE = 2.2

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Underline Tabs — classic Material-style top tab bar. Icon + label per tab,
//     an accent underline slides under the active one, full-width bottom divider.
export function VariantUnderline({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[U.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={U.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <Pressable key={m.label} style={U.tab} onPress={() => setMode(m.isLift)}>
                            <View style={U.tabInner}>
                                <m.Icon size={ICON} color={tint} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                                <Text style={[U.label, { color: tint, fontFamily: active ? fonts.bold : fonts.semibold }]}>{m.label}</Text>
                            </View>
                            <View style={[U.underline, { backgroundColor: active ? m.accent : 'transparent' }]} />
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

const U = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row' },
    tab: { flex: 1, alignItems: 'center' },
    tabInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13 },
    label: { fontSize: 15 },
    underline: { height: 3, width: '55%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 · Split Header — the bar is split into two full-height halves; the active half
//     is filled with its mode gradient, the inactive half stays plain. Two-tone chrome.
export function VariantSplit({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[S.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={S.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const content = (
                        <View style={S.tabInner}>
                            <m.Icon size={ICON} color={active ? '#FFFFFF' : colors.tabInactive} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                            <Text style={[S.label, { color: active ? '#FFFFFF' : colors.tabInactive }]}>{m.label}</Text>
                        </View>
                    )
                    return active ?
                            <Pressable key={m.label} style={S.tab} onPress={() => setMode(m.isLift)}>
                                <LinearGradient colors={m.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.fill}>
                                    {content}
                                </LinearGradient>
                            </Pressable>
                        :   <Pressable key={m.label} style={[S.tab, S.fill]} onPress={() => setMode(m.isLift)}>
                                {content}
                            </Pressable>
                })}
            </View>
        </View>
    )
}

const S = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row' },
    tab: { flex: 1, overflow: 'hidden' },
    fill: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    tabInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    label: { fontSize: 15, fontFamily: fonts.bold },
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Colored Chrome — the entire bar becomes the active mode's gradient. Both labels
//     show; active is solid white, inactive is translucent white. Branded app-chrome header.
export function VariantChrome({ mode, setMode, topPad = 0 }: ModeHeaderProps) {
    const colors = useColors()
    const modes = getModes(colors)
    const activeGradient = (mode ? modes[0] : modes[1]).gradient
    return (
        <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[C.bar, { paddingTop: topPad }]}>
            <View style={C.row}>
                {modes.map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? '#FFFFFF' : 'rgba(255,255,255,0.6)'
                    return (
                        <Pressable key={m.label} style={C.tab} onPress={() => setMode(m.isLift)}>
                            <m.Icon size={ICON} color={tint} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                            <Text style={[C.label, { color: tint, fontFamily: active ? fonts.bold : fonts.semibold }]}>{m.label}</Text>
                        </Pressable>
                    )
                })}
            </View>
        </LinearGradient>
    )
}

const C = StyleSheet.create({
    bar: {},
    row: { flexDirection: 'row' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    label: { fontSize: 15 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 · Title + Toggle — an iOS large-title header: the mode name as a big accent title on
//     the left, a compact two-icon pill on the right. The title itself signals the mode.
export function VariantTitle({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    const modes = getModes(colors)
    const activeMeta = mode ? modes[0] : modes[1]
    return (
        <View style={[T.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={T.row}>
                <Text style={[T.title, { color: activeMeta.accent }]}>{activeMeta.label}</Text>
                <View style={[T.pill, { backgroundColor: colors.toggleTrack, borderColor: colors.hairline }]}>
                    {modes.map((m) => {
                        const active = mode === m.isLift
                        return active ?
                                <Pressable key={m.label} onPress={() => setMode(m.isLift)} style={T.pillBtn}>
                                    <LinearGradient colors={m.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={T.pillFill}>
                                        <m.Icon size={18} color="#FFFFFF" strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                                    </LinearGradient>
                                </Pressable>
                            :   <Pressable key={m.label} onPress={() => setMode(m.isLift)} style={[T.pillBtn, T.pillInactive]}>
                                    <m.Icon size={18} color={colors.tabInactive} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                                </Pressable>
                    })}
                </View>
            </View>
        </View>
    )
}

const T = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
    title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5 },
    pill: { flexDirection: 'row', borderRadius: radius.toggle, borderWidth: StyleSheet.hairlineWidth, padding: 3, gap: 3 },
    pillBtn: { borderRadius: radius.toggleInner, overflow: 'hidden' },
    pillFill: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center' },
    pillInactive: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center' },
})

// ─────────────────────────────────────────────────────────────────────────────
// 5 · Soft Pill Tabs — full-width header surface with a bottom divider; the active tab is a
//     soft accent-tinted rounded pill (accent icon + label), inactive stays plain. Segmented-in-header.
export function VariantSoftPill({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    return (
        <View style={[P.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={P.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <Pressable
                            key={m.label}
                            style={[P.tab, active && { backgroundColor: withAlpha(m.accent, isDark ? 0.18 : 0.12) }]}
                            onPress={() => setMode(m.isLift)}
                        >
                            <m.Icon size={ICON} color={tint} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                            <Text style={[P.label, { color: tint, fontFamily: active ? fonts.bold : fonts.semibold }]}>{m.label}</Text>
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

const P = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingBottom: 8 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: radius.card },
    label: { fontSize: 15 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 6 · Segmented — an iOS-style sliding segmented control docked as a header: full-width track,
//     the active half is a solid gradient pill, inactive is muted text. Bottom divider.
export function VariantSegmented({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[SG.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={[SG.track, { backgroundColor: colors.toggleTrack, borderColor: colors.hairline }]}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const content = (
                        <View style={SG.inner}>
                            <m.Icon size={18} color={active ? '#FFFFFF' : colors.tabInactive} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                            <Text style={[SG.label, { color: active ? '#FFFFFF' : colors.tabInactive }]}>{m.label}</Text>
                        </View>
                    )
                    return active ?
                            <Pressable key={m.label} style={SG.seg} onPress={() => setMode(m.isLift)}>
                                <LinearGradient colors={m.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={SG.fill}>
                                    {content}
                                </LinearGradient>
                            </Pressable>
                        :   <Pressable key={m.label} style={[SG.seg, SG.fill]} onPress={() => setMode(m.isLift)}>
                                {content}
                            </Pressable>
                })}
            </View>
        </View>
    )
}

const SG = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8 },
    track: { flexDirection: 'row', marginHorizontal: 10, borderRadius: radius.toggle, borderWidth: StyleSheet.hairlineWidth, padding: 4, gap: 4 },
    seg: { flex: 1, borderRadius: radius.toggleInner, overflow: 'hidden' },
    fill: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    inner: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    label: { fontSize: 15, fontFamily: fonts.bold },
})

// ─────────────────────────────────────────────────────────────────────────────
// 7 · Stacked tabs — icon stacked over label, taller tab-bar feel, an accent underline on the active
//     tab. This is the bottom-tab-bar look moved to the top.
export function VariantStacked({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[STK.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={STK.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <Pressable key={m.label} style={STK.tab} onPress={() => setMode(m.isLift)}>
                            <View style={STK.inner}>
                                <m.Icon size={22} color={tint} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                                <Text style={[STK.label, { color: tint, fontFamily: active ? fonts.bold : fonts.semibold }]}>{m.label}</Text>
                            </View>
                            <View style={[STK.underline, { backgroundColor: active ? m.accent : 'transparent' }]} />
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

const STK = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row' },
    tab: { flex: 1, alignItems: 'center' },
    inner: { alignItems: 'center', gap: 3, paddingTop: 8, paddingBottom: 9 },
    label: { fontSize: 12 },
    underline: { height: 3, width: '46%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 8 · Boxed — the active tab is a filled accent-tinted box with a thick accent bar along its TOP edge
//     (indicator on top instead of underline). Reads like a filing-tab / boxed header.
export function VariantBoxed({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    return (
        <View style={[BX.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={BX.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <Pressable
                            key={m.label}
                            onPress={() => setMode(m.isLift)}
                            style={[BX.tab, { borderTopColor: active ? m.accent : 'transparent', backgroundColor: active ? withAlpha(m.accent, isDark ? 0.16 : 0.1) : 'transparent' }]}
                        >
                            <m.Icon size={ICON} color={tint} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                            <Text style={[BX.label, { color: tint, fontFamily: active ? fonts.bold : fonts.semibold }]}>{m.label}</Text>
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

const BX = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderTopWidth: 3 },
    label: { fontSize: 15 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 9 · Minimal — clean text-only tabs split by a thin vertical divider, a small accent dot under the
//     active one. The lightest-weight header.
export function VariantMinimalDot({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    const modes = getModes(colors)
    return (
        <View style={[MD.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={MD.row}>
                {modes.map((m, i) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <View key={m.label} style={MD.cell}>
                            {i === 1 ? <View style={[MD.vDivider, { backgroundColor: colors.divider }]} /> : null}
                            <Pressable style={MD.tab} onPress={() => setMode(m.isLift)}>
                                <Text style={[MD.label, { color: tint, fontFamily: active ? fonts.bold : fonts.semibold }]}>{m.label}</Text>
                                <View style={[MD.dot, { backgroundColor: active ? m.accent : 'transparent' }]} />
                            </Pressable>
                        </View>
                    )
                })}
            </View>
        </View>
    )
}

const MD = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row' },
    cell: { flex: 1 },
    vDivider: { position: 'absolute', left: 0, top: 10, bottom: 10, width: StyleSheet.hairlineWidth },
    tab: { alignItems: 'center', paddingVertical: 12 },
    label: { fontSize: 15 },
    dot: { marginTop: 6, width: 6, height: 6, borderRadius: 3 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 10 · Centered pill — the shipping floating pill given labels and docked into a header (bottom divider),
//      centered rather than stretched full-width. Bridges the current control into real chrome.
export function VariantCenteredPill({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[CP.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={[CP.group, { backgroundColor: colors.toggleTrack, borderColor: colors.hairline }]}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const content = (
                        <View style={CP.inner}>
                            <m.Icon size={18} color={active ? '#FFFFFF' : colors.tabInactive} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                            <Text style={[CP.label, { color: active ? '#FFFFFF' : colors.tabInactive }]}>{m.label}</Text>
                        </View>
                    )
                    return active ?
                            <Pressable key={m.label} style={CP.btn} onPress={() => setMode(m.isLift)}>
                                <LinearGradient colors={m.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={CP.fill}>
                                    {content}
                                </LinearGradient>
                            </Pressable>
                        :   <Pressable key={m.label} style={[CP.btn, CP.fill]} onPress={() => setMode(m.isLift)}>
                                {content}
                            </Pressable>
                })}
            </View>
        </View>
    )
}

const CP = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8, alignItems: 'center' },
    group: { flexDirection: 'row', alignSelf: 'center', borderRadius: radius.toggle, borderWidth: StyleSheet.hairlineWidth, padding: 4, gap: 4 },
    btn: { borderRadius: radius.toggleInner, overflow: 'hidden' },
    fill: { paddingVertical: 9, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
    inner: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    label: { fontSize: 15, fontFamily: fonts.bold },
})

// ─────────────────────────────────────────────────────────────────────────────
// 11 · Underline · Fine — the Underline direction refined: text-only, letter-spaced labels, and a short
//      thin pill indicator instead of a wide bar. Sleeker, more editorial.
export function VariantUnderlineFine({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[UF.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={UF.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <Pressable key={m.label} style={UF.tab} onPress={() => setMode(m.isLift)}>
                            <Text style={[UF.label, { color: tint, fontFamily: active ? fonts.semibold : fonts.medium }]}>{m.label}</Text>
                            <View style={[UF.underline, { backgroundColor: active ? m.accent : 'transparent' }]} />
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

const UF = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row' },
    tab: { flex: 1, alignItems: 'center', paddingTop: 15 },
    label: { fontSize: 14, letterSpacing: 0.3 },
    underline: { marginTop: 11, height: 2, width: 22, borderRadius: 2 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 12 · Stacked · Fine — the Stacked direction refined: smaller icon over a tiny uppercase tracked label,
//      with a short thin indicator. Keeps the tab-bar feel but far lighter.
export function VariantStackedFine({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[SF.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={SF.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <Pressable key={m.label} style={SF.tab} onPress={() => setMode(m.isLift)}>
                            <View style={SF.inner}>
                                <m.Icon size={19} color={tint} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                                <Text style={[SF.label, { color: tint, fontFamily: active ? fonts.bold : fonts.semibold }]}>{m.label}</Text>
                            </View>
                            <View style={[SF.underline, { backgroundColor: active ? m.accent : 'transparent' }]} />
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

const SF = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row' },
    tab: { flex: 1, alignItems: 'center' },
    inner: { alignItems: 'center', gap: 4, paddingTop: 9 },
    label: { fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase' },
    underline: { marginTop: 9, height: 2, width: 20, borderRadius: 2 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 13 · Uppercase — editorial tracked-caps tabs: small uppercase labels with a tiny icon, and a precise
//      full-width accent indicator on the active tab's bottom edge.
export function VariantUppercase({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[UC.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={UC.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <Pressable key={m.label} style={UC.tab} onPress={() => setMode(m.isLift)}>
                            <m.Icon size={16} color={tint} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                            <Text style={[UC.label, { color: tint, fontFamily: active ? fonts.bold : fonts.semibold }]}>{m.label}</Text>
                            <View style={[UC.indicator, { backgroundColor: active ? m.accent : 'transparent' }]} />
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

const UC = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 15 },
    label: { fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
    indicator: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 14 · Ghost — the lightest touch: the active tab is a hairline accent-outlined pill with a transparent
//      fill, so nothing is heavier than a thin line. Very sleek.
export function VariantGhost({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[GH.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={GH.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <Pressable key={m.label} style={[GH.tab, { borderColor: active ? m.accent : 'transparent' }]} onPress={() => setMode(m.isLift)}>
                            <m.Icon size={17} color={tint} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                            <Text style={[GH.label, { color: tint, fontFamily: active ? fonts.bold : fonts.semibold }]}>{m.label}</Text>
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

const GH = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingBottom: 9 },
    row: { flexDirection: 'row', gap: 8 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 9, borderRadius: radius.chip, borderWidth: 1 },
    label: { fontSize: 14 },
})

// ─────────────────────────────────────────────────────────────────────────────
// 15 · Icon only — pared to just the two glyphs with a short thin indicator under the active one. The most
//      compact, most minimal header.
export function VariantIconOnly({ mode, setMode, topPad = 0, bg }: ModeHeaderProps) {
    const colors = useColors()
    return (
        <View style={[IO.bar, { paddingTop: topPad, backgroundColor: bg ?? colors.surface, borderBottomColor: colors.divider }]}>
            <View style={IO.row}>
                {getModes(colors).map((m) => {
                    const active = mode === m.isLift
                    const tint = active ? m.accent : colors.tabInactive
                    return (
                        <Pressable key={m.label} style={IO.tab} onPress={() => setMode(m.isLift)}>
                            <m.Icon size={22} color={tint} strokeWidth={STROKE} style={m.rotate ? styles.rotate : undefined} />
                            <View style={[IO.underline, { backgroundColor: active ? m.accent : 'transparent' }]} />
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

const IO = StyleSheet.create({
    bar: { borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row' },
    tab: { flex: 1, alignItems: 'center', paddingTop: 13 },
    underline: { marginTop: 10, height: 2, width: 18, borderRadius: 2 },
})

const styles = StyleSheet.create({
    rotate: { transform: [{ rotate: '45deg' }] },
})
