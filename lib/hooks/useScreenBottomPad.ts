import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Safe-area-aware bottom padding for surfaces that reach the physical bottom of the screen — full-screen
 * routes, pushed screens and modal sheets (iOS page sheets are inset at the top only). Returns the home
 * indicator inset — floored at 16 so devices without one still get breathing room — plus `extra`.
 *
 * Do NOT use inside the tab screens: the tab bar already consumes that area (see app/(tabs)/_layout.tsx).
 */
export function useScreenBottomPad(extra = 0): number {
    const insets = useSafeAreaInsets()
    return Math.max(insets.bottom, 16) + extra
}
