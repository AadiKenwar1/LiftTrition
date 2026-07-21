import { confirmSignOut } from '@/lib/utils/confirmSignOut'
import { UploadFlushNotConnectedError, UploadFlushTimeoutError } from '@/lib/powersync/FlushUploads'
import * as Sentry from '@sentry/react-native'
import { Alert } from 'react-native'

// confirmSignOut.ts imports isUploadFlushError/UploadFlushNotConnectedError from FlushUploads.ts, whose
// own imports (a real PowerSyncDatabase + upload-queue stats) have no place under Jest — stub them the
// same way lib/powersync/__tests__/flushUploads.test.ts does, so the REAL error classes still load.
jest.mock('@/lib/powersync/system', () => ({
    powerSync: {
        currentStatus: { connected: true },
        getUploadQueueStats: jest.fn().mockResolvedValue({}),
    },
}))

jest.mock('@/lib/powersync/uploadQueueStats', () => ({
    getPendingUploadEstimate: jest.fn(),
}))

// Matches accountFunctions.test.ts's convention for mocking @sentry/react-native at module scope.
jest.mock('@sentry/react-native', () => ({
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
}))

beforeEach(() => {
    jest.clearAllMocks()
})

describe('confirmSignOut', () => {
    it('does nothing when a sign-out is already in flight (double-tap guard)', () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const signOut = jest.fn()
        const forceSignOut = jest.fn()
        const setLoading = jest.fn()

        confirmSignOut({ loading: true, setLoading, signOut, forceSignOut })

        expect(alertSpy).not.toHaveBeenCalled()
        expect(signOut).not.toHaveBeenCalled()
        expect(setLoading).not.toHaveBeenCalled()
        alertSpy.mockRestore()
    })

    it('confirming Sign Out calls signOut and toggles loading around it (happy path)', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const signOut = jest.fn().mockResolvedValue(undefined)
        const setLoading = jest.fn()

        confirmSignOut({ loading: false, setLoading, signOut, forceSignOut: jest.fn() })

        expect(alertSpy).toHaveBeenCalledWith('Sign Out', 'Are you sure you want to sign out?', expect.any(Array))
        const buttons = alertSpy.mock.calls[0][2] ?? []
        const confirmButton = buttons.find((b) => b.text === 'Sign Out')
        expect(confirmButton).toBeDefined()

        await confirmButton!.onPress!()

        expect(signOut).toHaveBeenCalledTimes(1)
        expect(setLoading).toHaveBeenNthCalledWith(1, true)
        expect(setLoading).toHaveBeenNthCalledWith(2, false)
        alertSpy.mockRestore()
    })

    it('a generic sign-out failure captures it to Sentry and shows an error Alert, without calling forceSignOut', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const error = new Error('revoke failed')
        const signOut = jest.fn().mockRejectedValue(error)
        const forceSignOut = jest.fn()

        confirmSignOut({ loading: false, setLoading: jest.fn(), signOut, forceSignOut })
        const buttons = alertSpy.mock.calls[0][2] ?? []
        const confirmButton = buttons.find((b) => b.text === 'Sign Out')

        await confirmButton!.onPress!()

        expect(Sentry.captureException).toHaveBeenCalledWith(error, { tags: { area: 'sign-out-failure' } })
        expect(alertSpy).toHaveBeenCalledWith('Error', 'revoke failed')
        expect(forceSignOut).not.toHaveBeenCalled()
        alertSpy.mockRestore()
    })

    it('an offline upload-flush failure shows the offline copy and force-signs-out on confirm', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const signOut = jest.fn().mockRejectedValue(new UploadFlushNotConnectedError())
        const forceSignOut = jest.fn().mockResolvedValue(undefined)

        confirmSignOut({ loading: false, setLoading: jest.fn(), signOut, forceSignOut })
        const firstButtons = alertSpy.mock.calls[0][2] ?? []
        await firstButtons.find((b) => b.text === 'Sign Out')!.onPress!()

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({ category: 'sign-out', level: 'info', message: 'sign_out_offline' })
        expect(alertSpy).toHaveBeenCalledWith("You're offline", 'Sign out anyway? Unsynced data will be lost.', expect.any(Array))

        const secondButtons = alertSpy.mock.calls[1][2] ?? []
        const forceButton = secondButtons.find((b) => b.text === 'Force sign out')
        expect(forceButton).toBeDefined()

        await forceButton!.onPress!()

        expect(forceSignOut).toHaveBeenCalledTimes(1)
        alertSpy.mockRestore()
    })

    it('a still-syncing (timeout) upload-flush failure shows the still-syncing copy and force-signs-out on confirm', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const signOut = jest.fn().mockRejectedValue(new UploadFlushTimeoutError())
        const forceSignOut = jest.fn().mockResolvedValue(undefined)

        confirmSignOut({ loading: false, setLoading: jest.fn(), signOut, forceSignOut })
        const firstButtons = alertSpy.mock.calls[0][2] ?? []
        await firstButtons.find((b) => b.text === 'Sign Out')!.onPress!()

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({ category: 'sign-out', level: 'info', message: 'sign_out_still_syncing' })
        expect(alertSpy).toHaveBeenCalledWith('Still syncing', "We're still uploading your data. You can wait and try again, or force sign out (unsynced data may be lost).", expect.any(Array))

        const secondButtons = alertSpy.mock.calls[1][2] ?? []
        await secondButtons.find((b) => b.text === 'Force sign out')!.onPress!()

        expect(forceSignOut).toHaveBeenCalledTimes(1)
        alertSpy.mockRestore()
    })

    it('a failed forceSignOut shows its own error Alert instead of throwing', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const signOut = jest.fn().mockRejectedValue(new UploadFlushNotConnectedError())
        const forceSignOut = jest.fn().mockRejectedValue(new Error('still offline'))

        confirmSignOut({ loading: false, setLoading: jest.fn(), signOut, forceSignOut })
        const firstButtons = alertSpy.mock.calls[0][2] ?? []
        await firstButtons.find((b) => b.text === 'Sign Out')!.onPress!()

        const secondButtons = alertSpy.mock.calls[1][2] ?? []
        await secondButtons.find((b) => b.text === 'Force sign out')!.onPress!()

        expect(alertSpy).toHaveBeenCalledWith('Error', 'still offline')
        alertSpy.mockRestore()
    })
})
