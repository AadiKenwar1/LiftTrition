import PressableScale from '@/components/NeutralComponents/PressableScale'
import { fonts, radius, useColors, withAlpha, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight, Plus, type LucideIcon } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/**
 * Empty-state CTA riffs — replacing the "Tap the ⋮ button to…" instruction on the workout,
 * exercise, and nutrition screens with a placeholder button that does the thing directly.
 *
 * The instruction copy has two problems: it points at chrome the user hasn't found yet (the FAB
 * is a floating ⋮ in the corner), and it makes the first action feel like a second step. A button
 * inside the empty state IS the first action — the screen offers it instead of describing it.
 *
 * The open question each riff answers differently: how loud should that button be? The empty state
 * is the whole screen, so a full-strength gradient CTA is available — but this is a zero-state,
 * not a checkout, and a shouting button on an otherwise calm screen can read as pressure. The
 * "soft" end (tinted fill, outline, dashed slot) treats it as an invitation; the solid end treats
 * it as the primary path.
 *
 * Every riff also has to survive the case where there is nothing to add — a past nutrition date
 * shows informational copy and no button (`cta: null`), so each riff renders that path too.
 */

export type EmptyStateKind = 'workouts' | 'exercises' | 'meals'

export interface EmptyStateData {
    kind: EmptyStateKind
    accent: string
    gradient: readonly [string, string]
    Icon: LucideIcon
    title: string
    /** Button label, or null when this state has nothing to add (past nutrition date). */
    cta: string | null
    /** Shown in place of the button when `cta` is null. */
    fallbackSubtitle?: string
    /** Kept for the baseline riff only — the instruction copy shipping today. */
    hintSubtitle: string
    onPress: () => void
}

/* ── Shared pieces ─────────────────────────────────────────────────────────────── */

// The hero circle every riff opens with, unless the riff deliberately drops or repurposes it.
function HeroCircle({ d, s }: { d: EmptyStateData; s: SharedStyles }) {
    return (
        <View style={[s.circle, { borderColor: d.accent }]}>
            <d.Icon size={56} color={d.accent} strokeWidth={2} />
        </View>
    )
}

// The no-button path — a past nutrition date has nothing to add, so the riff states the fact.
function Fallback({ d, s }: { d: EmptyStateData; s: SharedStyles }) {
    return <Text style={s.subtitle}>{d.fallbackSubtitle}</Text>
}

/* ── 0 · Baseline — the instruction copy shipping today ────────────────────────── */

export function HintBaseline(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    return (
        <View style={s.wrap}>
            <HeroCircle d={d} s={s} />
            <Text style={s.title}>{d.title}</Text>
            <Text style={s.subtitle}>{d.cta ? d.hintSubtitle : d.fallbackSubtitle}</Text>
        </View>
    )
}

/* ── 1 · Soft pill — accent wash, accent label ─────────────────────────────────── */

export function SoftPill(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    return (
        <View style={s.wrap}>
            <HeroCircle d={d} s={s} />
            <Text style={s.title}>{d.title}</Text>
            {d.cta ?
                <PressableScale onPress={d.onPress} accessibilityRole="button" accessibilityLabel={d.cta} style={[s.pill, { backgroundColor: withAlpha(d.accent, 0.13) }]}>
                    <Plus size={18} color={d.accent} strokeWidth={2.6} />
                    <Text style={[s.pillLabel, { color: d.accent }]}>{d.cta}</Text>
                </PressableScale>
            :   <Fallback d={d} s={s} />}
        </View>
    )
}

/* ── 2 · Solid gradient — the app's primary CTA fill ───────────────────────────── */

export function SolidPill(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    return (
        <View style={s.wrap}>
            <HeroCircle d={d} s={s} />
            <Text style={s.title}>{d.title}</Text>
            {d.cta ?
                <PressableScale onPress={d.onPress} accessibilityRole="button" accessibilityLabel={d.cta} style={s.gradientWrap}>
                    <LinearGradient colors={d.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pill}>
                        <Plus size={18} color="#fff" strokeWidth={2.6} />
                        <Text style={[s.pillLabel, { color: '#fff' }]}>{d.cta}</Text>
                    </LinearGradient>
                </PressableScale>
            :   <Fallback d={d} s={s} />}
        </View>
    )
}

/* ── 3 · Outline pill — card surface, accent edge ──────────────────────────────── */

