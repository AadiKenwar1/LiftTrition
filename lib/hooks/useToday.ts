import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { getDateKey } from '@/lib/utils/dateHelper'

export function useToday(): string {
    const [today, setToday] = useState(() => getDateKey(new Date()))

    useEffect(() => {
        let timerId: ReturnType<typeof setTimeout> | undefined

        // Recomputes today's date key; no-ops (setState's prev === key guard) when unchanged.
        const check = () => {
            const key = getDateKey(new Date())
            setToday(prev => (prev === key ? prev : key))
        }

        // Schedules a one-shot timer for the next local midnight (+1s buffer so it never
        // fires a hair early and reads the stale day), then re-checks and reschedules
        // itself. Built via wall-clock component construction (not a fixed 24h ms offset)
        // so it lands on the correct next calendar midnight across DST transitions.
        const scheduleMidnight = () => {
            const now = new Date()
            const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
            const delay = nextMidnight.getTime() - now.getTime()
            timerId = setTimeout(() => {
                check()
                scheduleMidnight()
            }, delay + 1000)
        }
        scheduleMidnight()

        // Catch-up path: iOS suspends JS timers while backgrounded, so the midnight
        // timer above may not fire on time. Foregrounding always re-checks.
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') check()
        })
        return () => {
            sub.remove()
            if (timerId) clearTimeout(timerId)
        }
    }, [])

    return today
}
