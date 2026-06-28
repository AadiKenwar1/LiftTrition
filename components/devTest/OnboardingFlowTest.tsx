import { fonts } from '@/context/ThemeContext'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { STEPS, TOTAL_DOTS, seedAnswers, type FlowCtx, type MockAnswers } from './onboarding/registry'

/**
 * Dev-only single-screen onboarding preview. Opened from the Dev Hub via `?step=N` (one row per
 * screen), so you jump straight to a screen with no stepping. Renders the real shared view (plus any
 * experimental variants) with mock in-memory data — NO context writes, NO router push, NO RevenueCat,
 * never flips onboardingComplete. No nav header — swipe back (or the screen's own Back) to return.
 * Theme is toggled from the main Dev Hub. The variant-picker bar only appears when a screen has >1 variant;
 * otherwise the screen renders full-bleed, exactly as it ships.
 */
export default function OnboardingFlowTest() {
    const { step } = useLocalSearchParams<{ step?: string }>()
    const idx = Math.min(Math.max(0, Number(step) || 0), STEPS.length - 1)
    const stepDef = STEPS[idx]

    const router = useRouter()
    const insets = useSafeAreaInsets()
    const [store, setStore] = useState<MockAnswers>(seedAnswers)
    const [variantId, setVariantId] = useState(stepDef.variants[0].id)

    const variant = stepDef.variants.find((v) => v.id === variantId) ?? stepDef.variants[0]

    const ctx: FlowCtx = {
        store,
        patch: (p) => setStore((s) => ({ ...s, ...p })),
        next: () => {}, // single-screen preview — the screen's Next/Finish are inert
        back: () => router.back(), // return to the Dev Hub
        stepIndex: stepDef.dot ?? -1,
        totalSteps: TOTAL_DOTS,
    }

    return (
        <View style={styles.root}>
            {stepDef.variants.length > 1 && (
                <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
                    <View style={styles.variantRow}>
                        {stepDef.variants.map((v) => {
                            const sel = v.id === variant.id
                            return (
                                <TouchableOpacity key={v.id} onPress={() => setVariantId(v.id)} style={[styles.variantChip, sel && styles.variantChipSel]} activeOpacity={0.7}>
                                    <Text style={[styles.variantChipText, sel && styles.variantChipTextSel]}>{v.label}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>
            )}

            <View style={styles.screen}>{variant.render(ctx)}</View>
        </View>
    )
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000',
    },
    bar: {
        backgroundColor: '#161616',
        paddingHorizontal: 12,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#2a2a2a',
    },
    variantRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    variantChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#242424',
    },
    variantChipSel: {
        backgroundColor: '#2f80ed',
    },
    variantChipText: {
        fontFamily: fonts.semibold,
        fontSize: 12,
        color: '#aaa',
    },
    variantChipTextSel: {
        color: '#fff',
    },
    screen: {
        flex: 1,
    },
})
