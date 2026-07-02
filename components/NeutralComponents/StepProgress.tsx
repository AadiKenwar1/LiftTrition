import { useColors } from '@/context/ThemeContext'
import { StyleSheet, View } from 'react-native'

/**
 * Shared step-progress dots (production port of the V4 onboarding indicator). Renders `total` dots with the
 * `current` (0-based) one elongated + accent-tinted. Pass a skip-adjusted total so the dots never lie.
 */
export interface StepProgressProps {
    current: number
    total: number
    accent?: string
}

export default function StepProgress({ current, total, accent }: StepProgressProps) {
    const colors = useColors()
    const tint = accent ?? colors.text
    return (
        <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current + 1 }}>
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
