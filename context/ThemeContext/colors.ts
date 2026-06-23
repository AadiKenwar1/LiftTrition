import type { ColorScheme, Colors } from './types'

const brand = {
    workout: '#2f80ed',
    nutrition: '#22C922',
    destructive: '#FF453A',
    workoutGradient: ['#3A8BF0', '#2F80ED'] as const,
    nutritionGradient: ['#34D63A', '#22C922'] as const,
} as const

export const palettes = {
    light: {
        // Surfaces
        background: '#F2F2F7',
        surface: '#FFFFFF',
        surfaceInset: '#F2F2F7',
        toggleTrack: '#E6E6EC',
        // Lines
        border: '#E5E5EA',
        hairline: '#E9E9EF',
        divider: '#EFEFF3',
        navBorder: '#E1E1E6',
        // Text
        text: '#000000',
        textSecondary: '#3C3C43',
        textMuted: '#888888',
        textFaint: '#666666',
        labelMuted: '#9A9AA0',
        tabInactive: '#A0A0A8',
        placeholder: '#AEAEB2',
        disabled: '#D1D1D6',
        // Data-viz / controls
        ringTrack: '#E5E5EA',
        chevron: '#C0C0C8',
        iconChipBg: 'rgba(47,128,237,0.10)',
        // Brand (nutritionInk = AA-contrast green for numerals on light bg)
        nutritionInk: '#1BA81B',
        // Amber for "off-target" stat tone (AA-contrast on light bg)
        warning: '#C77700',
        ...brand,
    },
    dark: {
        // Surfaces
        background: '#0F1012',
        surface: '#1A1B1E',
        surfaceInset: '#0F1012',
        toggleTrack: '#16171A',
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
        labelMuted: '#6B6B73',
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
