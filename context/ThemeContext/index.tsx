import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { defaultColorScheme, getColors, isColorScheme } from './colors'
import type { ColorScheme, Colors, ThemeContextValue } from './types'

export { defaultColorScheme, getColors, isColorScheme, palettes } from './colors'
export type { ColorScheme, Colors, ThemeContextValue } from './types'

const STORAGE_KEY = 'colorScheme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function useThemeContext(): ThemeContextValue {
    const ctx = useContext(ThemeContext)
    if (!ctx) {
        throw new Error('Theme hooks must be used within ThemeProvider')
    }
    return ctx
}

export function ThemeProvider({ children }: PropsWithChildren) {
    const [colorScheme, setColorSchemeState] = useState<ColorScheme>(defaultColorScheme)

    // Load color scheme from AsyncStorage
    useEffect(() => {
        void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
            if (isColorScheme(stored)) {
                setColorSchemeState(stored)
            }
        })
    }, [])

    // Set color scheme and persist to AsyncStorage
    const setColorScheme = useCallback((scheme: ColorScheme) => {
        setColorSchemeState(scheme)
        void AsyncStorage.setItem(STORAGE_KEY, scheme)
    }, [])

    // Get colors for the current theme
    const colors = useMemo(() => getColors(colorScheme), [colorScheme])

    // Create the context value
    const value = useMemo(
        () => ({ colorScheme, setColorScheme, colors }),
        [colorScheme, setColorScheme, colors],
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Custom hooks to access the theme context
export function useColorScheme(): ColorScheme {
    return useThemeContext().colorScheme
}

// Get colors for the current theme
export function useColors(): Colors {
    return useThemeContext().colors
}

// Set color scheme
export function useSetColorScheme(): (scheme: ColorScheme) => void {
    return useThemeContext().setColorScheme
}
