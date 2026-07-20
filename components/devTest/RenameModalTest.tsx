import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useWorkout } from '@/context/WorkoutContext'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Opens the REAL renameModal seeded with one of your existing workouts, to exercise
 * the double-tap submit guard. Rapid double-tap "Rename" → expect exactly ONE rename
 * write and ONE screen pop (no extra screen popped). Renaming to another active
 * workout's name → expect the "Workout Name Taken" Alert and a still-tappable button.
 * ⚠️ This renames a REAL workout — pick a throwaway one or rename it back afterward.
 */
export default function RenameModalTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const { workouts } = useWorkout()
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()

    const activeWorkouts = workouts.filter((w) => !w.archived)

    // Push the real rename modal for the chosen workout id.
    function openRename(workoutId: string) {
        router.push({ pathname: '/workoutScreens/renameModal', params: { workoutId } } as never)
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            <Text style={styles.hint}>Tap a workout to open Rename. Rapid double-tap “Rename” → exactly one rename + one screen pop. Rename it to another workout’s name → “Workout Name Taken” Alert, and the button stays tappable (the guard is never consumed).</Text>
            {activeWorkouts.length === 0 ?
                <Text style={styles.empty}>No active workouts — create one in the Workouts tab first.</Text>
            :   activeWorkouts.map((w) => (
                    <TouchableOpacity key={w.id} style={styles.row} activeOpacity={0.6} onPress={() => openRename(w.id)}>
                        <Text style={styles.rowLabel}>{w.name}</Text>
                        <ChevronRight size={20} color={colors.chevron} strokeWidth={2} />
                    </TouchableOpacity>
                ))}
        </ScrollView>
    )
}

// Theme-reactive styles for the rename devTest launcher.
function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, paddingBottom: 60 },
        hint: { fontSize: 12, color: colors.textMuted, marginBottom: 16, marginLeft: 2, lineHeight: 16, fontFamily: fonts.regular },
        empty: { fontSize: 14, color: colors.labelMuted, fontFamily: fonts.regular, marginLeft: 2 },
        row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        rowLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
    })
}
