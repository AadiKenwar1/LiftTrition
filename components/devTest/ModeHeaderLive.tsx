import ModeSwitcher from '@/components/NeutralComponents/ModeSwitcher'
import { fonts, radius, useColors, useColorScheme, type Colors } from '@/context/ThemeContext'
import { useScreenTopPad } from '@/lib/hooks/useScreenTopPad'
import { useMemo, useState, type ComponentType } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Field, Segmented } from './DevControls'
import { resolveNavBg, VariantBoxed, VariantCenteredPill, VariantChrome, VariantGhost, VariantIconOnly, VariantMinimalDot, VariantSegmented, VariantSoftPill, VariantSplit, VariantStacked, VariantStackedFine, VariantTitle, VariantUnderline, VariantUnderlineFine, VariantUppercase, type ModeHeaderProps, type NavBgKey } from './ModeHeaderVariants'

/**
 * Standalone full-screen preview: each mode-header variant sitting at the true top of the screen (under
 * the real status bar, no native nav header above it — swipe right to go back). The body is intentionally
 * empty; this screen exists to judge the header as real top-of-screen chrome. A floating picker at the
 * bottom flips between variants. Dev-only — never imported into shipped code.
 */

// null Comp = render the real shipping ModeSwitcher for side-by-side comparison.
const VARIANTS: { name: string; Comp: ComponentType<ModeHeaderProps> | null }[] = [
    { name: 'Current', Comp: null },
    { name: 'Underline', Comp: VariantUnderline },
    { name: 'Split', Comp: VariantSplit },
    { name: 'Chrome', Comp: VariantChrome },
    { name: 'Title', Comp: VariantTitle },
    { name: 'Soft pill', Comp: VariantSoftPill },
    { name: 'Segmented', Comp: VariantSegmented },
    { name: 'Stacked', Comp: VariantStacked },
    { name: 'Boxed', Comp: VariantBoxed },
    { name: 'Minimal', Comp: VariantMinimalDot },
    { name: 'Centered', Comp: VariantCenteredPill },
    { name: 'Underline·fine', Comp: VariantUnderlineFine },
    { name: 'Stacked·fine', Comp: VariantStackedFine },
    { name: 'Uppercase', Comp: VariantUppercase },
    { name: 'Ghost', Comp: VariantGhost },
    { name: 'Icon only', Comp: VariantIconOnly },
]

// Matches the shipping ModeSwitcher's BAR_GAP so variant top padding lines up with production.
const BAR_GAP = 4

export default function ModeHeaderLive() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const topPad = useScreenTopPad(BAR_GAP)
    const insets = useSafeAreaInsets()
    const [index, setIndex] = useState(0)
    const [mode, setMode] = useState(true)
    const [bgKey, setBgKey] = useState<NavBgKey>('subtle')

    const active = VARIANTS[index]
    // How far the nav bar lifts off the page (theme-aware — see resolveNavBg).
    const bg = resolveNavBg(colors, isDark, bgKey)

    return (
        <View style={styles.screen}>
            {active.Comp ?
                <active.Comp mode={mode} setMode={setMode} topPad={topPad} bg={bg} />
            :   <ModeSwitcher />}

            <View style={styles.body}>
                <Field label="Header background">
                    <Segmented value={bgKey} onChange={setBgKey} options={[{ label: 'Flush', value: 'flush' }, { label: 'Subtle', value: 'subtle' }, { label: 'Elevated', value: 'elevated' }]} />
                </Field>
                <Text style={styles.hint}>Swipe right to go back · tap the tabs to switch mode</Text>
            </View>

            <View style={[styles.pickerWrap, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
                <View style={styles.picker}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
                        {VARIANTS.map((v, i) => {
                            const selected = i === index
                            return (
                                <TouchableOpacity
                                    key={v.name}
                                    onPress={() => setIndex(i)}
                                    activeOpacity={0.7}
                                    style={[styles.chip, selected ? { backgroundColor: colors.workout, borderColor: colors.workout } : { borderColor: colors.hairline }]}
                                >
                                    <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>{v.name}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </View>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        body: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
        },
        hint: {
            fontFamily: fonts.medium,
            fontSize: 13,
            color: colors.textMuted,
            textAlign: 'center',
        },
        // Floating variant picker, anchored to the bottom above the safe-area inset.
        pickerWrap: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
        },
        picker: {
            maxWidth: '94%',
            backgroundColor: colors.surface,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: 6,
            paddingVertical: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 6,
        },
        pickerRow: {
            gap: 6,
            paddingHorizontal: 2,
        },
        chip: {
            paddingVertical: 7,
            paddingHorizontal: 13,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
        },
        chipText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
        },
    })
}
