import AsyncStorage from '@react-native-async-storage/async-storage'
import { flushUploadsOrThrow } from '@/lib/powersync/FlushUploads'
import { disconnectAndClearPowerSync } from '@/lib/powersync/orchestrator'
import { supabase } from '@/lib/supabase/client'
import { deleteAccount, forceSignOut } from '../accountFunctions'

jest.mock('@/lib/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(),
            signOut: jest.fn(),
        },
    },
}))

jest.mock('@/lib/powersync/orchestrator', () => ({
    disconnectAndClearPowerSync: jest.fn(),
}))

jest.mock('@/lib/powersync/FlushUploads', () => ({
    flushUploadsOrThrow: jest.fn(),
    UploadFlushTimeoutError: class UploadFlushTimeoutError extends Error {},
    UploadFlushNotConnectedError: class UploadFlushNotConnectedError extends Error {},
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        clear: jest.fn(),
    },
}))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

let warnSpy: jest.SpyInstance

beforeEach(() => {
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { access_token: 'token-123' } },
    })
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null })
    ;(disconnectAndClearPowerSync as jest.Mock).mockResolvedValue(undefined)
    ;(AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined)
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
})

afterEach(() => {
    warnSpy.mockRestore()
})

describe('deleteAccount', () => {
    it('throws when there is no session and never calls the edge function', async () => {
        ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })

        await expect(deleteAccount()).rejects.toThrow('You must be signed in to delete your account.')

        expect(mockFetch).not.toHaveBeenCalled()
        expect(disconnectAndClearPowerSync).not.toHaveBeenCalled()
        expect(AsyncStorage.clear).not.toHaveBeenCalled()
    })

    it('aborts with nothing torn down when the edge function fails', async () => {
        mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'deletion failed' }) })

        await expect(deleteAccount()).rejects.toThrow('deletion failed')

        expect(supabase.auth.signOut).not.toHaveBeenCalled()
        expect(disconnectAndClearPowerSync).not.toHaveBeenCalled()
        expect(AsyncStorage.clear).not.toHaveBeenCalled()
    })

    it('never waits on the upload flush', async () => {
        await deleteAccount()

        expect(flushUploadsOrThrow).not.toHaveBeenCalled()
    })

    it('clears PowerSync and storage after the server confirms', async () => {
        await deleteAccount()

        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
        expect(AsyncStorage.clear).toHaveBeenCalledTimes(1)
    })

    it('completes teardown even when the auth sign-out reports an error', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: new Error('revoke failed') })

        await expect(deleteAccount()).resolves.toBeUndefined()

        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
        expect(AsyncStorage.clear).toHaveBeenCalledTimes(1)
    })

    it('completes teardown even when the PowerSync clear fails', async () => {
        ;(disconnectAndClearPowerSync as jest.Mock).mockRejectedValue(new Error('db locked'))

        await expect(deleteAccount()).resolves.toBeUndefined()

        expect(AsyncStorage.clear).toHaveBeenCalledTimes(1)
    })

    it('calls the edge function before any local teardown', async () => {
        await deleteAccount()

        const fetchOrder = mockFetch.mock.invocationCallOrder[0]
        const clearOrder = (disconnectAndClearPowerSync as jest.Mock).mock.invocationCallOrder[0]
        expect(fetchOrder).toBeLessThan(clearOrder)
    })
})

describe('forceSignOut', () => {
    it('completes local cleanup even when the auth sign-out rejects', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockRejectedValue(new Error('network dead'))

        await expect(forceSignOut()).resolves.toBeUndefined()

        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
        expect(AsyncStorage.clear).toHaveBeenCalledTimes(1)
    })
})
