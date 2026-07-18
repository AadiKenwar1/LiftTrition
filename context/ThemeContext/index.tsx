import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useColorScheme as useSystemColorScheme } from 'react-native'
import { logoForScheme } from './assets'
import { defaultThemePreference, getColors, isThemePreference, resolveColorScheme } from './colors'
import type { ColorScheme, Colors, ThemeContextValue, ThemePreference } from './types'

export { brandAssets, logoForScheme } from './assets'
export { defaultThemePreference, getColors, isColorScheme, isThemePreference, palettes, resolveColorScheme } from './colors'
export { FONT_FAMILY, fonts, type } from './typography'
export { macroColors, motion, radius, spacing } from './tokens'
export type { ColorScheme, Colors, ThemeContextValue, ThemePreference } from './types'

// Legacy key: previously stored 'light'/'dark' values remain valid explicit preferences
const STORAGE_KEY = 'colorScheme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Guarded accessor for the theme context
function useThemeContext(): ThemeContextValue {
    const ctx = useContext(ThemeContext)
    if (!ctx) {
        throw new Error('Theme hooks must be used within ThemeProvider')
    }
    return ctx
}

// Provides the theme preference, the resolved color scheme, and its palette
export function ThemeProvider({ children }: PropsWithChildren) {
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>(defaultThemePreference)
    const systemScheme = useSystemColorScheme()

    // Load the persisted theme preference from AsyncStorage
    useEffect(() => {
        void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
            if (isThemePreference(stored)) {
                setThemePreferenceState(stored)
            }
        })
    }, [])

    // Set the theme preference and persist it to AsyncStorage
    const setThemePreference = useCallback((pref: ThemePreference) => {
        setThemePreferenceState(pref)
        void AsyncStorage.setItem(STORAGE_KEY, pref)
    }, [])

    // Resolve the preference against the live OS appearance
    const colorScheme = resolveColorScheme(themePreference, systemScheme)

    // Get colors for the resolved scheme
    const colors = useMemo(() => getColors(colorScheme), [colorScheme])

    // Create the context value (setColorScheme stores an explicit scheme, permanently overriding 'system')
    const value = useMemo(
        () => ({ colorScheme, setColorScheme: setThemePreference, colors }),
        [colorScheme, setThemePreference, colors],
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Resolved color scheme ('light' | 'dark') for the current theme
export function useColorScheme(): ColorScheme {
    return useThemeContext().colorScheme
}

// Get colors for the current theme
export function useColors(): Colors {
    return useThemeContext().colors
}

// Scheme-aware brand logo for the current theme
export function useLogo() {
    return logoForScheme(useThemeContext().colorScheme)
}

// Set an explicit color scheme (permanently overrides the 'system' default)
export function useSetColorScheme(): (scheme: ColorScheme) => void {
    return useThemeContext().setColorScheme
}
