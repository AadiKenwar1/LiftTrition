// openAI.test.ts
// Covers the fetchOpenAI edge-function boundary: success passthrough, the refusal (422)
// mapping, and the daily-quota (429) mapping added for audit C1.

import { supabase } from '@/lib/supabase/client'
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

    it('rejects with the friendly daily-limit message on a 429, without reading the response body', async () => {
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
    })

    it('still maps a refusal (422) to the existing friendly message', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 422,
            text: async () => JSON.stringify({ error: 'refused', message: 'blocked by safety system' }),
        })

        await expect(askOpenAIVision('data:image/jpeg;base64,abc', 'item')).rejects.toThrow(
            'Could not analyze this photo. Try a clearer picture of your food, or add a manual entry.',
        )
    })

    it('surfaces a generic error for other failure statuses', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'OpenAI: 500' })

        await expect(askOpenAIVision('data:image/jpeg;base64,abc')).rejects.toThrow('Edge function error: 500 - OpenAI: 500')
    })

    it('throws "Not authenticated" and never calls fetch when there is no session', async () => {
        ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })

        await expect(askOpenAIVision('data:image/jpeg;base64,abc')).rejects.toThrow('Not authenticated')
        expect(mockFetch).not.toHaveBeenCalled()
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
