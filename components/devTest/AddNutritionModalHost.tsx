import { useColors, type Colors } from '@/context/ThemeContext'
import { useLocalSearchParams } from 'expo-router'
import { useMemo, type ComponentType } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { VariantAiComposer, VariantAiResultCard, VariantAiReveal } from './AddNutritionAiVariants'
import { VariantAiCollapse, VariantAiInsetPanel, VariantAiLedger } from './AddNutritionManualVariants'
import { VariantAiFirst, VariantLeanForm, VariantMacroGrid, type AddNutritionVariantProps } from './AddNutritionVariants'

/**
 * Routes /devTest/addNutritionVariant?variant=X&tier=Y to a full add-nutrition modal
 * alternative. Presented with the same modalPresentation as the real
 * nutritionScreens/addNutritionModal so the sheet looks and dismisses identically.
 */
const VARIANTS: Record<string, ComponentType<AddNutritionVariantProps>> = {
    lean: VariantLeanForm,
    grid: VariantMacroGrid,
    ai: VariantAiFirst,
    aiReveal: VariantAiReveal,
    aiComposer: VariantAiComposer,
    aiCard: VariantAiResultCard,
    aiLedger: VariantAiLedger,
    aiInset: VariantAiInsetPanel,
    aiCollapse: VariantAiCollapse,
}

export default function AddNutritionModalHost() {
    const { variant, tier } = useLocalSearchParams<{ variant?: string; tier?: string }>()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const variantStr = typeof variant === 'string' ? variant : variant?.[0]
    const tierStr = typeof tier === 'string' ? tier : tier?.[0]
    const Variant = VARIANTS[variantStr ?? ''] ?? VariantLeanForm

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <Variant hasPremium={tierStr !== 'free'} />
        </KeyboardAvoidingView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
        },
    })
}
