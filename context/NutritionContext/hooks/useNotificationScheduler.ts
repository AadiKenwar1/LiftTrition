import { useNutrition } from '@/context/NutritionContext'
import { initNotificationHandler, runNotificationReschedule } from '@/lib/notifications/scheduler'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

const RESCHEDULE_DEBOUNCE_MS = 1500

// App-wide notification driver: reschedules the local-notification batch on data change and app foreground.
export function useNotificationScheduler(): void {
    const { nutritionData, nutritionStreak, loaded } = useNutrition()
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Configure the foreground-suppression handler once.
    useEffect(() => {
        initNotificationHandler()
    }, [])

    // Reschedule (debounced) whenever nutrition data or the streak changes.
    useEffect(() => {
        if (!loaded) return
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => void runNotificationReschedule(nutritionData, nutritionStreak), RESCHEDULE_DEBOUNCE_MS)
        return () => {
            if (timer.current) clearTimeout(timer.current)
        }
    }, [loaded, nutritionData, nutritionStreak])

    // Reschedule on every foreground so streaks refresh and the re-engagement timer slides forward.
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && loaded) void runNotificationReschedule(nutritionData, nutritionStreak)
        })
        return () => sub.remove()
    }, [loaded, nutritionData, nutritionStreak])
}
