// foodDB.test.ts
// foodDB.ts is a thin client for the fetchFoodDB edge function (no direct FatSecret client
// lives here anymore), so the harness mocks the edge-function boundary: supabase.auth.getSession
// (for the bearer token) and a single global.fetch call. This supersedes the previous version of
// this file, which mocked a defunct direct-FatSecret token-fetch + foods.search client and — per
// the audit C1 brief — had 57/58 tests failing against current code, including a stale assertion
// that a 429 resolves getFoodSearchResults to [] (it now rejects with a friendly message).

import { supabase } from '@/lib/supabase/client'
import * as Sentry from '@sentry/react-native'
import { clearFoodDBCaches, FOOD_SEARCH_PREMIUM_MESSAGE, getFoodDetails, getFoodItem, getFoodSearchResults } from '../foodDB'

// jest.mock calls are hoisted above imports, so this reliably beats the real
// @/lib/env module's process.env snapshot-at-import-time behavior.
jest.mock('@/lib/env', () => ({
    ENV: { SUPABASE_URL: 'https://test.supabase.co' },
}))

jest.mock('@/lib/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(),
        },
    },
}))

// foodDB.ts now imports @sentry/react-native at module scope (H4) — required so this file's
// require('../foodDB') resolves to a mock instead of the real, untransformed package.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn() }))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

const EDGE_URL = 'https://test.supabase.co/functions/v1/fetchfooddb'

beforeEach(() => {
    jest.clearAllMocks()
    // Both in-memory caches are module-scoped, so clear them between tests to avoid one test's
    // cached query/foodId leaking into another (the module itself is imported once for the file).
    clearFoodDBCaches()
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
    })
})

describe('getFoodSearchResults', () => {
    it('returns [] for an empty/whitespace query without touching auth or fetch', async () => {
        expect(await getFoodSearchResults('   ')).toEqual([])
        expect(supabase.auth.getSession).not.toHaveBeenCalled()
        expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends the trimmed, lowercased query and returns the parsed results unchanged', async () => {
        const results = [{ description: 'Banana', fdcId: '123', brandName: 'Generic' }]
        mockFetch.mockResolvedValue({ ok: true, json: async () => results })

        const got = await getFoodSearchResults('  BANANA  ')

        expect(got).toEqual(results)
        expect(mockFetch).toHaveBeenCalledWith(
            EDGE_URL,
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }),
                body: JSON.stringify({ type: 'search', query: 'banana' }),
            }),
        )
    })

    it('throws "Not authenticated" and never calls fetch when there is no session', async () => {
        ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })

        await expect(getFoodSearchResults('banana')).rejects.toThrow('Not authenticated')
        expect(mockFetch).not.toHaveBeenCalled()
    })

    it('caches results so a repeated query short-circuits with no second network call (no double-counted quota unit)', async () => {
        const results = [{ description: 'Rice', fdcId: '789' }]
        mockFetch.mockResolvedValue({ ok: true, json: async () => results })

        const first = await getFoodSearchResults('rice')
        const second = await getFoodSearchResults('rice')

        expect(first).toEqual(results)
        expect(second).toEqual(results)
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('rejects with the friendly daily-limit message on a 429, without reading the response body, and never captures (working-as-designed limit)', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 429,
            text: jest.fn(async () => {
                throw new Error('should not read the body on a 429 (would leak the upstream response)')
            }),
        })

        // Supersedes the previous (already-stale) expectation that a 429 resolved to [].
        await expect(getFoodSearchResults('ratelimit')).rejects.toThrow('Daily search limit reached. Try again tomorrow.')
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('rejects with the friendly premium message on a 403, without reading the response body, and never captures (working-as-designed limit)', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 403,
            text: jest.fn(async () => {
                throw new Error('should not read the body on a 403 (would leak the upstream response)')
            }),
        })

        await expect(getFoodSearchResults('premiumgate')).rejects.toThrow(FOOD_SEARCH_PREMIUM_MESSAGE)
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('rethrows a non-429 edge function error with the raw status and body (surfaced by foodDBModal, swallowed by enrichBrandedItem), and captures it exactly once', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' })

        await expect(getFoodSearchResults('error')).rejects.toThrow('Edge function error: 500 - boom')

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        const [captured, ctx] = (Sentry.captureException as jest.Mock).mock.calls[0]
        expect((captured as Error).message).toBe('Edge function error: 500 - boom')
        expect(ctx).toEqual({ tags: { area: 'edge-fooddb' } })
    })

    it('captures a network/fetch rejection exactly once, tagged edge-fooddb, then rethrows', async () => {
        const networkError = new Error('network down')
        mockFetch.mockRejectedValue(networkError)

        await expect(getFoodSearchResults('offline')).rejects.toThrow('network down')

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        expect(Sentry.captureException).toHaveBeenCalledWith(networkError, { tags: { area: 'edge-fooddb' } })
    })

    it('captures exactly once, tagged edge-fooddb, when a 200 response body is not valid JSON (an edge-function bug), then rethrows', async () => {
        const parseError = new Error('Unexpected token in JSON')
        mockFetch.mockResolvedValue({
            ok: true,
            json: jest.fn(async () => {
                throw parseError
            }),
        })

        await expect(getFoodSearchResults('badjson')).rejects.toThrow('Unexpected token in JSON')

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        expect(Sentry.captureException).toHaveBeenCalledWith(parseError, { tags: { area: 'edge-fooddb' } })
    })
})

