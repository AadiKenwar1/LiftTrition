import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { getDateKey } from '@/lib/utils/dateHelper'

export function useToday(): string {
    const [today, setToday] = useState(() => getDateKey(new Date()))

    useEffect(() => {
        const check = () => {
            const key = getDateKey(new Date())
            setToday(prev => (prev === key ? prev : key))
        }
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') check()
        })
        return () => sub.remove()
    }, [])

    return today
}
