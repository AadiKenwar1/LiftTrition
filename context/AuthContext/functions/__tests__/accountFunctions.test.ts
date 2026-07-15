import { flushUploadsOrThrow } from '@/lib/powersync/FlushUploads'
import { disconnectAndClearPowerSync } from '@/lib/powersync/orchestrator'
import { supabase } from '@/lib/supabase/client'
import { clearUserStorage } from '@/lib/utils/userStorage'
import { clearLocalSession, deleteAccount, forceSignOut, signOut } from '../accountFunctions'

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
}))

jest.mock('@/lib/utils/userStorage', () => ({
    clearUserStorage: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

const authMock = supabase.auth as unknown as { getSession: jest.Mock; signOut: jest.Mock; _removeSession?: jest.Mock }
const mockRemoveSession = jest.fn()

let warnSpy: jest.SpyInstance

beforeEach(() => {
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { access_token: 'token-123', user: { id: 'user-123' } } },
    })
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null })
    authMock._removeSession = mockRemoveSession
    mockRemoveSession.mockResolvedValue(undefined)
    ;(disconnectAndClearPowerSync as jest.Mock).mockResolvedValue(undefined)
    ;(clearUserStorage as jest.Mock).mockResolvedValue(undefined)
    ;(flushUploadsOrThrow as jest.Mock).mockResolvedValue(undefined)
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
        expect(clearUserStorage).not.toHaveBeenCalled()
    })

    it('aborts with nothing torn down when the edge function fails', async () => {
        mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'deletion failed' }) })

        await expect(deleteAccount()).rejects.toThrow('deletion failed')

        expect(supabase.auth.signOut).not.toHaveBeenCalled()
        expect(disconnectAndClearPowerSync).not.toHaveBeenCalled()
        expect(clearUserStorage).not.toHaveBeenCalled()
    })

    it('never waits on the upload flush', async () => {
        await deleteAccount()

        expect(flushUploadsOrThrow).not.toHaveBeenCalled()
    })

    it("clears PowerSync and the departing user's storage after the server confirms", async () => {
        await deleteAccount()

        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
        expect(clearUserStorage).toHaveBeenCalledWith('user-123')
    })

    it('completes teardown even when the auth sign-out reports an error', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: new Error('revoke failed') })

        await expect(deleteAccount()).resolves.toBeUndefined()

        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
        expect(clearUserStorage).toHaveBeenCalledWith('user-123')
    })

    it('completes teardown even when the PowerSync clear fails', async () => {
        ;(disconnectAndClearPowerSync as jest.Mock).mockRejectedValue(new Error('db locked'))

        await expect(deleteAccount()).resolves.toBeUndefined()

        expect(clearUserStorage).toHaveBeenCalledWith('user-123')
    })

    it('calls the edge function before any local teardown', async () => {
        await deleteAccount()

        const fetchOrder = mockFetch.mock.invocationCallOrder[0]
        const clearOrder = (disconnectAndClearPowerSync as jest.Mock).mock.invocationCallOrder[0]
        expect(fetchOrder).toBeLessThan(clearOrder)
    })
})

describe('signOut', () => {
    it("drains uploads, signs out, then clears the departing user's storage", async () => {
        await signOut()

        expect(flushUploadsOrThrow).toHaveBeenCalledTimes(1)
        expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
        expect(clearUserStorage).toHaveBeenCalledWith('user-123')
    })

    it('throws and skips teardown when the upload flush cannot drain', async () => {
        ;(flushUploadsOrThrow as jest.Mock).mockRejectedValue(new Error('flush timed out'))

        await expect(signOut()).rejects.toThrow('flush timed out')

        expect(supabase.auth.signOut).not.toHaveBeenCalled()
        expect(clearUserStorage).not.toHaveBeenCalled()
    })

    it('throws and skips the storage clear when the auth sign-out errors', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: new Error('revoke failed') })

        await expect(signOut()).rejects.toThrow('revoke failed')

        expect(disconnectAndClearPowerSync).not.toHaveBeenCalled()
        expect(clearUserStorage).not.toHaveBeenCalled()
    })
})

describe('forceSignOut', () => {
    it("completes local cleanup and clears the user's storage even when the auth sign-out rejects", async () => {
        ;(supabase.auth.signOut as jest.Mock).mockRejectedValue(new Error('network dead'))

        await expect(forceSignOut()).resolves.toBeUndefined()

        expect(mockRemoveSession).toHaveBeenCalledTimes(1)
        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
        expect(clearUserStorage).toHaveBeenCalledWith('user-123')
    })

    it('skips every teardown step when the session cannot be removed', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockRejectedValue(new TypeError('Network request failed'))
        delete authMock._removeSession

        await expect(forceSignOut()).rejects.toThrow('Could not sign out on this device')

        expect(disconnectAndClearPowerSync).not.toHaveBeenCalled()
        expect(clearUserStorage).not.toHaveBeenCalled()
    })
})

describe('clearLocalSession', () => {
    it('does not touch _removeSession when the official signOut succeeds', async () => {
        await clearLocalSession()

        expect(mockRemoveSession).not.toHaveBeenCalled()
        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
    })

    it('falls back to _removeSession when signOut returns an error, then wipes', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: new Error('Network request failed') })

        await expect(clearLocalSession()).resolves.toBeUndefined()

        expect(mockRemoveSession).toHaveBeenCalledTimes(1)
        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
    })

    it('falls back to _removeSession when signOut throws', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockRejectedValue(new TypeError('Network request failed'))

        await expect(clearLocalSession()).resolves.toBeUndefined()

        expect(mockRemoveSession).toHaveBeenCalledTimes(1)
        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
    })

    it('aborts before wiping anything when the session cannot be removed', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: new Error('Network request failed') })
        delete authMock._removeSession

        await expect(clearLocalSession()).rejects.toThrow('Could not sign out on this device')

        expect(disconnectAndClearPowerSync).not.toHaveBeenCalled()
    })
})
