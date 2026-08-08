// lib/openAI/openAI.ts
// Calls Supabase Edge Function (fetchOpenAI) instead of OpenAI directly. No API key in client.

import { ENV } from '@/lib/env';
import type { ScanMode } from '@/lib/openAI/mealImage';
import { supabase } from '@/lib/supabase/client';
import * as Sentry from '@sentry/react-native';

export type VisionProvider = 'openai' | 'gemini'

const EDGE_FN_URL = `${ENV.SUPABASE_URL}/functions/v1/fetchopenai`

// True for the AbortError a fetch()/body-read rejects with when `signal` fires — an intentional
// client-side cancel (M8), not an ops-relevant failure, so it must never hit Sentry as noise.
// Checked structurally (not `instanceof Error`/DOMException) since which concrete type a fetch
// abort rejects with is runtime-dependent.
function isAbortError(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError'
}

async function callEdgeFunction(
    body:
        | { type: 'text'; foodName: string }
        | { type: 'vision'; base64Image: string; mode: ScanMode; provider?: VisionProvider },
    signal?: AbortSignal,
): Promise<string> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    let res: Response
    try {
        res = await fetch(EDGE_FN_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
        })
    } catch (e) {
        // An aborted analyze (modal cancelled mid-flight) rejects here too — expected, not an
        // ops failure, so it's rethrown uncaptured (analyzePhoto's canceledRef guard swallows it).
        if (isAbortError(e)) throw e
        // Offline/DNS/TLS failures never reach the edge function at all, so without this the most
        // common real-world trigger for this funnel would stay invisible to ops.
        Sentry.captureException(e, { tags: { area: 'edge-openai' } })
        throw e
    }

    if (!res.ok) {
        // Daily quota hit (audit C1) — checked first, and without reading the body, so the
        // upstream/edge response is never touched let alone leaked into the thrown message.
        // Working-as-designed limit, not an ops failure — left uncaptured (would just be noise).
        if (res.status === 429) {
            throw new Error('Daily scan limit reached. Try again tomorrow, or add this meal manually.')
        }
        // Server-side premium gate (audit H1) fails closed to 403 — even for a paying user during
        // a RevenueCat REST outage/rate-limit. Mapped here (before the body is read, like the 429
        // above) so a subscriber sees a neutral retry message instead of the raw "premium_required"
        // edge body leaking verbatim into the analyzing/add-nutrition alert. Also left uncaptured —
        // same working-as-designed reasoning as the 429 above.
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
        // Unmapped/5xx edge failure — genuinely unexpected, so ops needs to see it even though the
        // thrown message above is already what the user sees (this is ops-side aggregation, not the
        // fix for a user-invisible failure).
        const err = new Error(`Edge function error: ${res.status} - ${text}`)
        Sentry.captureException(err, { tags: { area: 'edge-openai' } })
        throw err
    }

    try {
        return await res.text()
    } catch (e) {
        // An abort after headers arrive (cancel raced the body read) lands here too — same
        // no-capture rule as the fetch-level catch above.
        if (isAbortError(e)) throw e
        // A 2xx response whose body stream fails mid-read (e.g. a dropped connection during the
        // ~30s vision call) is a genuine failure — captured once here, the last throwing step in
        // this function.
        Sentry.captureException(e, { tags: { area: 'edge-openai' } })
        throw e
    }
}

export async function askOpenAI(_question: string): Promise<string> {
    throw new Error('Generic askOpenAI is not supported. Use askOpenAIText or askOpenAIVision for nutrition.')
}

export async function askOpenAIVision(base64Image: string, mode: ScanMode = 'meal', provider?: VisionProvider, signal?: AbortSignal): Promise<string> {
    return callEdgeFunction({ type: 'vision', base64Image, mode, ...(provider ? { provider } : {}) }, signal)
}

export async function askOpenAIText(foodName: string, signal?: AbortSignal): Promise<string> {
    return callEdgeFunction({ type: 'text', foodName }, signal)
}
