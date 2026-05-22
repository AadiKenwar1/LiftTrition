import type { ColorScheme, Colors } from './types'

const brand = {
    workout: '#2f80ed',
    nutrition: '#22C922',
    destructive: '#FF453A',
} as const

export const palettes = {
    light: {
        background: '#F2F2F7',
        surface: '#FFFFFF',
        border: '#E5E5EA',
        text: '#000000',
        textSecondary: '#3C3C43',
        textMuted: '#888888',
        textFaint: '#666666',
        placeholder: '#AEAEB2',
        disabled: '#D1D1D6',
        ...brand,
    },
    dark: {
        background: '#121212',
        surface: '#1e1e1e',
        border: '#2a2a2a',
        text: '#FFFFFF',
        textSecondary: '#AAAAAA',
        textMuted: '#888888',
        textFaint: '#666666',
        placeholder: '#555555',
        disabled: '#333333',
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
