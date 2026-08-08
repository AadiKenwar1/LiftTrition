export type Colors = {
    // Surfaces
    background: string
    surface: string
    surfaceInset: string
    toggleTrack: string
    navBar: string
    iconCircleBg: string
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
    measurement: string
    nutritionInk: string
    workoutInk: string
    destructive: string
    warning: string
    workoutGradient: readonly [string, string]
    nutritionGradient: readonly [string, string]
    measurementGradient: readonly [string, string]
}

export type ColorScheme = 'light' | 'dark'

// Internal theme state: an explicit scheme, or 'system' (the unstored default) to follow the OS appearance
export type ThemePreference = ColorScheme | 'system'

export interface ThemeContextValue {
    colorScheme: ColorScheme
    setColorScheme: (scheme: ColorScheme) => void
    colors: Colors
}
