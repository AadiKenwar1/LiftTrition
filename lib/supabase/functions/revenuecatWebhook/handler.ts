// RevenueCat webhook receiver: on every subscription event, re-fetch each affected
// subscriber from RevenueCat's REST API and mirror the entitlement into
// public.user_entitlements (via refreshEntitlementFromRevenueCat in ../_shared/entitlement.ts).
// Re-fetching instead of interpreting event types keeps the handler idempotent, which is
// what RevenueCat's at-least-once delivery (duplicates, retries) requires — no event-id
// dedup table needed. Auth is the dashboard-configured Authorization header, compared
// verbatim against the REVENUECAT_WEBHOOK_AUTH secret.
//
// Delivery is best-effort: once a request is authenticated and parsed it always gets a
// 200, even when a refresh fails. RevenueCat retries a failed delivery only 5 times
// (5/10/20/40/80 min) and then drops the event permanently, so a non-200 buys a bounded
// retry window at most — and some failures (a transferred_from user whose auth.users row
// is deleted) can never succeed. The real recovery path is the 24h freshness cap in
// _shared/entitlement.ts: any missed write goes stale within a day and the next paid call
// re-verifies against RevenueCat directly. Failures are logged, not retried.
//
// All logic lives here (not index.ts) so handler.test.ts can import it without starting
// a server.
import { refreshEntitlementFromRevenueCat } from '../_shared/entitlement.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Bounds per-delivery work: every id costs a RevenueCat lookup plus a PostgREST upsert and
// they all run at once, so an unbounded alias list would mean an unbounded number of
// concurrent round trips in one request.
const MAX_IDS_PER_EVENT = 10

// The identity-bearing fields of a RevenueCat webhook event; TRANSFER events carry the
// two customers involved in transferred_from/transferred_to.
interface RevenueCatWebhookEvent {
    app_user_id?: string
    original_app_user_id?: string
    aliases?: string[]
    transferred_from?: string[]
    transferred_to?: string[]
}

// JSON response helper.
function json(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// Collects the Supabase-UUID-shaped customer ids an event may affect, deduped and capped.
// Anonymous ids ($RCAnonymousID:...) are dropped — they cannot map to a user row, and
// after aliasing the same customer is reachable through the UUID alias anyway.
export function collectUuidIds(event: RevenueCatWebhookEvent): string[] {
    const candidates = [
        event.app_user_id,
        event.original_app_user_id,
        ...(event.aliases ?? []),
        ...(event.transferred_from ?? []),
        ...(event.transferred_to ?? []),
    ]
    const unique: string[] = []
    for (const id of candidates) {
        if (typeof id === 'string' && UUID_RE.test(id) && !unique.includes(id)) unique.push(id)
    }
    return unique.slice(0, MAX_IDS_PER_EVENT)
}

// Handles one webhook delivery: authenticate, collect affected UUID ids, refresh every
// mirror row concurrently (RevenueCat disconnects deliveries at 60s; serial refreshes of
// up to MAX_IDS_PER_EVENT ids could exceed that), then report 200 regardless of refresh
// outcomes — see the best-effort note in the header.
export async function handleWebhook(req: Request): Promise<Response> {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH')
    if (!expected) {
        console.error('[revenuecatWebhook] REVENUECAT_WEBHOOK_AUTH not configured')
        return json({ error: 'not_configured' }, 500)
    }
    if (req.headers.get('Authorization') !== expected) return json({ error: 'unauthorized' }, 401)

    let body: { event?: RevenueCatWebhookEvent }
    try {
        body = await req.json()
    } catch {
        return json({ error: 'invalid_json' }, 400)
    }
    const event = body?.event
    if (!event || typeof event !== 'object') return json({ error: 'missing_event' }, 400)

    const ids = collectUuidIds(event)
    if (ids.length === 0) return json({ skipped: 'no uuid app user ids' }, 200)

    const results = await Promise.all(ids.map((id) => refreshEntitlementFromRevenueCat(id)))
    const failed = results.filter((result) => result === null || !result.stored).length
    if (failed > 0) console.error(`[revenuecatWebhook] ${failed}/${ids.length} refreshes failed (not retried; freshness cap recovers)`)
    return json({ updated: ids.length - failed, failed }, 200)
}
