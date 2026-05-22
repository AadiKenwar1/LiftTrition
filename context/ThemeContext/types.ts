export type Colors = {
    background: string
    surface: string
    border: string
    text: string
    textSecondary: string
    textMuted: string
    textFaint: string
    placeholder: string
    disabled: string
    workout: string
    nutrition: string
    destructive: string
}

export type ColorScheme = 'light' | 'dark'

export interface ThemeContextValue {
    colorScheme: ColorScheme
    setColorScheme: (scheme: ColorScheme) => void
    colors: Colors
}
