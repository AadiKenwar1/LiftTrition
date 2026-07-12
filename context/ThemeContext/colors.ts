import type { ColorScheme, Colors } from './types'

// Accent FILLS (buttons): LIGHT stays deep and clears white text at AA (~4.5:1+). DARK uses the neon
// brand accents (`nutrition` #00BD48, `workout` #2f80ed) for BOTH solid buttons and gradients so every
// CTA matches — a DELIBERATE vibrancy override (like the measurement amber): white text/icons on the
// neon green run ~2.2–3.5:1, below AA, chosen for the energetic look. Blue runs ~3.9:1 (icon/large-text ok).
// `*Ink` tokens are the readable-text counterparts for small accent text/links on a background, where
// the neon fails AA; links/labels use these per-theme inks instead.
export const palettes = {
    light: {
        // Surfaces — deeper cool-slate canvas so white cards clearly lift off the page
        background: '#DFE2E8',
        surface: '#FBFBFC',
        // Middle tier between background and surface (mirrors dark) so insets read both
        // nested inside white cards AND as quiet grouping panels on the background.
        surfaceInset: '#E9EBF0',
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
        placeholder: '#6A6B72',
        disabled: '#D1D1D6',
        // Data-viz / controls
        ringTrack: '#D0D3DC',
        chevron: '#B8B9C1',
        iconChipBg: 'rgba(47,128,237,0.10)',
        // Brand (nutritionInk = green for numerals; matches the unified accent below)
        nutritionInk: '#168516',
        // AA-contrast blue for small accent text/links on light surfaces (deepened from the fill accent)
        workoutInk: '#1A57B0',
        // Amber for "off-target" stat tone (AA-contrast on light surface)
        warning: '#9C5D00',
        // Accents — unified with the gradient fills below (deep enough to carry white at AA); identical in light + dark
        workout: '#2570D8',
        nutrition: '#168516',
        // Measurement gold (light) — deep gold so the icon reads on the white surface and white Save text holds; pairs with the bright dark-mode gold below.
        measurement: '#A16207',
        // Gradient fills for CTAs/Fab/ModeSwitcher; top stop == accent so buttons match icons/borders.
        workoutGradient: ['#2570D8', '#2064C8'] as const,
        nutritionGradient: ['#168516', '#0F7A0F'] as const,
        // Deep-gold CTA fill (light) — white Save text reads on this deep gold.
        measurementGradient: ['#A16207', '#854D0E'] as const,
        // Destructive — deepened on light so red text/icons clear AA on light surfaces
        destructive: '#C20012',
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
        textFaint: '#8A8A8A',
        labelMuted: '#82838C',
        tabInactive: '#86878F',
        placeholder: '#86878F',
        disabled: '#333333',
        // Data-viz / controls
        ringTrack: '#26272B',
        chevron: '#5C5C64',
        iconChipBg: 'rgba(47,128,237,0.16)',
        // Brand (nutritionInk = green for numerals; matches the unified accent below)
        nutritionInk: '#00BD48',
        // AA-contrast blue for small accent text/links on the dark background (lightened from the fill accent)
        workoutInk: '#4D9BFF',
        // Amber for "off-target" stat tone
        warning: '#FFB020',
        // Accents — vivid neon on dark. Used for charts/graphs/icons/borders (fully legible there) AND as
        // the solid + gradient CTA fills, so every button matches (white text on neon is a documented AA override).
        workout: '#2f80ed',
        nutrition: '#00BD48',
        // Measurement gold (dark) — bright golden yellow, vivid on dark for the icon/border. Its CTA uses DARK text (white can't sit on bright yellow) — a deliberate vibrant choice.
        measurement: '#FBBF24',
        // Button gradients (CTAs/Fab/ModeSwitcher) — neon on dark to match the solid accent buttons (top stop ==
        // accent, deepening subtly so the gradient reads as one cohesive neon green). White text on the neon green
        // is ~2.2–3.5:1 (below AA) — a deliberate vibrancy override; blue is ~3.9:1 (icon/large-text ok).
        workoutGradient: ['#2f80ed', '#2064C8'] as const,
        nutritionGradient: ['#00BD48', '#009A3B'] as const,
        // Bright-gold CTA fill (dark) — paired with DARK Save-button text (white can't sit on bright yellow).
        measurementGradient: ['#FBBF24', '#F59E0B'] as const,
        // Destructive — bright red reads fine on the dark background
        destructive: '#FF453A',
    },
} as const satisfies Record<ColorScheme, Colors>

export const defaultColorScheme: ColorScheme = 'dark'

export function getColors(scheme: ColorScheme): Colors {
    return palettes[scheme]
}

export function isColorScheme(value: string | null | undefined): value is ColorScheme {
    return value != null && value in palettes
}
