// lib/openAI/openAI.ts
// Calls Supabase Edge Function (fetchOpenAI) instead of OpenAI directly. No API key in client.

import { supabase } from '@/lib/supabase/client';

const EDGE_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/fetchOpenAI`

async function callEdgeFunction(body: { type: 'text'; foodName: string } | { type: 'vision'; base64Image: string }): Promise<string> {
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
        const text = await res.text()
        throw new Error(`Edge function error: ${res.status} - ${text}`)
    }

    return res.text()
}

export async function askOpenAI(_question: string): Promise<string> {
    throw new Error('Generic askOpenAI is not supported. Use askOpenAIText or askOpenAIVision for nutrition.')
}

export async function askOpenAIVision(base64Image: string): Promise<string> {
    return callEdgeFunction({ type: 'vision', base64Image })
}

export async function askOpenAIText(foodName: string): Promise<string> {
    return callEdgeFunction({ type: 'text', foodName })
}
