// Shared server-side RevenueCat entitlement check (audit H1). Both fetchOpenAI and
// fetchFoodDB call this before any paid provider call so premium is enforced in the Edge
// Function itself, not just via the React Native client's local `hasPremium` UX guard —
// a valid Supabase JWT alone must never be enough to reach a paid upstream call for free.
//
// DUPLICATED on purpose: an identical copy lives in ../fetchOpenAI/entitlement.ts so each
// function folder is self-contained for dashboard copy-paste deploys (the dashboard editor
// cannot reach a sibling _shared/ folder). Keep the code in both copies in sync when
// editing; the canonical Deno tests live next to the fetchOpenAI copy (entitlement.test.ts).

// Must match context/BillingContext/functions/billingFunctions.tsx's ENTITLEMENT_ID — the
// RevenueCat entitlement identifier configured for LiftTrition Pro.
export const ENTITLEMENT_ID = 'LiftTrition Pro'

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1'
const ENTITLEMENT_CHECK_TIMEOUT_MS = 4000

// Shape of the fields read from RevenueCat's GET /v1/subscribers/{id} response.
interface RevenueCatSubscriberResponse {
    subscriber?: {
        entitlements?: Record<string, { expires_date?: string | null }>
    }
}

// Looks up userId's RevenueCat subscriber record and reports whether the LiftTrition Pro
// entitlement is present and unexpired. Fails closed (returns false) on a missing secret
// key, a non-200 response, a timeout/abort, or any other network/parse error — an outage
// or misconfiguration must never reopen the free-access-to-paid-features hole this closes.
// Errors are console.error'd so a spike in false negatives (e.g. RC REST rate-limiting) is
// observable in Edge Function logs rather than silently degrading every caller.
export async function hasPremiumEntitlement(userId: string): Promise<boolean> {
    const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY')
    if (!secretKey) {
        console.error('[entitlement] REVENUECAT_SECRET_API_KEY not configured; failing closed')
        return false
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ENTITLEMENT_CHECK_TIMEOUT_MS)

    try {
        const res = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(userId)}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
            signal: controller.signal,
        })

        if (!res.ok) {
            console.error('[entitlement] RevenueCat subscriber lookup failed', res.status)
            return false
        }

        const data = (await res.json()) as RevenueCatSubscriberResponse
        const entitlement = data.subscriber?.entitlements?.[ENTITLEMENT_ID]
        if (!entitlement) return false

        // No expires_date means a non-expiring (e.g. lifetime/non-subscription) entitlement.
        if (!entitlement.expires_date) return true
        return new Date(entitlement.expires_date).getTime() > Date.now()
    } catch (err) {
        console.error('[entitlement] RevenueCat subscriber lookup error', err instanceof Error ? err.message : err)
        return false
    } finally {
        clearTimeout(timeoutId)
    }
}
