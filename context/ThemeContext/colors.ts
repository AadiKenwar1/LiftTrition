import type { ColorScheme, Colors } from './types'

// Accents (workout/nutrition + their gradients) are per-theme — see each palette below.
// Bright values live on dark; light uses the same hue deepened for legibility on white.
const brand = {
    destructive: '#FF453A',
} as const

export const palettes = {
    light: {
        // Surfaces — deeper cool-slate canvas so white cards clearly lift off the page
        background: '#DFE2E8',
        surface: '#FBFBFC',
        surfaceInset: '#DFE2E8',
        toggleTrack: '#ECEEF2',
        // Lines — strengthened so card edges, dividers, and gridlines are actually visible
        border: '#CBCED7',
        hairline: '#CFD2DB',
        divider: '#D8DAE2',
        navBorder: '#CBCED7',
        // Text — near-black (cool) instead of pure #000 to cut glare
        text: '#16171A',
        textSecondary: '#3C3C43',
        textMuted: '#5E5E62',
        textFaint: '#666666',
        labelMuted: '#5A5B64',
        tabInactive: '#86878F',
        placeholder: '#8A8B92',
        disabled: '#D1D1D6',
        // Data-viz / controls
        ringTrack: '#D0D3DC',
        chevron: '#B8B9C1',
        iconChipBg: 'rgba(47,128,237,0.10)',
        // Brand (nutritionInk = AA-contrast green for numerals on light bg)
        nutritionInk: '#1BA81B',
        // Amber for "off-target" stat tone (AA-contrast on light bg)
        warning: '#C77700',
        // Accents — same hue as dark, deepened for legibility on light surfaces
        workout: '#2570D8',
        nutrition: '#1A9E1A',
        workoutGradient: ['#2570D8', '#2570D8'] as const, //3A8BF0
        nutritionGradient: ['#1A9E1A', '#1A9E1A'] as const, //34D63A
        ...brand,
    },
    dark: {
        // Surfaces
        background: '#0F1012',
        surface: '#1A1B1E',
        surfaceInset: '#141517',
        toggleTrack: '#1A1B1E',
        // Lines
        border: '#2a2a2a',
        hairline: 'rgba(255,255,255,0.06)',
        divider: 'rgba(255,255,255,0.05)',
        navBorder: 'rgba(255,255,255,0.06)',
        // Text
        text: '#FFFFFF',
        textSecondary: '#9A9AA3',
        textMuted: '#888888',
        textFaint: '#666666',
        labelMuted: '#82838C',
        tabInactive: '#5C5C64',
        placeholder: '#555555',
        disabled: '#333333',
        // Data-viz / controls
        ringTrack: '#26272B',
        chevron: '#5C5C64',
        iconChipBg: 'rgba(47,128,237,0.16)',
        // Brand (bright green reads fine on dark, so numerals use the base nutrition green)
        nutritionInk: '#22C922',
        // Amber for "off-target" stat tone
        warning: '#FFB020',
        // Accents — vivid on dark surfaces
        workout: '#2F80ED',
        nutrition: '#22C922',
        // Deepened from the bright accent so white CTA text clears contrast on dark; the vivid `workout`/`nutrition` accents stay for icons/borders.
        workoutGradient: ['#2E7BE0', '#2570D8'] as const,
        nutritionGradient: ['#1FA51F', '#178A17'] as const,
        ...brand,
    },
} as const satisfies Record<ColorScheme, Colors>

export const defaultColorScheme: ColorScheme = 'dark'

export function getColors(scheme: ColorScheme): Colors {
    return palettes[scheme]
}

export function isColorScheme(value: string | null | undefined): value is ColorScheme {
    return value != null && value in palettes
}
