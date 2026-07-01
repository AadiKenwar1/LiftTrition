import { useColors } from '@/context/ThemeContext'
import { StyleSheet, View } from 'react-native'

/**
 * Dev-only shared progress indicator for the onboarding previews. Replaces the per-screen hardcoded
 * `Array.from({ length: 8 })` dots (which were inaccurate — missing on some steps, all-active on others).
 * Renders `total` dots with the `current` one elongated + accent-tinted. Themed (light + dark).
 */
export interface StepProgressProps {
    current: number
    total: number
    accent?: string
}

export default function StepProgress({ current, total, accent }: StepProgressProps) {
    const colors = useColors()
    const tint = accent ?? colors.workout
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
