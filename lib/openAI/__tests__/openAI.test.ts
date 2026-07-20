// openAI.test.ts
// Covers the fetchOpenAI edge-function boundary: success passthrough, the refusal (422)
// mapping, and the daily-quota (429) mapping added for audit C1, plus the H4 Sentry telemetry:
// network/fetch rejections, unmapped/5xx edge failures, and a 200 whose body stream fails mid-read
// are each captured exactly once, while the friendly, working-as-designed refused/429/403
// outcomes stay uncaptured.

import { supabase } from '@/lib/supabase/client'
import * as Sentry from '@sentry/react-native'
import { askOpenAIText, askOpenAIVision } from '../openAI'

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

// openAI.ts imports @sentry/react-native at module scope (H4) — mock it, matching the
// established convention (connector.test.ts, persistErrors.test.ts).
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn() }))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

beforeEach(() => {
    jest.clearAllMocks()
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
    })
})

describe('askOpenAIVision', () => {
    it('posts to the fetchOpenAI edge function and returns a 200 body unchanged', async () => {
        const rawBody = '{"name":"Banana","ingredients":[{"name":"banana","brand":null,"quantity":1,"protein":1,"carbs":27,"fats":0,"calories":105}]}'
        mockFetch.mockResolvedValue({ ok: true, text: async () => rawBody })

        const result = await askOpenAIVision('data:image/jpeg;base64,abc', 'meal')

        expect(result).toBe(rawBody)
        expect(mockFetch).toHaveBeenCalledWith(
            'https://test.supabase.co/functions/v1/fetchOpenAI',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }),
                body: JSON.stringify({ type: 'vision', base64Image: 'data:image/jpeg;base64,abc', mode: 'meal' }),
            }),
        )
    })

    it('rejects with the friendly daily-limit message on a 429, without reading the response body, and never captures (working-as-designed limit)', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 429,
            text: jest.fn(async () => {
                throw new Error('should not read the body on a 429 (would leak the upstream response)')
            }),
        })

        await expect(askOpenAIVision('data:image/jpeg;base64,abc', 'meal')).rejects.toThrow(
            'Daily scan limit reached. Try again tomorrow, or add this meal manually.',
        )
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('rejects with a friendly subscription message on a 403, without reading the response body, and never captures (working-as-designed limit)', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 403,
            text: jest.fn(async () => {
                throw new Error('should not read the body on a 403 (would leak the upstream response)')
            }),
        })

        await expect(askOpenAIVision('data:image/jpeg;base64,abc', 'meal')).rejects.toThrow(
            "Couldn't verify your subscription. Please try again in a moment.",
        )
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('still maps a refusal (422) to the existing friendly message, and never captures it', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 422,
            text: async () => JSON.stringify({ error: 'refused', message: 'blocked by safety system' }),
        })

        await expect(askOpenAIVision('data:image/jpeg;base64,abc', 'item')).rejects.toThrow(
            'Could not analyze this photo. Try a clearer picture of your food, or add a manual entry.',
        )
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('surfaces a generic error for other failure statuses, and captures it exactly once, tagged edge-openai', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'OpenAI: 500' })

        await expect(askOpenAIVision('data:image/jpeg;base64,abc')).rejects.toThrow('Edge function error: 500 - OpenAI: 500')

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        const [captured, ctx] = (Sentry.captureException as jest.Mock).mock.calls[0]
        expect((captured as Error).message).toBe('Edge function error: 500 - OpenAI: 500')
        expect(ctx).toEqual({ tags: { area: 'edge-openai' } })
    })

    it('captures a network/fetch rejection exactly once, tagged edge-openai, then rethrows the same error', async () => {
        const networkError = new Error('Network request failed')
        mockFetch.mockRejectedValue(networkError)

        await expect(askOpenAIVision('data:image/jpeg;base64,abc')).rejects.toThrow('Network request failed')

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        expect(Sentry.captureException).toHaveBeenCalledWith(networkError, { tags: { area: 'edge-openai' } })
    })

    it('captures exactly once, tagged edge-openai, when a 200 response body stream fails mid-read, then rethrows', async () => {
        const streamError = new Error('Network connection lost')
        mockFetch.mockResolvedValue({
            ok: true,
            text: jest.fn(async () => {
                throw streamError
            }),
        })

        await expect(askOpenAIVision('data:image/jpeg;base64,abc')).rejects.toThrow('Network connection lost')

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        expect(Sentry.captureException).toHaveBeenCalledWith(streamError, { tags: { area: 'edge-openai' } })
    })

    it('throws "Not authenticated" and never calls fetch when there is no session', async () => {
        ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })

        await expect(askOpenAIVision('data:image/jpeg;base64,abc')).rejects.toThrow('Not authenticated')
        expect(mockFetch).not.toHaveBeenCalled()
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })
})

// M8: the client half of cancellation propagation — an AbortSignal threaded down to this
// module's fetch() call, so cancelling the analyze modal actually tears down the in-flight
// request instead of only discarding the result once it resolves.
describe('cancellation (M8)', () => {
    it('forwards a passed AbortSignal into the fetch call', async () => {
        mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' })
        const controller = new AbortController()

        await askOpenAIVision('data:image/jpeg;base64,abc', 'meal', undefined, controller.signal)

        expect(mockFetch).toHaveBeenCalledWith(
            'https://test.supabase.co/functions/v1/fetchOpenAI',
            expect.objectContaining({ signal: controller.signal }),
        )
    })

    it('makes no fetch call with an undefined signal when the caller passes none (unchanged default)', async () => {
        mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' })

        await askOpenAIText('grilled chicken')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ signal: undefined }),
        )
    })

    it('rejects with the AbortError but never captures it to Sentry — an intentional cancel, not an ops failure', async () => {
        const abortError = new DOMException('The operation was aborted', 'AbortError')
        mockFetch.mockRejectedValue(abortError)

        await expect(askOpenAIVision('data:image/jpeg;base64,abc')).rejects.toBe(abortError)

        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('still captures a non-abort fetch rejection to Sentry (abort-filtering does not swallow real failures)', async () => {
        const networkError = new Error('Network request failed')
        mockFetch.mockRejectedValue(networkError)

        await expect(askOpenAIVision('data:image/jpeg;base64,abc')).rejects.toBe(networkError)

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    })
})

describe('askOpenAIText', () => {
    it('posts to the fetchOpenAI edge function and returns a 200 body unchanged', async () => {
        const rawBody = '{"calories":250,"protein":20,"carbs":30,"fats":5}'
        mockFetch.mockResolvedValue({ ok: true, text: async () => rawBody })

        const result = await askOpenAIText('grilled chicken')

        expect(result).toBe(rawBody)
        expect(mockFetch).toHaveBeenCalledWith(
            'https://test.supabase.co/functions/v1/fetchOpenAI',
            expect.objectContaining({ body: JSON.stringify({ type: 'text', foodName: 'grilled chicken' }) }),
        )
    })

    it('rejects with the friendly daily-limit message on a 429', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 429, text: async () => '{"error":"quota_exceeded"}' })

        await expect(askOpenAIText('grilled chicken')).rejects.toThrow(
            'Daily scan limit reached. Try again tomorrow, or add this meal manually.',
        )
    })
})
