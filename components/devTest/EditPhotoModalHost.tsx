import { useColors, type Colors } from '@/context/ThemeContext'
import { useLocalSearchParams } from 'expo-router'
import { useMemo, type ComponentType } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { VariantAccordion, VariantInset, VariantInsetHeader, VariantInsetSplit, VariantInsetSplitRow, VariantInsetStrip, VariantLedger, VariantServingsChips, VariantServingsField, VariantServingsPill, VariantTiles, type EditPhotoVariantProps, type Scenario } from './EditPhotoVariants'

/**
 * Routes /devTest/editPhotoVariant?variant=X&scenario=Y to a full editPhotoEntry
 * redesign candidate, presented as the same sheet the real screen uses.
 */
const VARIANTS: Record<string, ComponentType<EditPhotoVariantProps>> = {
    ledger: VariantLedger,
    accordion: VariantAccordion,
    tiles: VariantTiles,
    inset: VariantInset,
    insetStrip: VariantInsetStrip,
    insetHeader: VariantInsetHeader,
    insetSplit: VariantInsetSplit,
    insetSplitRow: VariantInsetSplitRow,
    servChips: VariantServingsChips,
    servPill: VariantServingsPill,
    servField: VariantServingsField,
}

const SCENARIOS: Scenario[] = ['default', 'many', 'edge']

export default function EditPhotoModalHost() {
    const { variant, scenario } = useLocalSearchParams<{ variant?: string; scenario?: string }>()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const variantStr = typeof variant === 'string' ? variant : variant?.[0]
    const scenarioStr = typeof scenario === 'string' ? scenario : scenario?.[0]
    const Variant = VARIANTS[variantStr ?? ''] ?? VariantLedger
    const scene: Scenario = SCENARIOS.includes(scenarioStr as Scenario) ? (scenarioStr as Scenario) : 'default'

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <Variant scenario={scene} />
        </KeyboardAvoidingView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
    })
}