describe('getFoodDetails', () => {
    it('returns null immediately for an empty food id, without calling fetch', async () => {
        expect(await getFoodDetails({ description: 'Test', fdcId: '' })).toBeNull()
        expect(mockFetch).not.toHaveBeenCalled()
    })

    it('fetches and returns details, then serves a repeat lookup from cache', async () => {
        const details = { name: 'Banana', fdcId: '123', calories: 105, protein: 1.3, carbs: 27, fats: 0.4, servingSize: '1 medium', brandName: 'Generic' }
        mockFetch.mockResolvedValue({ ok: true, json: async () => details })
        const item = { description: 'Banana', fdcId: '123' }

        const first = await getFoodDetails(item)
        const second = await getFoodDetails(item)

        expect(first).toEqual(details)
        expect(second).toEqual(details)
        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith(EDGE_URL, expect.objectContaining({ body: JSON.stringify({ type: 'details', foodId: '123' }) }))
    })

    it('resolves to null on a 429 (documented degraded path: no quota message surfaced at this call site), and never captures', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 429, text: async () => '{"error":"quota_exceeded"}' })

        expect(await getFoodDetails({ description: 'Rice', fdcId: '789' })).toBeNull()
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('resolves to null on a network failure, but still captures it once via the shared callEdgeFunction helper', async () => {
        mockFetch.mockRejectedValue(new Error('network down'))

        expect(await getFoodDetails({ description: 'Rice', fdcId: 'net-fail' })).toBeNull()

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        expect(Sentry.captureException).toHaveBeenCalledWith(new Error('network down'), { tags: { area: 'edge-fooddb' } })
    })
})

describe('getFoodItem', () => {
    it('maps FoodDetails onto the FoodItem shape', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ name: 'Banana', fdcId: '123', calories: 105, protein: 1.3, carbs: 27, fats: 0.4, servingSize: '1 medium', brandName: '  Generic  ' }),
        })

        const item = await getFoodItem({ description: 'Banana', fdcId: '123' })

        expect(item).toEqual({ id: '123', name: 'Banana', brand: 'Generic', calories: 105, protein: 1.3, carbs: 27, fats: 0.4 })
    })

    it('returns null when details are unavailable (e.g. quota exceeded)', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 429, text: async () => '' })

        expect(await getFoodItem({ description: 'Rice', fdcId: '789' })).toBeNull()
    })
})

describe('clearFoodDBCaches', () => {
    it('forces a refetch on the next identical search', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => [{ description: 'Apple', fdcId: 'apple-1' }] })

        await getFoodSearchResults('apple')
        expect(mockFetch).toHaveBeenCalledTimes(1)

        await getFoodSearchResults('apple') // cache hit — no new network call
        expect(mockFetch).toHaveBeenCalledTimes(1)

        clearFoodDBCaches()

        await getFoodSearchResults('apple') // cache cleared — network again
        expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('forces a refetch on the next identical details lookup', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ name: 'Apple', fdcId: 'apple-1', calories: 95, protein: 0, carbs: 25, fats: 0, servingSize: '1 medium', brandName: '' }),
        })
        const item = { description: 'Apple', fdcId: 'apple-1' }

        await getFoodDetails(item)
        expect(mockFetch).toHaveBeenCalledTimes(1)

        clearFoodDBCaches()

        await getFoodDetails(item)
        expect(mockFetch).toHaveBeenCalledTimes(2)
    })
})
