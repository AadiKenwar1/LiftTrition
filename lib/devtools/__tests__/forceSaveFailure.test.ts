import AsyncStorage from '@react-native-async-storage/async-storage'
import { isSaveFailureArmed, setSaveFailureArmed, throwIfSaveFailureArmed } from '../forceSaveFailure'

beforeEach(async () => {
    await AsyncStorage.clear()
})

describe('forceSaveFailure', () => {
    it('reports a scope as armed after arming, and disarmed after disarming', async () => {
        expect(await isSaveFailureArmed('nutrition')).toBe(false)

        await setSaveFailureArmed('nutrition', true)
        expect(await isSaveFailureArmed('nutrition')).toBe(true)

        await setSaveFailureArmed('nutrition', false)
        expect(await isSaveFailureArmed('nutrition')).toBe(false)
    })

    it('throws once when armed, then consumes the flag so the retry succeeds', async () => {
        await setSaveFailureArmed('settings', true)

        await expect(throwIfSaveFailureArmed('settings')).rejects.toThrow()

        expect(await isSaveFailureArmed('settings')).toBe(false)
        await expect(throwIfSaveFailureArmed('settings')).resolves.toBeUndefined()
    })

    it('does nothing when the scope is not armed', async () => {
        await expect(throwIfSaveFailureArmed('workout')).resolves.toBeUndefined()
    })

    it('arms scopes independently', async () => {
        await setSaveFailureArmed('workout', true)
        expect(await isSaveFailureArmed('nutrition')).toBe(false)
        await expect(throwIfSaveFailureArmed('nutrition')).resolves.toBeUndefined()
        await expect(throwIfSaveFailureArmed('workout')).rejects.toThrow()
    })
})
