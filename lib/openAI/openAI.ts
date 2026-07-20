// lib/openAI/openAI.ts
// Calls Supabase Edge Function (fetchOpenAI) instead of OpenAI directly. No API key in client.

import { ENV } from '@/lib/env';
import type { ScanMode } from '@/lib/openAI/mealImage';
import { supabase } from '@/lib/supabase/client';

export type VisionProvider = 'openai' | 'gemini'

const EDGE_FN_URL = `${ENV.SUPABASE_URL}/functions/v1/fetchOpenAI`

async function callEdgeFunction(
    body:
        | { type: 'text'; foodName: string }
        | { type: 'vision'; base64Image: string; mode: ScanMode; provider?: VisionProvider },
): Promise<string> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const res = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        // Daily quota hit (audit C1) — checked first, and without reading the body, so the
        // upstream/edge response is never touched let alone leaked into the thrown message.
        if (res.status === 429) {
            throw new Error('Daily scan limit reached. Try again tomorrow, or add this meal manually.')
        }
        // Server-side premium gate (audit H1) fails closed to 403 — even for a paying user during
        // a RevenueCat REST outage/rate-limit. Mapped here (before the body is read, like the 429
        // above) so a subscriber sees a neutral retry message instead of the raw "premium_required"
        // edge body leaking verbatim into the analyzing/add-nutrition alert.
        if (res.status === 403) {
            throw new Error("Couldn't verify your subscription. Please try again in a moment.")
        }
        const text = await res.text()
        let parsed: { error?: string } | null = null
        try {
            parsed = JSON.parse(text) as { error?: string }
        } catch {
            // not JSON
        }
        if (parsed?.error === 'refused') {
            throw new Error(
                'Could not analyze this photo. Try a clearer picture of your food, or add a manual entry.',
            )
        }
        throw new Error(`Edge function error: ${res.status} - ${text}`)
    }

    return res.text()
}

export async function askOpenAI(_question: string): Promise<string> {
    throw new Error('Generic askOpenAI is not supported. Use askOpenAIText or askOpenAIVision for nutrition.')
}

export async function askOpenAIVision(base64Image: string, mode: ScanMode = 'meal', provider?: VisionProvider): Promise<string> {
    return callEdgeFunction({ type: 'vision', base64Image, mode, ...(provider ? { provider } : {}) })
}

export async function askOpenAIText(foodName: string): Promise<string> {
    return callEdgeFunction({ type: 'text', foodName })
}
