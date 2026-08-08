import type { ColorScheme, Colors, ThemePreference } from './types'

// Accents: green and blue are matched per scheme in BOTH CIE L* and OKLCH chroma (light L* 42,
// dark L* 60 — the lightness where the two hues hold equal maximum sRGB chroma), so the two halves
// of the app read at one intensity. Every accent token clears AA (4.5:1) as small text on all three
// surfaces it lands on, which is why each `*Ink` token now equals its fill — the split is kept only
// so existing `colors.*Ink` call sites keep working. White text on the dark CTA fills is ~3.2:1,
// large-text/icon only (same trade as measurementGradient's dark label).
export const palettes = {
    light: {
        // Surfaces — deeper cool-slate canvas so white cards clearly lift off the page
        background: '#DFE2E8',
        surface: '#FBFBFC',
        // Middle tier between background and surface (mirrors dark) so insets read both
        // nested inside white cards AND as quiet grouping panels on the background.
        surfaceInset: '#E9EBF0',
        toggleTrack: '#ECEEF2',
        // Elevated top-nav surface (ModeSwitcher bar) — a touch lighter than the page so the bar reads as
        // raised chrome. Light needs more lift toward white than surfaceInset to not look like a flat gray band.
        navBar: '#D8DDE7',
        // Big hero icon circles (modal headers, empty states). Currently equals `surface`; kept as its
        // own token so the circles can be tuned without moving every card in the app.
        iconCircleBg: '#E9EBF0',
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
        // Tint derived from this scheme's own `workout` blue below
        iconChipBg: 'rgba(44,99,173,0.10)',
        // Inks equal the fills — every accent clears AA as small text, so no deepened variant is needed
        nutritionInk: '#0D7331',
        workoutInk: '#2C63AD',
        // Amber for "off-target" stat tone (AA-contrast on light surface)
        warning: '#9C5D00',
        // Accents — L* 42 is the 4.5:1 ceiling against `background`, the darkest light surface; green
        // binds the shared chroma (0.133), so the blue desaturates to sit at the same intensity
        workout: '#2C63AD',
        nutrition: '#0D7331',
        // Measurement gold (light) — deep gold so the icon reads on the white surface and white Save text holds; pairs with the bright dark-mode gold below.
        measurement: '#A16207',
        // Gradient fills for CTAs/Fab/ModeSwitcher; top stop == accent, bottom stop 6 L* deeper at the
        // same hue, chroma clamped to what that lightness holds in sRGB.
        workoutGradient: ['#2C63AD', '#1D549D'] as const,
        nutritionGradient: ['#0D7331', '#016327'] as const,
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
        // Elevated top-nav surface (ModeSwitcher bar) — a subtle lift off the near-black background
        // (matches surfaceInset), enough to read as raised chrome without a hard edge.
        navBar: '#141517',
        // Big hero icon circles (modal headers, empty states). Currently equals `surface`; kept as its
        // own token so the circles can be tuned without moving every card in the app.
        iconCircleBg: '#1A1B1E',
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
        // Tint derived from this scheme's own `workout` blue below
        iconChipBg: 'rgba(66,144,251,0.16)',
        // Inks equal the fills — every accent clears AA as small text, so no lightened variant is needed
        nutritionInk: '#0FA749',
        workoutInk: '#4290FB',
        // Amber for "off-target" stat tone
        warning: '#FFB020',
        // Accents — L* 60 is where green and blue hold equal maximum sRGB chroma (~0.18); both clear AA
        // as text on every dark surface. White on these fills is ~3.2:1 (large-text/icon only).
        workout: '#4290FB',
        nutrition: '#0FA749',
        // Measurement gold (dark) — bright golden yellow, vivid on dark for the icon/border. Its CTA uses DARK text (white can't sit on bright yellow) — a deliberate vibrant choice.
        measurement: '#FBBF24',
        // Button gradients (CTAs/Fab/ModeSwitcher) — top stop == accent, bottom stop subtly deeper at
        // the same hue so the gradient reads as one cohesive fill.
        workoutGradient: ['#4290FB', '#3180E9'] as const,
        nutritionGradient: ['#0FA749', '#039540'] as const,
        // Bright-gold CTA fill (dark) — paired with DARK Save-button text (white can't sit on bright yellow).
        measurementGradient: ['#FBBF24', '#F59E0B'] as const,
        // Destructive — bright red reads fine on the dark background
        destructive: '#FF453A',
    },
} as const satisfies Record<ColorScheme, Colors>

export const defaultThemePreference: ThemePreference = 'system'

// Get the palette for a resolved color scheme
export function getColors(scheme: ColorScheme): Colors {
    return palettes[scheme]
}

// Validate a stored value as a resolved color scheme
export function isColorScheme(value: string | null | undefined): value is ColorScheme {
    return value != null && value in palettes
}

// Validate a stored value as a theme preference (explicit scheme or 'system')
export function isThemePreference(value: string | null | undefined): value is ThemePreference {
    return value === 'system' || isColorScheme(value)
}

// Resolve a theme preference to a concrete scheme: explicit choices win; 'system' follows the OS, falling back to dark
export function resolveColorScheme(preference: ThemePreference, osScheme: ColorScheme | null | undefined): ColorScheme {
    if (preference !== 'system') return preference
    return osScheme ?? 'dark'
}

/**
 * A palette color at a given alpha — for accent washes (tinted fills behind an accent icon or label).
 * Every accent above is opaque 6-digit hex, so a straight channel split covers the real call sites;
 * anything else (the already-translucent `hairline`/`divider`/`iconChipBg` values) is returned
 * untouched rather than wrapped a second time into an unparseable string.
 */
export function withAlpha(color: string, alpha: number): string {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return color
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
}
