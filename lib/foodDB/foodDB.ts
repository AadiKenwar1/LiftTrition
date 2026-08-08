import { ENV } from '@/lib/env'
import { supabase } from '@/lib/supabase/client'
import * as Sentry from '@sentry/react-native'
import { CacheEntry, FoodDetails, FoodItem, FoodSearchResult } from './types'

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 1 week
const EDGE_FN_URL = `${ENV.SUPABASE_URL}/functions/v1/fetchfooddb`

// Friendly, user-facing message thrown when the per-user daily food-DB quota (audit C1) is hit.
// Exported so a caller (e.g. foodDBModal) can distinguish a quota block from a generic network
// failure and surface this copy, instead of a misleading "check your connection" message.
export const FOOD_SEARCH_QUOTA_MESSAGE = 'Daily search limit reached. Try again tomorrow.'

// Friendly, user-facing message thrown when the server-side premium gate (audit H1) fails closed
// to a 403 — including for a paying subscriber during a RevenueCat REST outage. Exported so
// foodDBModal can surface it (and distinguish it from a generic connection error), mirroring the
// quota message above so neither path ever formats the raw "premium_required" edge body.
export const FOOD_SEARCH_PREMIUM_MESSAGE = "Couldn't verify your subscription. Please try again in a moment."

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

    let res: Response
    try {
        res = await fetch(EDGE_FN_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })
    } catch (e) {
        // Offline/DNS/TLS failures never reach the edge function at all — captured once here so
        // both callers (getFoodSearchResults' rethrow and getFoodDetails' swallow-to-null) are covered.
        Sentry.captureException(e, { tags: { area: 'edge-fooddb' } })
        throw e
    }

    if (!res.ok) {
        // Daily quota hit (audit C1) — checked first, and without reading the body, so the
        // upstream/edge response is never touched let alone leaked into the thrown message.
        // Working-as-designed limit, not an ops failure — left uncaptured (would just be noise).
        if (res.status === 429) {
            throw new Error(FOOD_SEARCH_QUOTA_MESSAGE)
        }
        // Server-side premium gate (audit H1) fails closed to 403 — mapped before the body is read
        // (like the 429 above) so the raw "premium_required" edge body never leaks into a thrown
        // message. getFoodDetails swallows this to null; foodDBModal surfaces the copy on search.
        // Also left uncaptured — same working-as-designed reasoning as the 429 above.
        if (res.status === 403) {
            throw new Error(FOOD_SEARCH_PREMIUM_MESSAGE)
        }
        const text = await res.text()
        // Unmapped/5xx edge failure — genuinely unexpected; captured once here so both callers
        // (search's rethrow and details' swallow-to-null) are covered from this one shared site.
        const err = new Error(`Edge function error: ${res.status} - ${text}`)
        Sentry.captureException(err, { tags: { area: 'edge-fooddb' } })
        throw err
    }

    try {
        return (await res.json()) as T
    } catch (e) {
        // A 2xx response whose body isn't valid JSON is a genuine edge-function bug, not a
        // client/network fault — captured once here, the last throwing step in this function, so
        // both callers (search's rethrow and details' swallow-to-null) are covered.
        Sentry.captureException(e, { tags: { area: 'edge-fooddb' } })
        throw e
    }
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
        // Known degraded path (audit C1): this swallows every edge error, including a 429
        // "daily search limit reached". A cap hit while tapping a search result in foodDBModal
        // therefore surfaces as a silent "no details" rather than a quota message — accepted to
        // keep this call site's behavior (and enrichBrandedItem's silent-fallback contract)
        // unchanged; not a hidden accident.
        return null
    }
}

export async function getFoodItem(searchItem: FoodSearchResult): Promise<FoodItem | null> {
    const details = await getFoodDetails(searchItem)
    if (!details) return null

    return {
        id: details.fdcId,
        name: details.name,
        brand: details.brandName?.trim() || null,
        calories: details.calories,
        protein: details.protein,
        carbs: details.carbs,
        fats: details.fats,
    }
}
