// Deno unit tests for the RevenueCat webhook handler.
// Run with: deno test --allow-env lib/supabase/functions/revenuecatWebhook/handler.test.ts
// (outside the jest-expo/tsc gate — these Edge Functions run on Deno, not Node.)
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { collectUuidIds, handleWebhook } from './handler.ts'

const AUTH = 'test-webhook-auth'
const UUID_1 = '11111111-2222-3333-4444-555555555555'
const UUID_2 = '99999999-8888-7777-6666-555555555555'
const ANON = '$RCAnonymousID:9449cabc'
const originalFetch = globalThis.fetch

// Full env for the happy paths; individual tests delete keys to pin misconfig behavior.
function envFull(): void {
    Deno.env.set('REVENUECAT_WEBHOOK_AUTH', AUTH)
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    Deno.env.set('SUPABASE_URL', 'https://test-project.supabase.co')
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test')
}

// Swaps global fetch for a stub for one test, always restoring it after.
async function withStubbedFetch(stub: typeof fetch, run: () => Promise<void>): Promise<void> {
    globalThis.fetch = stub
    try {
        await run()
    } finally {
        globalThis.fetch = originalFetch
    }
}

// Routes stubbed fetches: RevenueCat subscriber lookups vs the user_entitlements upsert.
// tableUpsert receives the request body so per-user outcomes (e.g. a deleted user's FK
// violation next to a surviving user's success) can be simulated in one delivery.
function routedFetch(routes: {
    revenuecat?: () => Response | Promise<Response>
    tableUpsert?: (body: string) => Response | Promise<Response>
}): typeof fetch {
    return ((input: Request | URL | string, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input)
        if (url.includes('api.revenuecat.com')) {
            if (!routes.revenuecat) throw new Error('unexpected RevenueCat call')
            return Promise.resolve(routes.revenuecat())
        }
        if (url.includes('/rest/v1/user_entitlements')) {
            const method = (input instanceof Request ? input.method : init?.method) ?? 'GET'
            if (method !== 'POST' || !routes.tableUpsert) throw new Error(`unexpected table call: ${method}`)
            return Promise.resolve(routes.tableUpsert(String(init?.body ?? '')))
        }
        throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch
}

// Builds a webhook delivery Request for the given event payload.
function webhookRequest(event: unknown, options?: { method?: string; auth?: string | null; rawBody?: string }): Request {
    const headers = new Headers()
    if (options?.auth !== null) headers.set('Authorization', options?.auth ?? AUTH)
    return new Request('http://localhost/revenuecatWebhook', {
        method: options?.method ?? 'POST',
        headers,
        body: options?.rawBody ?? JSON.stringify({ event }),
    })
}

// A RevenueCat subscriber response with one active entitlement.
function activeSubscriber(): Response {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    return new Response(JSON.stringify({ subscriber: { entitlements: { 'LiftTrition Pro': { expires_date: future } } } }), { status: 200 })
}

Deno.test('handleWebhook: rejects non-POST with 405', async () => {
    envFull()
    const res = await handleWebhook(new Request('http://localhost/revenuecatWebhook', { method: 'GET' }))
    assertEquals(res.status, 405)
})

Deno.test('handleWebhook: 500 when the webhook auth secret is not configured', async () => {
    envFull()
    Deno.env.delete('REVENUECAT_WEBHOOK_AUTH')
    const res = await handleWebhook(webhookRequest({ app_user_id: UUID_1 }))
    assertEquals(res.status, 500)
})

Deno.test('handleWebhook: 401 when the Authorization header is missing', async () => {
    envFull()
    const res = await handleWebhook(webhookRequest({ app_user_id: UUID_1 }, { auth: null }))
    assertEquals(res.status, 401)
})

Deno.test('handleWebhook: 401 when the Authorization header is wrong', async () => {
    envFull()
    const res = await handleWebhook(webhookRequest({ app_user_id: UUID_1 }, { auth: 'wrong' }))
    assertEquals(res.status, 401)
})

Deno.test('handleWebhook: 400 on malformed JSON', async () => {
    envFull()
    const res = await handleWebhook(webhookRequest(undefined, { rawBody: 'not json{' }))
    assertEquals(res.status, 400)
})

Deno.test('handleWebhook: 400 when the body carries no event', async () => {
    envFull()
    const res = await handleWebhook(webhookRequest(undefined, { rawBody: JSON.stringify({}) }))
    assertEquals(res.status, 400)
})

Deno.test('handleWebhook: 200 skip when the event names only anonymous customers', async () => {
    envFull()
    // No fetch routes: any RevenueCat/table call would throw
    await withStubbedFetch(routedFetch({}), async () => {
        const res = await handleWebhook(webhookRequest({ app_user_id: ANON, original_app_user_id: ANON }))
        assertEquals(res.status, 200)
        assertEquals((await res.json()).skipped, 'no uuid app user ids')
    })
})

Deno.test('handleWebhook: refreshes the mirror for a UUID customer and reports 200', async () => {
    envFull()
    let upserts = 0
    await withStubbedFetch(
        routedFetch({
            revenuecat: () => activeSubscriber(),
            tableUpsert: () => {
                upserts++
                return new Response(null, { status: 201 })
            },
        }),
        async () => {
            const res = await handleWebhook(webhookRequest({ app_user_id: UUID_1 }))
            assertEquals(res.status, 200)
            assertEquals((await res.json()).updated, 1)
        },
    )
    assertEquals(upserts, 1)
})

Deno.test('handleWebhook: 200 with the failure counted when the RevenueCat lookup fails (best-effort, no retry requested)', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({ revenuecat: () => Promise.reject(new TypeError('network error')) }),
        async () => {
            const res = await handleWebhook(webhookRequest({ app_user_id: UUID_1 }))
            assertEquals(res.status, 200)
            const body = await res.json()
            assertEquals(body.updated, 0)
            assertEquals(body.failed, 1)
        },
    )
})