export function OutlinePill(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    return (
        <View style={s.wrap}>
            <HeroCircle d={d} s={s} />
            <Text style={s.title}>{d.title}</Text>
            {d.cta ?
                <PressableScale onPress={d.onPress} accessibilityRole="button" accessibilityLabel={d.cta} style={[s.pill, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: d.accent }]}>
                    <Plus size={18} color={d.accent} strokeWidth={2.6} />
                    <Text style={[s.pillLabel, { color: d.accent }]}>{d.cta}</Text>
                </PressableScale>
            :   <Fallback d={d} s={s} />}
        </View>
    )
}

/* ── 4 · Ghost row — quiet full-width card, chevron affordance ─────────────────── */

export function GhostRow(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    return (
        <View style={s.wrap}>
            <HeroCircle d={d} s={s} />
            <Text style={s.title}>{d.title}</Text>
            {d.cta ?
                <PressableScale onPress={d.onPress} accessibilityRole="button" accessibilityLabel={d.cta} style={s.row}>
                    <Plus size={18} color={d.accent} strokeWidth={2.6} />
                    <Text style={[s.rowLabel, { color: colors.text }]}>{d.cta}</Text>
                    <ChevronRight size={18} color={colors.chevron} strokeWidth={2} />
                </PressableScale>
            :   <Fallback d={d} s={s} />}
        </View>
    )
}

/* ── 5 · Dashed slot — reads as an empty place waiting to be filled ────────────── */

