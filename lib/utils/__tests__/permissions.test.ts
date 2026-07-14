import { Linking } from 'react-native'
import { nextPermissionAction, openAppSettings } from '../permissions'

describe('nextPermissionAction', () => {
    it("returns 'request' while the OS can still show the prompt", () => {
        expect(nextPermissionAction({ canAskAgain: true })).toBe('request')
    })

    it("returns 'settings' after a permanent denial", () => {
        expect(nextPermissionAction({ canAskAgain: false })).toBe('settings')
    })
})

describe('openAppSettings', () => {
    it('deep-links to the app settings page', () => {
        const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue()
        openAppSettings()
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockRestore()
    })
})
