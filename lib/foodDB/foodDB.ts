import { ENV } from '@/lib/env'
import { supabase } from '@/lib/supabase/client'
import { CacheEntry, FoodDetails, FoodItem, FoodSearchResult } from './types'

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 1 week
const EDGE_FN_URL = `${ENV.SUPABASE_URL}/functions/v1/fetchFoodDB`

const searchCache: Record<string, CacheEntry<FoodSearchResult[]>> = {}
const detailsCache: Record<string, CacheEntry<FoodDetails>> = {}

// Sign-out hook: both caches are keyed per query, not per user, but letting
// them survive an account switch is unbounded memory for stale sessions.
export function clearFoodDBCaches(): void {
    for (const key of Object.keys(searchCache)) delete searchCache[key]
    for (const key of Object.keys(detailsCache)) delete detailsCache[key]
}

function isFresh<T>(entry: CacheEntry<T> | undefined): boolean {
    return !!entry && Date.now() - entry.timestamp < CACHE_TTL_MS
}

async function callEdgeFunction<T>(body: { type: 'search'; query: string } | { type: 'details'; foodId: string }): Promise<T> {
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

    return res.json()
}

export async function getFoodSearchResults(query: string): Promise<FoodSearchResult[]> {
    const key = query.trim().toLowerCase()
    if (!key) return []

    const cached = searchCache[key]
    if (cached && isFresh(cached)) return cached.data

    try {
        const results = await callEdgeFunction<FoodSearchResult[]>({ type: 'search', query: key })
        searchCache[key] = { data: results, timestamp: Date.now() }
        return results
    } catch (error) {
        throw error
    }
}

export async function getFoodDetails(item: FoodSearchResult): Promise<FoodDetails | null> {
    const foodId = item.fdcId
    if (!foodId) return null

    const cached = detailsCache[foodId]
    if (cached && isFresh(cached)) return cached.data

    try {
        const details = await callEdgeFunction<FoodDetails | null>({ type: 'details', foodId })
        if (details) {
            detailsCache[foodId] = { data: details, timestamp: Date.now() }
        }
        return details
    } catch {
        return null
    }
}

export async function getFoodItem(searchItem: FoodSearchResult): Promise<FoodItem | null> {
    const details = await getFoodDetails(searchItem)
    if (!details) return null

    return {
        id: details.fdcId,
        name: details.name,
        calories: details.calories,
        protein: details.protein,
        carbs: details.carbs,
        fats: details.fats,
    }
}
