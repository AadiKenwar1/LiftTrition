import { flushUploadsOrThrow } from '@/lib/powersync/FlushUploads'
import { disconnectAndClearPowerSync } from '@/lib/powersync/orchestrator'
import { supabase } from '@/lib/supabase/client'
import { clearUserStorage } from '@/lib/utils/userStorage'
import * as Sentry from '@sentry/react-native'
import { clearLocalSession, deleteAccount, forceSignOut, signOut } from '../accountFunctions'

jest.mock('@/lib/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(),
            signOut: jest.fn(),
        },
    },
}))

// jest.mock calls are hoisted above imports, so this reliably beats the real
// @/lib/env module's process.env snapshot-at-import-time behavior.
jest.mock('@/lib/env', () => ({
    ENV: { SUPABASE_URL: 'https://test.supabase.co' },
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

// accountFunctions.tsx now imports @sentry/react-native at module scope (H4) — mock it, matching
// the established convention (connector.test.ts, persistErrors.test.ts).
jest.mock('@sentry/react-native', () => ({
    captureMessage: jest.fn(),
    captureException: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

const authMock = supabase.auth as unknown as { getSession: jest.Mock; signOut: jest.Mock; _removeSession?: jest.Mock }
const mockRemoveSession = jest.fn()

let warnSpy: jest.SpyInstance

beforeEach(() => {
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

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

    // Supabase Edge Function slugs are case-sensitive, and the deployed slug is all-lowercase
    // (supabase/config.toml [functions.deleteaccount]) — a camelCase URL here 404s instead of
    // deleting the account, so pin the exact path and the bearer token it is sent with.
    it('POSTs the session token to the lowercase deleteaccount slug', async () => {
        await deleteAccount()

        expect(mockFetch).toHaveBeenCalledWith(
            'https://test.supabase.co/functions/v1/deleteaccount',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
            }),
        )
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

    it('propagates a disconnectAndClearPowerSync failure unchanged, without capturing it here — profile.tsx owns that capture, so double-capturing here would double-count the same error', async () => {
        const error = new Error('disk full')
        ;(disconnectAndClearPowerSync as jest.Mock).mockRejectedValue(error)

        await expect(signOut()).rejects.toBe(error)

        expect(clearUserStorage).not.toHaveBeenCalled()
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })
})

describe('forceSignOut', () => {
    it('reports the data-loss event via captureMessage before starting teardown, and never captureException on the normal path', async () => {
        await forceSignOut()

        expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
        expect(Sentry.captureMessage).toHaveBeenCalledWith('force_sign_out_data_loss', {
            level: 'warning',
            tags: { area: 'force-sign-out-data-loss' },
        })
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it("completes local cleanup and clears the user's storage even when the auth sign-out rejects", async () => {
        ;(supabase.auth.signOut as jest.Mock).mockRejectedValue(new Error('network dead'))

        await expect(forceSignOut()).resolves.toBeUndefined()

        expect(mockRemoveSession).toHaveBeenCalledTimes(1)
        expect(disconnectAndClearPowerSync).toHaveBeenCalledTimes(1)
        expect(clearUserStorage).toHaveBeenCalledWith('user-123')
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('skips every teardown step when the session cannot be removed, and captures its own failure before rethrowing', async () => {
        ;(supabase.auth.signOut as jest.Mock).mockRejectedValue(new TypeError('Network request failed'))
        delete authMock._removeSession

        await expect(forceSignOut()).rejects.toThrow('Could not sign out on this device')

        expect(disconnectAndClearPowerSync).not.toHaveBeenCalled()
        expect(clearUserStorage).not.toHaveBeenCalled()

        // The entry-point message still fires (it's unconditional), and the body's own failure is
        // captured separately, tagged force-sign-out-failed, before the original error is rethrown.
        expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        const [captured, ctx] = (Sentry.captureException as jest.Mock).mock.calls[0]
        expect(captured).toBeInstanceOf(Error)
        expect((captured as Error).message).toContain('Could not sign out on this device')
        expect(ctx).toEqual({ tags: { area: 'force-sign-out-failed' } })
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

    it('swallows a disconnectAndClearPowerSync failure (still resolves) but captures it exactly once — the deleteAccount/forceSignOut path has no other capturer', async () => {
        const error = new Error('disk full')
        ;(disconnectAndClearPowerSync as jest.Mock).mockRejectedValue(error)

        await expect(clearLocalSession()).resolves.toBeUndefined()

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        expect(Sentry.captureException).toHaveBeenCalledWith(error, {
            tags: { area: 'powersync-disconnect-clear', reason: 'local_session_clear' },
        })
    })
})
