import AsyncStorage from '@react-native-async-storage/async-storage'
import { ACCENT_SETS, useAccentPreview } from '@/lib/devtools/accentPreview'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { Appearance, Platform, useColorScheme as useSystemColorScheme } from 'react-native'
import { logoForScheme } from './assets'
import { defaultThemePreference, getColors, isThemePreference, resolveColorScheme } from './colors'
import type { ColorScheme, Colors, ThemeContextValue, ThemePreference } from './types'

export { brandAssets, logoForScheme } from './assets'
export { defaultThemePreference, getColors, isColorScheme, isThemePreference, palettes, resolveColorScheme, withAlpha } from './colors'
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

    /**
     * Mirror the preference onto the native iOS windows. UIKit surfaces that are presented outside the
     * React view hierarchy — the `display="compact"` DateTimePicker's calendar popover, alerts, action
     * sheets, keyboards — read the window's UIUserInterfaceStyle, not any per-view override, so without
     * this they follow the phone while the app renders its own theme. 'system' clears the override so
     * `useSystemColorScheme` above keeps observing the real OS value. iOS only: on Android the same call
     * is AppCompatDelegate.setDefaultNightMode, which recreates the activity.
     */
    useEffect(() => {
        if (Platform.OS !== 'ios') return
        Appearance.setColorScheme(themePreference === 'system' ? null : themePreference)
    }, [themePreference])

    // Set the theme preference and persist it to AsyncStorage
    const setThemePreference = useCallback((pref: ThemePreference) => {
        setThemePreferenceState(pref)
        void AsyncStorage.setItem(STORAGE_KEY, pref)
    }, [])

    // Resolve the preference against the live OS appearance
    const colorScheme = resolveColorScheme(themePreference, systemScheme)

    // Get colors for the resolved scheme, with the dev-only accent candidate set patched over it
    const accentSet = useAccentPreview()
    const colors = useMemo(() => {
        const base = getColors(colorScheme)
        return __DEV__ && accentSet !== 'off' ? { ...base, ...ACCENT_SETS[accentSet][colorScheme] } : base
    }, [colorScheme, accentSet])

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
