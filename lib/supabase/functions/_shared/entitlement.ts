// Shared server-side RevenueCat entitlement check (audit H1). Both fetchOpenAI and
// fetchFoodDB call this before any paid provider call so premium is enforced in the Edge
// Function itself, not just via the React Native client's local `hasPremium` UX guard —
// a valid Supabase JWT alone must never be enough to reach a paid upstream call for free.
//
// The check is table-first: the revenuecatWebhook Edge Function mirrors RevenueCat's
// entitlement state into public.user_entitlements on every subscription event, so the
// hot path here is one PostgREST read with no RevenueCat dependency. A missing, expired,
// non-premium or stale (updated_at older than 24h) row falls back to RevenueCat's REST
// API (and refreshes the mirror), so existing subscribers bootstrap themselves and a
// missed webhook self-heals. The staleness cap is what bounds a lost delivery: webhook
// handling is best-effort and RevenueCat stops retrying after 5 attempts, so a row that
// stopped receiving writes (e.g. a dropped refund event) is only ever trusted for a day.
// Every failure path fails closed.
//
// Single shared copy: fetchOpenAI, fetchFoodDB and revenuecatWebhook all import from
// here. Deploys go through the Supabase CLI (supabase/config.toml entrypoints), whose
// bundler follows this relative import — do not paste individual folders into the
// dashboard editor, it cannot reach a sibling _shared/ folder.

// Must match context/BillingContext/functions/billingFunctions.tsx's ENTITLEMENT_ID — the
// RevenueCat entitlement identifier configured for LiftTrition Pro.
export const ENTITLEMENT_ID = 'LiftTrition Pro'

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1'
const ENTITLEMENT_CHECK_TIMEOUT_MS = 4000
// How long a premium mirror row is trusted without re-verification against RevenueCat.
const MIRROR_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Shape of the fields read from RevenueCat's GET /v1/subscribers/{id} response.
interface RevenueCatSubscriberResponse {
    subscriber?: {
        entitlements?: Record<string, { expires_date?: string | null }>
    }
}

// Row shape of public.user_entitlements (user_entitlements.sql).
interface EntitlementRow {
    entitlement_expires_at: string | null
    has_lifetime: boolean
    updated_at: string | null
}

// What one RevenueCat subscriber lookup resolved to, normalized for the mirror row.
interface RevenueCatEntitlement {
    premium: boolean
    expiresAt: string | null
    hasLifetime: boolean
}

// Bounded fetch so a hung dependency can never hold the Edge Function open.
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ENTITLEMENT_CHECK_TIMEOUT_MS)
    try {
        return await fetch(url, { ...init, signal: controller.signal })
    } finally {
        clearTimeout(timeoutId)
    }
}

// Service-role PostgREST base + headers, or null when the function env lacks them
// (then callers skip the mirror and use RevenueCat directly).
function serviceRole(): { url: string; headers: Record<string, string> } | null {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) return null
    return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } }
}

// True when a mirror row grants premium right now.
function rowGrantsPremium(row: EntitlementRow): boolean {
    if (row.has_lifetime) return true
    if (!row.entitlement_expires_at) return false
    return new Date(row.entitlement_expires_at).getTime() > Date.now()
}

// True while the row is recent enough to trust without re-verifying. A missing or
// unparseable updated_at counts as stale — fail toward verification, never toward trust.
function rowIsFresh(row: EntitlementRow): boolean {
    if (!row.updated_at) return false
    const writtenAt = new Date(row.updated_at).getTime()
    if (Number.isNaN(writtenAt)) return false
    return Date.now() - writtenAt < MIRROR_MAX_AGE_MS
}

// Reads userId's mirror row; null on no row, missing env, or any read error.
async function readEntitlementRow(userId: string): Promise<EntitlementRow | null> {
    const svc = serviceRole()
    if (!svc) return null
    try {
        const res = await fetchWithTimeout(
            `${svc.url}/rest/v1/user_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=entitlement_expires_at,has_lifetime,updated_at`,
            { headers: svc.headers },
        )
        if (!res.ok) {
            console.error('[entitlement] user_entitlements read failed', res.status)
            return null
        }
        const rows = (await res.json()) as EntitlementRow[]
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    } catch (err) {
        console.error('[entitlement] user_entitlements read error', err instanceof Error ? err.message : err)
        return null
    }
}

