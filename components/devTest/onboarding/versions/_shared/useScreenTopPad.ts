import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Dev-only shared top-padding hook for the onboarding previews. Returns a safe-area-aware top inset so
 * every screen starts its content at the same place on every device — fixing the inconsistent hardcoded
 * `paddingTop` values (e.g. Activity at ~99px vs others at ~50px) and the screens that crowded the
 * notch/Dynamic Island. Apply to the ScrollView's `contentContainerStyle`; keep the container's own top
 * padding at 0.
 */
export function useScreenTopPad(extra = 16): number {
    const insets = useSafeAreaInsets()
    return Math.max(insets.top, 12) + extra
}
