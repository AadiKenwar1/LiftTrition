// lib/openAI/openAI.ts
// Calls Supabase Edge Function (fetchOpenAI) instead of OpenAI directly. No API key in client.

import { supabase } from '@/lib/supabase/client';

const EDGE_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/fetchOpenAI`

async function callEdgeFunction(
    body:
        | { type: 'text'; foodName: string }
        | { type: 'vision'; base64Image: string; mode: 'meal' | 'label' }
        | { type: 'lookup'; productName: string },
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

export async function askOpenAIVision(base64Image: string, mode: 'meal' | 'label' = 'meal'): Promise<string> {
    return callEdgeFunction({ type: 'vision', base64Image, mode })
}

export async function askOpenAIText(foodName: string): Promise<string> {
    return callEdgeFunction({ type: 'text', foodName })
}

export interface BrandedMacros {
    calories: number
    protein: number
    carbs: number
    fats: number
}

// Web-search fallback for branded products FatSecret can't find. Returns null if nothing usable.
export async function lookupBrandedMacros(productName: string): Promise<BrandedMacros | null> {
    const raw = await callEdgeFunction({ type: 'lookup', productName })

    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    }

    let parsed: Partial<BrandedMacros> | null = null
    try {
        parsed = JSON.parse(cleaned) as Partial<BrandedMacros>
    } catch {
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (match) {
            try {
                parsed = JSON.parse(match[0]) as Partial<BrandedMacros>
            } catch {
                parsed = null
            }
        }
    }
    if (!parsed) return null

    const result: BrandedMacros = {
        calories: Number(parsed.calories) || 0,
        protein: Number(parsed.protein) || 0,
        carbs: Number(parsed.carbs) || 0,
        fats: Number(parsed.fats) || 0,
    }
    if (result.calories === 0 && result.protein === 0 && result.carbs === 0 && result.fats === 0) {
        return null
    }
    return result
}
