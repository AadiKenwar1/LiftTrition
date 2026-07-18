import AsyncStorage from '@react-native-async-storage/async-storage'
import { loadNotificationPrefs, saveNotificationPrefs } from '../prefs'
import { DEFAULT_NOTIFICATION_PREFS } from '../types'

describe('notification prefs', () => {
    beforeEach(() => AsyncStorage.clear())

    it('returns defaults when nothing stored', async () => {
        const prefs = await loadNotificationPrefs()
        expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFS)
        expect(prefs.enabled).toBe(false)
        expect(prefs.meals.lunch).toEqual({ enabled: true, hour: 12, minute: 30 })
    })

    it('round-trips saved prefs', async () => {
        const next = {
            ...DEFAULT_NOTIFICATION_PREFS,
            enabled: true,
            meals: { ...DEFAULT_NOTIFICATION_PREFS.meals, dinner: { enabled: false, hour: 19, minute: 15 } },
        }
        await saveNotificationPrefs(next)
        expect(await loadNotificationPrefs()).toEqual(next)
    })

    it('merges partial stored shapes over defaults', async () => {
        await AsyncStorage.setItem('@notificationPrefs', JSON.stringify({ enabled: true, meals: { lunch: { hour: 13 } } }))
        const prefs = await loadNotificationPrefs()
        expect(prefs.enabled).toBe(true)
        expect(prefs.meals.lunch).toEqual({ enabled: true, hour: 13, minute: 30 })
        expect(prefs.meals.breakfast).toEqual(DEFAULT_NOTIFICATION_PREFS.meals.breakfast)
        expect(prefs.streak.enabled).toBe(true)
    })

    it('falls back to defaults on corrupt JSON', async () => {
        await AsyncStorage.setItem('@notificationPrefs', 'not json{')
        expect(await loadNotificationPrefs()).toEqual(DEFAULT_NOTIFICATION_PREFS)
    })
})
