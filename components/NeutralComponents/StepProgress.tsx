import { useColors } from '@/context/ThemeContext'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

/**
 * Shared step-progress dots (production port of the V4 onboarding indicator). Renders `total` dots with the
 * `current` (0-based) one elongated + accent-tinted. Pass a skip-adjusted total so the dots never lie.
 * `style` overrides the row's own spacing — callers that place the dots inside their own layout row pass
 * `marginBottom: 0` and own the gap themselves.
 */
export interface StepProgressProps {
    current: number
    total: number
    accent?: string
    style?: StyleProp<ViewStyle>
}

export default function StepProgress({ current, total, accent, style }: StepProgressProps) {
    const colors = useColors()
    const tint = accent ?? colors.text
    return (
        <View style={[styles.row, style]} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current + 1 }}>
            {Array.from({ length: total }).map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: i === current ? tint : colors.ringTrack }, i === current && styles.dotActive]} />
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 6, marginBottom: 28 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotActive: { width: 24 },
})
