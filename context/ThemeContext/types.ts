export type Colors = {
    // Surfaces
    background: string
    surface: string
    surfaceInset: string
    toggleTrack: string
    // Lines
    border: string
    hairline: string
    divider: string
    navBorder: string
    // Text
    text: string
    textSecondary: string
    textMuted: string
    textFaint: string
    labelMuted: string
    tabInactive: string
    placeholder: string
    disabled: string
    // Data-viz / controls
    ringTrack: string
    chevron: string
    iconChipBg: string
    // Brand
    workout: string
    nutrition: string
    nutritionInk: string
    destructive: string
    workoutGradient: readonly [string, string]
    nutritionGradient: readonly [string, string]
}

export type ColorScheme = 'light' | 'dark'

export interface ThemeContextValue {
    colorScheme: ColorScheme
    setColorScheme: (scheme: ColorScheme) => void
    colors: Colors
}
