import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import type { ColorScheme, Colors } from '@/context/ThemeContext/types'

/**
 * Dev-only switch that swaps the brand accents for a candidate set app-wide, so a
 * proposal is judged on real screens (CTAs, charts, numerals, teaser gates) rather
 * than on swatches. Persists across restarts; the Accent Contrast dev page shows a
 * loud indicator while a set is applied. Like forceFreeMode this must be readable
 * synchronously (ThemeProvider's palette is a useMemo), hence the hydrated module
 * state + subscription + hook. In production __DEV__ is statically false, so every
 * function no-ops and the hook always returns 'off'.
 */

const STORAGE_KEY = 'devAccentPreview'

/** Which accents the app renders with: 'off' is the shipped palette in colors.ts. */
export type AccentSet = 'off' | 'aa' | 'matched'

/**
 * The candidates, as per-scheme patches over palettes in
 * context/ThemeContext/colors.ts — only the tokens that change are listed.
 * The 'matched' set has been promoted into colors.ts, so applying it is a
 * no-op; both sets are kept for now so the review page can still compare.
 */
export const ACCENT_SETS = {
    /**
     * Minimal AA repair, historical: authored against the pre-matched palette (its
     * inner comments cite those values). Fixed the one token that failed as small
     * text on light and closed the dark fills' 13-point L* gap; matched lightness
     * but not chroma, so the pairs still differ in intensity.
     */
    aa: {
        light: {
            // Deepened green ink at hue 143.5° / L* 39, pairing with workoutInk's L* 38 so green
            // body text clears AA on surfaceInset (3.99:1 as shipped) and background (3.67:1).
            // The light fills already sit at a matched L* 48 and are unchanged.
            nutritionInk: '#0F6B33',
        },
        dark: {
            // Fills meet in the middle at L* ~59-60 (shipped: 67 green, 54 blue). Closing that
            // 13-point gap balances the two halves of the app, clears AA as text on every dark
            // surface, and lifts white-on-fill above 3:1 in both directions — though the blue
            // trades down to get there (3.87:1 shipped -> 3.28:1).
            nutrition: '#00A83F',
            workout: '#3B8EF7',
            nutritionGradient: ['#00A83F', '#008A34'],
            workoutGradient: ['#3B8EF7', '#2A73D6'],
            // Dark inks are not patched — they inherit whatever colors.ts ships.
        },
    },
    /**
     * Equal lightness AND equal chroma, both AA. Green sits at OKLCH hue 149° and blue at
     * 257° — within 2° of every shipped token, so the brand hues do not move. Matching
     * chroma is what makes matching L* mean anything: two hues at the same lightness but
     * different chroma still read at different intensities, and it also cancels most of
     * the Helmholtz-Kohlrausch effect that makes saturated blue look lighter than it
     * measures. Because every token here clears AA as small text, the fill and the ink
     * collapse into one value per hue.
     */
    matched: {
        light: {
            // L* 42 is the ceiling for 4.5:1 against `background` #DFE2E8, the darkest light
            // surface. Green binds the pair's chroma at 0.133 (blue could reach 0.180 here),
            // so the blue gives up ~15% chroma to sit at the same intensity as the green.
            nutrition: '#0D7331',
            nutritionInk: '#0D7331',
            workout: '#2C63AD',
            workoutInk: '#2C63AD',
            // Bottom stops run 6 L* deeper at the same hue, chroma clamped to what that
            // lightness can hold in sRGB (green's gamut narrows faster than blue's).
            nutritionGradient: ['#0D7331', '#016327'],
            workoutGradient: ['#2C63AD', '#1D549D'],
            // Derived from this set's blue, so the chip tint tracks light's own `workout`.
            iconChipBg: 'rgba(44,99,173,0.10)',
        },
        dark: {
            // L* 60 is where green and blue hold equal maximum chroma in sRGB (~0.18): blue's
            // peaks at L* 54 and collapses above it, green's keeps climbing. Going brighter
            // forces both toward pastel — at L* 66 the shared ceiling is 0.152. It also lands
            // just under the L* 61.7 limit for white text at 3:1.
            nutrition: '#0FA749',
            nutritionInk: '#0FA749',
            workout: '#4290FB',
            workoutInk: '#4290FB',
            nutritionGradient: ['#0FA749', '#039540'],
            workoutGradient: ['#4290FB', '#3180E9'],
            iconChipBg: 'rgba(66,144,251,0.16)',
            // A dark token cannot both clear AA as text (needs L* >= 54.5 on `surface`) and
            // carry white text at AA (needs L* <= 49.9) — the ranges do not overlap. These
            // clear AA as text; white on the fill lands at 3.16:1, which is large-text only.
            // Near-black on the fill lands at 6.02:1, the same trade measurementGradient
            // already makes in colors.ts.
        },
    },
} as const satisfies Record<Exclude<AccentSet, 'off'>, Record<ColorScheme, Partial<Colors>>>

let value: AccentSet | null = null
const listeners = new Set<(v: AccentSet) => void>()

// Read a stored value as an accent set, mapping the legacy '1' flag onto the set it selected
function parse(stored: string | null): AccentSet {
    if (stored === '1') return 'aa'
    if (stored === 'aa' || stored === 'matched') return stored
    return 'off'
}

async function hydrate(): Promise<AccentSet> {
    if (!__DEV__) return 'off'
    if (value === null) value = parse(await AsyncStorage.getItem(STORAGE_KEY))
    return value
}

export async function getAccentSet(): Promise<AccentSet> {
    return hydrate()
}

export async function setAccentPreview(set: AccentSet): Promise<void> {
    if (!__DEV__) return
    value = set
    listeners.forEach((cb) => cb(set))
    if (set === 'off') await AsyncStorage.removeItem(STORAGE_KEY)
    else await AsyncStorage.setItem(STORAGE_KEY, set)
}

export function subscribeAccentPreview(cb: (v: AccentSet) => void): () => void {
    listeners.add(cb)
    return () => listeners.delete(cb)
}

export function useAccentPreview(): AccentSet {
    const [set, setSet] = useState<AccentSet>(value ?? 'off')

    useEffect(() => {
        if (!__DEV__) return
        let cancelled = false
        void hydrate().then((v) => {
            if (!cancelled) setSet(v)
        })
        const unsubscribe = subscribeAccentPreview(setSet)
        return () => {
            cancelled = true
            unsubscribe()
        }
    }, [])

    return __DEV__ ? set : 'off'
}