// Upserts userId's mirror row (idempotent merge on user_id); false on any failure.
// updated_at is sent explicitly on every write, not left to the column default: the
// `DEFAULT now()` in user_entitlements.sql only fires on INSERT and that migration adds no
// touch trigger, so on the ON CONFLICT UPDATE half of this upsert an omitted updated_at
// would keep the row's original timestamp. rowIsFresh would then read every refreshed row
// as stale forever — a permanent RevenueCat round trip on every paid request.
async function writeEntitlementRow(userId: string, rc: RevenueCatEntitlement): Promise<boolean> {
    const svc = serviceRole()
    if (!svc) return false
    try {
        const res = await fetchWithTimeout(`${svc.url}/rest/v1/user_entitlements?on_conflict=user_id`, {
            method: 'POST',
            headers: { ...svc.headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({
                user_id: userId,
                entitlement_expires_at: rc.expiresAt,
                has_lifetime: rc.hasLifetime,
                updated_at: new Date().toISOString(),
            }),
        })
        if (!res.ok) {
            console.error('[entitlement] user_entitlements upsert failed', res.status)
            return false
        }
        return true
    } catch (err) {
        console.error('[entitlement] user_entitlements upsert error', err instanceof Error ? err.message : err)
        return false
    }
}

// Looks up userId's subscriber record at RevenueCat; null on a missing secret key, a
// non-200 response, a timeout/abort, or any other network/parse error — callers treat
// null as "cannot prove premium" (fail closed).
async function fetchRevenueCatEntitlement(userId: string): Promise<RevenueCatEntitlement | null> {
    const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY')
    if (!secretKey) {
        console.error('[entitlement] REVENUECAT_SECRET_API_KEY not configured; failing closed')
        return null
    }

    try {
        const res = await fetchWithTimeout(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(userId)}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
        })

        if (!res.ok) {
            console.error('[entitlement] RevenueCat subscriber lookup failed', res.status)
            return null
        }

        const data = (await res.json()) as RevenueCatSubscriberResponse
        const entitlement = data.subscriber?.entitlements?.[ENTITLEMENT_ID]
        if (!entitlement) return { premium: false, expiresAt: null, hasLifetime: false }

        // No expires_date means a non-expiring (e.g. lifetime/non-subscription) entitlement.
        if (!entitlement.expires_date) return { premium: true, expiresAt: null, hasLifetime: true }
        return {
            premium: new Date(entitlement.expires_date).getTime() > Date.now(),
            expiresAt: entitlement.expires_date,
            hasLifetime: false,
        }
    } catch (err) {
        console.error('[entitlement] RevenueCat subscriber lookup error', err instanceof Error ? err.message : err)
        return null
    }
}

// Re-fetches userId's entitlement from RevenueCat and mirrors it into user_entitlements.
// Called on every webhook event and on every fallback here — re-fetching the subscriber
// instead of interpreting event types keeps the mirror idempotent under RevenueCat's
// at-least-once delivery. null = the RevenueCat lookup itself failed; `stored` = whether
// the mirror write landed. `stored` is reporting only, never a retry trigger: neither
// caller retries. hasPremiumEntitlement below answers from `premium` even when the write
// failed, and revenuecatWebhook/handler.ts only counts it into a console.error and still
// answers 200 (it is best-effort by design — RevenueCat drops an event after 5 failed
// deliveries). An unwritten row just stays stale, which the freshness cap already handles.
export async function refreshEntitlementFromRevenueCat(userId: string): Promise<{ premium: boolean; stored: boolean } | null> {
    const rc = await fetchRevenueCatEntitlement(userId)
    if (rc === null) return null
    const stored = await writeEntitlementRow(userId, rc)
    return { premium: rc.premium, stored }
}

// Reports whether userId holds the LiftTrition Pro entitlement: mirror row first (no
// RevenueCat dependency on the hot path), RevenueCat REST fallback + mirror refresh when
// the row is missing, expired, non-premium or stale. Fails closed (false) on every error
// path — an outage or misconfiguration must never reopen the free-access-to-paid-features
// hole this closes. Errors are console.error'd so a spike in false negatives is observable
// in Edge Function logs rather than silently degrading every caller.
export async function hasPremiumEntitlement(userId: string): Promise<boolean> {
    const row = await readEntitlementRow(userId)
    if (row && rowGrantsPremium(row) && rowIsFresh(row)) {
        console.log('[entitlement] premium via user_entitlements mirror')
        return true
    }

    // The mirror cannot prove premium — ask RevenueCat and refresh the mirror on the way
    const rc = await refreshEntitlementFromRevenueCat(userId)
    if (rc === null) return false
    console.log('[entitlement] resolved via RevenueCat fallback:', rc.premium)
    return rc.premium
}
