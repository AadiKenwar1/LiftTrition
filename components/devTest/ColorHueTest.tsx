import { fonts, palettes, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Dev-only investigation: workout's dark/light accent share a hue (~215°), just deepened —
 * they read as "the same blue." Nutrition's dark/light accent didn't (143° vs 120°, plus a much
 * bigger saturation drop) — they read as two different greens. Light-mode nutrition was
 * re-hued to match (see context/ThemeContext/colors.ts); this page keeps the old shipped
 * value around for a before/after comparison.
 */

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    const delta = max - min
    if (delta === 0) return { h: 0, s: 0, l: Math.round(l * 100) }
    const s = delta / (1 - Math.abs(2 * l - 1))
    let h = 0
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

// Previously shipped light-mode green (pure 120° hue) — kept here only for the before/after
// comparison below; palettes.light.nutrition is now the hue-matched 143° value.
const PREVIOUS_LIGHT = '#168516'
const PREVIOUS_LIGHT_DEEP = '#0F7A0F'

function Swatch({ label, hex }: { label: string; hex: string }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const { h, s, l } = hexToHsl(hex)
    return (
        <View style={styles.swatchCol}>
            <View style={[styles.swatch, { backgroundColor: hex }]} />
            <Text style={styles.swatchLabel}>{label}</Text>
            <Text style={styles.swatchHex}>{hex}</Text>
            <Text style={styles.swatchHsl}>
                H{h}° S{s}% L{l}%
            </Text>
        </View>
    )
}

function CtaChip({ label, gradient }: { label: string; gradient: readonly [string, string] }) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    return (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <Text style={styles.ctaText}>{label}</Text>
        </LinearGradient>
    )
}

export default function ColorHueTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Page theme (swatches below are literal, unaffected)">
                <Segmented
                    value={isDark ? 'dark' : 'light'}
                    onChange={(v) => setColorScheme(v as 'light' | 'dark')}
                    options={[
                        { label: 'Light', value: 'light' },
                        { label: 'Dark', value: 'dark' },
                    ]}
                />
            </Field>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Workout — dark vs. light (for reference)</Text>
                <Text style={styles.sectionNote}>Hue barely moves (~1°). Reads as one blue, two intensities.</Text>
                <View style={styles.row}>
                    <Swatch label="Dark" hex={palettes.dark.workout} />
                    <Swatch label="Light" hex={palettes.light.workout} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nutrition — dark vs. light (shipping now)</Text>
                <Text style={styles.sectionNote}>Light re-hued to 143° to match dark — same family as workout's blue pair above.</Text>
                <View style={styles.row}>
                    <Swatch label="Dark" hex={palettes.dark.nutrition} />
                    <Swatch label="Light" hex={palettes.light.nutrition} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nutrition — light, before vs. after</Text>
                <Text style={styles.sectionNote}>Previous shipped a pure 120° hue (23° off dark). Current matches dark's 143° at ~L30 — roughly the same white-text contrast (~4.77:1) as before.</Text>
                <View style={styles.row}>
                    <Swatch label="Previous" hex={PREVIOUS_LIGHT} />
                    <Swatch label="Current" hex={palettes.light.nutrition} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>CTA readability check</Text>
                <Text style={styles.sectionNote}>White text on each light-mode gradient — confirms the new hue still clears AA.</Text>
                <View style={styles.row}>
                    <View style={styles.ctaCol}>
                        <CtaChip label="Log Meal" gradient={[PREVIOUS_LIGHT, PREVIOUS_LIGHT_DEEP]} />
                        <Text style={styles.ctaCaption}>Previous</Text>
                    </View>
                    <View style={styles.ctaCol}>
                        <CtaChip label="Log Meal" gradient={palettes.light.nutritionGradient} />
                        <Text style={styles.ctaCaption}>Current</Text>
                    </View>
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
            gap: 14,
        },
        swatchCol: {
            alignItems: 'center',
        },
        swatch: {
            width: 72,
            height: 72,
            borderRadius: radius.cardLg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        swatchLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.text,
            marginTop: 6,
        },
        swatchHex: {
            fontFamily: fonts.regular,
            fontSize: 11,
            color: colors.textMuted,
            marginTop: 1,
        },
        swatchHsl: {
            fontFamily: fonts.regular,
            fontSize: 10,
            color: colors.textFaint,
            marginTop: 1,
        },
        ctaCol: {
            alignItems: 'center',
            gap: 6,
        },
        cta: {
            width: 140,
            height: 48,
            borderRadius: radius.cardLg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ctaText: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: '#FFFFFF',
            letterSpacing: -0.3,
        },
        ctaCaption: {
            fontFamily: fonts.medium,
            fontSize: 11,
            color: colors.textMuted,
        },
    })
}
