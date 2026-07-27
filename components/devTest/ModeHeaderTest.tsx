import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useMemo, useState, type ComponentType } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import ModeSwitcher from '@/components/NeutralComponents/ModeSwitcher'
import { Field, Segmented } from './DevControls'
import { resolveNavBg, VariantBoxed, VariantCenteredPill, VariantChrome, VariantGhost, VariantIconOnly, VariantMinimalDot, VariantSegmented, VariantSoftPill, VariantSplit, VariantStacked, VariantStackedFine, VariantTitle, VariantUnderline, VariantUnderlineFine, VariantUppercase, type ModeHeaderProps, type NavBgKey } from './ModeHeaderVariants'

/**
 * Dev Hub host for the "mode switcher as a real top header" explorations. Each variant is docked to the
 * top of a mock phone screen (fake status-bar inset + skeleton body) so it reads as actual chrome, not a
 * floating control. The mode toggles across every frame at once, and the Current shipping pill is shown
 * for comparison.
 */

// Simulated status-bar inset so the bars read as top chrome inside the mock screen.
const FAKE_INSET = 14

const VARIANTS: { name: string; Comp: ComponentType<ModeHeaderProps> }[] = [
    { name: '1 · Underline tabs', Comp: VariantUnderline },
    { name: '2 · Split header (two-tone)', Comp: VariantSplit },
    { name: '3 · Colored chrome', Comp: VariantChrome },
    { name: '4 · Large title + toggle', Comp: VariantTitle },
    { name: '5 · Soft pill tabs', Comp: VariantSoftPill },
    { name: '6 · Segmented (sliding)', Comp: VariantSegmented },
    { name: '7 · Stacked tabs', Comp: VariantStacked },
    { name: '8 · Boxed (top indicator)', Comp: VariantBoxed },
    { name: '9 · Minimal + dot', Comp: VariantMinimalDot },
    { name: '10 · Centered pill', Comp: VariantCenteredPill },
    { name: '11 · Underline · fine (sleek)', Comp: VariantUnderlineFine },
    { name: '12 · Stacked · fine (sleek)', Comp: VariantStackedFine },
    { name: '13 · Uppercase (editorial)', Comp: VariantUppercase },
    { name: '14 · Ghost (outline pill)', Comp: VariantGhost },
    { name: '15 · Icon only', Comp: VariantIconOnly },
]

export default function ModeHeaderTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [mode, setMode] = useState(true)
    const [bgKey, setBgKey] = useState<NavBgKey>('subtle')

    // How far the nav bar lifts off the page (theme-aware — see resolveNavBg).
    const bg = resolveNavBg(colors, isDark, bgKey)

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            <Field label="Mode (also tap the tabs)">
                <Segmented value={mode ? 'lift' : 'nutrition'} onChange={(v) => setMode(v === 'lift')} options={[{ label: 'Workout', value: 'lift' }, { label: 'Nutrition', value: 'nutrition' }]} />
            </Field>
            <Field label="Header background">
                <Segmented value={bgKey} onChange={setBgKey} options={[{ label: 'Flush', value: 'flush' }, { label: 'Subtle', value: 'subtle' }, { label: 'Elevated', value: 'elevated' }]} />
            </Field>

            <View style={styles.slot}>
                <Text style={styles.slotLabel}>Current (shipping)</Text>
                <MockScreen colors={colors}>
                    <View style={{ paddingTop: FAKE_INSET }} />
                    <ModeSwitcher />
                </MockScreen>
            </View>

            {VARIANTS.map(({ name, Comp }) => (
                <View key={name} style={styles.slot}>
                    <Text style={styles.slotLabel}>{name}</Text>
                    <MockScreen colors={colors}>
                        <Comp mode={mode} setMode={setMode} topPad={FAKE_INSET} bg={bg} />
                        <MockBody colors={colors} />
                    </MockScreen>
                </View>
            ))}
        </ScrollView>
    )
}

// A rounded phone-screen frame that clips its children so a full-bleed header reads as docked chrome.
function MockScreen({ colors, children }: { colors: Colors; children: React.ReactNode }) {
    return <View style={[frame.screen, { backgroundColor: colors.background, borderColor: colors.hairline }]}>{children}</View>
}

// Skeleton page content under the header so the frame reads as a real screen.
function MockBody({ colors }: { colors: Colors }) {
    return (
        <View style={frame.body}>
            <View style={[frame.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]} />
            <View style={frame.gridRow}>
                <View style={[frame.cell, { backgroundColor: colors.surface, borderColor: colors.hairline }]} />
                <View style={[frame.cell, { backgroundColor: colors.surface, borderColor: colors.hairline }]} />
                <View style={[frame.cell, { backgroundColor: colors.surface, borderColor: colors.hairline }]} />
            </View>
        </View>
    )
}

const frame = StyleSheet.create({
    screen: {
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    body: { padding: 12, gap: 10 },
    card: { height: 88, borderRadius: radius.cardLg, borderWidth: StyleSheet.hairlineWidth },
    gridRow: { flexDirection: 'row', gap: 10 },
    cell: { flex: 1, height: 52, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth },
})

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
        slot: {
            marginTop: 20,
        },
        slotLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 8,
            marginLeft: 2,
        },
    })
}
