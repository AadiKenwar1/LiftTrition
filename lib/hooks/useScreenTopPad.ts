import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Safe-area-aware top padding for headerless screens and top bars. Returns the device's top inset —
 * floored at 12 so non-notch devices still get breathing room — plus `extra`, so content clears the
 * status bar / notch / Dynamic Island by the same visual gap on every device. Convention: ~4-12 for a
 * compact top bar, 16 for screen content. On a ScrollView, apply it to `contentContainerStyle` and keep
 * the container's own top padding at 0.
 */
export function useScreenTopPad(extra = 16): number {
    const insets = useSafeAreaInsets()
    return Math.max(insets.top, 12) + extra
}