export function DashedSlot(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    return (
        <View style={s.wrap}>
            <HeroCircle d={d} s={s} />
            <Text style={s.title}>{d.title}</Text>
            {d.cta ?
                <PressableScale
                    onPress={d.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={d.cta}
                    style={[s.slot, { borderColor: withAlpha(d.accent, 0.55), backgroundColor: withAlpha(d.accent, 0.05) }]}
                >
                    <View style={[s.slotIcon, { backgroundColor: withAlpha(d.accent, 0.14) }]}>
                        <Plus size={20} color={d.accent} strokeWidth={2.6} />
                    </View>
                    <Text style={[s.rowLabel, { color: d.accent }]}>{d.cta}</Text>
                </PressableScale>
            :   <Fallback d={d} s={s} />}
        </View>
    )
}

/* ── 6 · Pressable hero — the circle itself is the button ──────────────────────── */

export function PressableHero(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    if (!d.cta) {
        return (
            <View style={s.wrap}>
                <HeroCircle d={d} s={s} />
                <Text style={s.title}>{d.title}</Text>
                <Fallback d={d} s={s} />
            </View>
        )
    }
    return (
        <View style={s.wrap}>
            <PressableScale onPress={d.onPress} accessibilityRole="button" accessibilityLabel={d.cta} scaleTo={0.94} style={s.heroPress}>
                <View style={[s.circle, { marginBottom: 0, borderColor: d.accent, backgroundColor: withAlpha(d.accent, 0.1) }]}>
                    <d.Icon size={54} color={d.accent} strokeWidth={2} />
                </View>
                <View style={[s.badge, { backgroundColor: d.accent, borderColor: colors.background }]}>
                    <Plus size={17} color="#fff" strokeWidth={3} />
                </View>
            </PressableScale>
            <Text style={s.title}>{d.title}</Text>
            <Text style={[s.subtitle, { color: d.accent, fontFamily: fonts.semibold }]}>{d.cta}</Text>
        </View>
    )
}

/* ── 7 · Icon-tile card — the app's card language, full width ──────────────────── */

export function IconTileCard(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    return (
        <View style={s.wrap}>
            <HeroCircle d={d} s={s} />
            <Text style={s.title}>{d.title}</Text>
            {d.cta ?
                <PressableScale onPress={d.onPress} accessibilityRole="button" accessibilityLabel={d.cta} style={s.card}>
                    <View style={[s.tile, { backgroundColor: withAlpha(d.accent, 0.14) }]}>
                        <Plus size={20} color={d.accent} strokeWidth={2.6} />
                    </View>
                    <Text style={[s.rowLabel, { color: colors.text, flex: 1 }]}>{d.cta}</Text>
                    <ChevronRight size={18} color={colors.chevron} strokeWidth={2} />
                </PressableScale>
            :   <Fallback d={d} s={s} />}
        </View>
    )
}

/* ── 8 · Compact — no hero circle, the button carries the screen ───────────────── */

export function CompactSoftPill(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    return (
        <View style={s.wrap}>
            <View style={[s.miniCircle, { backgroundColor: withAlpha(d.accent, 0.12) }]}>
                <d.Icon size={26} color={d.accent} strokeWidth={2.2} />
            </View>
            <Text style={[s.title, { fontSize: 21, marginBottom: 10 }]}>{d.title}</Text>
            {d.cta ?
                <PressableScale onPress={d.onPress} accessibilityRole="button" accessibilityLabel={d.cta} style={[s.pill, { backgroundColor: withAlpha(d.accent, 0.13) }]}>
                    <Plus size={18} color={d.accent} strokeWidth={2.6} />
                    <Text style={[s.pillLabel, { color: d.accent }]}>{d.cta}</Text>
                </PressableScale>
            :   <Fallback d={d} s={s} />}
        </View>
    )
}

/* ── 9 · Soft pill + FAB hint — keeps the chrome discoverable ──────────────────── */

export function SoftPillWithHint(d: EmptyStateData) {
    const colors = useColors()
    const s = useMemo(() => makeShared(colors), [colors])
    return (
        <View style={s.wrap}>
            <HeroCircle d={d} s={s} />
            <Text style={s.title}>{d.title}</Text>
            {d.cta ?
                <>
                    <PressableScale onPress={d.onPress} accessibilityRole="button" accessibilityLabel={d.cta} style={[s.pill, { backgroundColor: withAlpha(d.accent, 0.13) }]}>
                        <Plus size={18} color={d.accent} strokeWidth={2.6} />
                        <Text style={[s.pillLabel, { color: d.accent }]}>{d.cta}</Text>
                    </PressableScale>
                    <Text style={s.footnote}>Or use the ⋮ button anytime</Text>
                </>
            :   <Fallback d={d} s={s} />}
        </View>
    )
}

/* ── Styles ────────────────────────────────────────────────────────────────────── */

type SharedStyles = ReturnType<typeof makeShared>

function makeShared(colors: Colors) {
    return StyleSheet.create({
        wrap: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
            alignSelf: 'stretch',
        },
        circle: {
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: colors.iconCircleBg,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
            borderWidth: 2,
        },
        miniCircle: {
            width: 52,
            height: 52,
            borderRadius: 26,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 14,
        },
        title: {
            fontSize: 26,
            color: colors.text,
            marginBottom: 16,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.extrabold,
        },
        subtitle: {
            fontSize: 15,
            color: colors.labelMuted,
            textAlign: 'center',
            lineHeight: 22,
            fontFamily: fonts.regular,
        },
        footnote: {
            fontSize: 13,
            color: colors.labelMuted,
            textAlign: 'center',
            marginTop: 12,
            fontFamily: fonts.regular,
        },
        pill: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 13,
            paddingHorizontal: 22,
            borderRadius: radius.chip,
        },
        pillLabel: {
            fontSize: 15,
            fontFamily: fonts.bold,
            letterSpacing: -0.2,
        },
        // The gradient needs the radius on a clipping parent — PressableScale animates the transform only.
        gradientWrap: {
            borderRadius: radius.chip,
            overflow: 'hidden',
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            alignSelf: 'stretch',
            paddingVertical: 15,
            paddingHorizontal: 18,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        rowLabel: {
            fontSize: 15,
            fontFamily: fonts.semibold,
            letterSpacing: -0.2,
        },
        slot: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            alignSelf: 'stretch',
            paddingVertical: 18,
            paddingHorizontal: 18,
            borderRadius: radius.cardLg,
            borderWidth: 1.5,
            borderStyle: 'dashed',
        },
        slotIcon: {
            width: 34,
            height: 34,
            borderRadius: radius.iconTile,
            justifyContent: 'center',
            alignItems: 'center',
        },
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            alignSelf: 'stretch',
            paddingVertical: 14,
            paddingHorizontal: 14,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        tile: {
            width: 36,
            height: 36,
            borderRadius: radius.iconTile,
            justifyContent: 'center',
            alignItems: 'center',
        },
        heroPress: {
            marginBottom: 24,
        },
        badge: {
            position: 'absolute',
            right: -2,
            bottom: 2,
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 3,
            justifyContent: 'center',
            alignItems: 'center',
        },
    })
}