Deno.test('handleWebhook: 200 with the failure counted when the mirror upsert fails', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({
            revenuecat: () => activeSubscriber(),
            tableUpsert: () => new Response('boom', { status: 500 }),
        }),
        async () => {
            const res = await handleWebhook(webhookRequest({ app_user_id: UUID_1 }))
            assertEquals(res.status, 200)
            const body = await res.json()
            assertEquals(body.updated, 0)
            assertEquals(body.failed, 1)
        },
    )
})

Deno.test('handleWebhook: a transfer from a deleted account still lands the surviving user and reports 200', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({
            revenuecat: () => activeSubscriber(),
            // The deleted account's upsert hits the auth.users FK (409/23503) forever; the
            // surviving account's write must not be held hostage by it.
            tableUpsert: (body) =>
                JSON.parse(body).user_id === UUID_1 ? new Response('{"code":"23503"}', { status: 409 }) : new Response(null, { status: 201 }),
        }),
        async () => {
            const res = await handleWebhook(webhookRequest({ transferred_from: [UUID_1], transferred_to: [UUID_2] }))
            assertEquals(res.status, 200)
            const body = await res.json()
            assertEquals(body.updated, 1)
            assertEquals(body.failed, 1)
        },
    )
})

Deno.test('handleWebhook: refreshes for a multi-id event run concurrently, not serially', async () => {
    envFull()
    let firstResolved = false
    let sawConcurrent = false
    let rcCalls = 0
    await withStubbedFetch(
        routedFetch({
            revenuecat: () => {
                rcCalls++
                // Hold the first lookup open; a serial loop cannot start the second until it
                // resolves, so observing the second start while the first is pending proves
                // the refreshes overlap (RevenueCat disconnects deliveries at 60s).
                if (rcCalls === 1) {
                    return new Promise<Response>((resolve) =>
                        setTimeout(() => {
                            firstResolved = true
                            resolve(activeSubscriber())
                        }, 50),
                    )
                }
                if (!firstResolved) sawConcurrent = true
                return Promise.resolve(activeSubscriber())
            },
            tableUpsert: () => new Response(null, { status: 201 }),
        }),
        async () => {
            const res = await handleWebhook(webhookRequest({ transferred_from: [UUID_1], transferred_to: [UUID_2] }))
            assertEquals(res.status, 200)
            assertEquals((await res.json()).updated, 2)
        },
    )
    assertEquals(sawConcurrent, true)
})

Deno.test('collectUuidIds: gathers from aliases and transfer arrays, drops anonymous ids, dedupes', () => {
    const ids = collectUuidIds({
        app_user_id: ANON,
        original_app_user_id: UUID_1,
        aliases: [ANON, UUID_1, UUID_2],
        transferred_from: [UUID_2],
        transferred_to: [UUID_1],
    })
    assertEquals(ids, [UUID_1, UUID_2])
})

Deno.test('collectUuidIds: caps the id list per delivery', () => {
    const aliases = Array.from({ length: 20 }, (_, i) => `${String(i).padStart(8, '0')}-1111-2222-3333-444444444444`)
    const ids = collectUuidIds({ aliases })
    assertEquals(ids.length, 10)
})
