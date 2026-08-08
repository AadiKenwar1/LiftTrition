// Deno unit tests for the shared server-side RevenueCat entitlement check (audit H1).
// Run with: deno test --allow-env lib/supabase/functions/_shared/entitlement.test.ts
// (outside the jest-expo/tsc gate — these Edge Functions run on Deno, not Node.)
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { ENTITLEMENT_ID, hasPremiumEntitlement, refreshEntitlementFromRevenueCat } from './entitlement.ts'

const TEST_USER_ID = 'test-user-id'
const originalFetch = globalThis.fetch

// Every test pins all three env vars so a value inherited from the shell can't leak in.
// RC-only: no Supabase env, so the mirror is skipped and RevenueCat is the only path.
function envRcOnly(): void {
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    Deno.env.delete('SUPABASE_URL')
    Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY')
}

// Full env: mirror reads/writes and the RevenueCat fallback are both available.
function envFull(): void {
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    Deno.env.set('SUPABASE_URL', 'https://test-project.supabase.co')
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test')
}

// Swaps global fetch for a stub for the duration of one test, always restoring it after —
// even if the test throws — so stubs never leak between tests.
async function withStubbedFetch(stub: typeof fetch, run: () => Promise<void>): Promise<void> {
    globalThis.fetch = stub
    try {
        await run()
    } finally {
        globalThis.fetch = originalFetch
    }
}

// Builds a stub 200 response carrying the given entitlements map, mirroring RevenueCat's
// GET /v1/subscribers/{id} shape.
function subscriberResponse(entitlements: Record<string, { expires_date?: string | null }>): Response {
    return new Response(JSON.stringify({ subscriber: { entitlements } }), { status: 200 })
}

// Builds a stub 200 PostgREST response carrying the given user_entitlements rows.
// updated_at defaults to fresh (now): rows older than the 24h freshness cap are re-verified
// against RevenueCat, so tests exercising the trusted-row path get freshness implicitly and
// the stale-path tests override updated_at explicitly.
function tableResponse(rows: { entitlement_expires_at: string | null; has_lifetime: boolean; updated_at?: string | null }[]): Response {
    return new Response(JSON.stringify(rows.map((row) => ({ updated_at: new Date().toISOString(), ...row }))), { status: 200 })
}

// Dispatches stubbed fetches by URL: the user_entitlements mirror (GET read / POST
// upsert) vs the RevenueCat REST API. Routes left undefined throw, so a test that
// asserts "never calls X" just omits that route.
function routedFetch(routes: {
    tableGet?: () => Response | Promise<Response>
    tableUpsert?: (body: string) => Response | Promise<Response>
    revenuecat?: () => Response | Promise<Response>
}): typeof fetch {
    return ((input: Request | URL | string, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input)
        if (url.includes('/rest/v1/user_entitlements')) {
            const method = (input instanceof Request ? input.method : init?.method) ?? 'GET'
            if (method === 'POST') {
                if (!routes.tableUpsert) throw new Error('unexpected user_entitlements upsert')
                return Promise.resolve(routes.tableUpsert(String(init?.body ?? '')))
            }
            if (!routes.tableGet) throw new Error('unexpected user_entitlements read')
            return Promise.resolve(routes.tableGet())
        }
        if (url.includes('api.revenuecat.com')) {
            if (!routes.revenuecat) throw new Error('unexpected RevenueCat call')
            return Promise.resolve(routes.revenuecat())
        }
        throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch
}

const FUTURE = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
const PAST = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
// An updated_at older than the 24h mirror freshness cap.
const STALE_AT = () => new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()

// --- Mirror-table hot path ---

Deno.test('hasPremiumEntitlement: fresh mirror row with future expiry resolves true without calling RevenueCat', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({ tableGet: () => tableResponse([{ entitlement_expires_at: FUTURE(), has_lifetime: false }]) }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

Deno.test('hasPremiumEntitlement: fresh lifetime mirror row resolves true without calling RevenueCat', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({ tableGet: () => tableResponse([{ entitlement_expires_at: null, has_lifetime: true }]) }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

Deno.test('hasPremiumEntitlement: lifetime mirror row needs no RevenueCat secret key', async () => {
    envFull()
    Deno.env.delete('REVENUECAT_SECRET_API_KEY')
    await withStubbedFetch(
        routedFetch({ tableGet: () => tableResponse([{ entitlement_expires_at: null, has_lifetime: true }]) }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

// --- Freshness cap: premium mirror rows older than 24h are re-verified, never trusted ---
// This is what bounds a lost webhook event (RevenueCat stops retrying after 5 attempts and
// drops it): a row that stopped receiving webhook writes goes stale within a day and the
// next paid call re-checks RevenueCat directly.

Deno.test('hasPremiumEntitlement: stale premium row is re-verified against RevenueCat and the row rewritten', async () => {
    envFull()
    let upsertBody = ''
    await withStubbedFetch(
        routedFetch({
            tableGet: () => tableResponse([{ entitlement_expires_at: FUTURE(), has_lifetime: false, updated_at: STALE_AT() }]),
            tableUpsert: (body) => {
                upsertBody = body
                return new Response(null, { status: 201 })
            },
            revenuecat: () => subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: FUTURE() } }),
        }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
    assertEquals(JSON.parse(upsertBody).user_id, TEST_USER_ID)
})

Deno.test('hasPremiumEntitlement: stale premium row + expired at RevenueCat resolves false (a lost refund event heals here)', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({
            tableGet: () => tableResponse([{ entitlement_expires_at: FUTURE(), has_lifetime: false, updated_at: STALE_AT() }]),
            tableUpsert: () => new Response(null, { status: 201 }),
            revenuecat: () => subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: PAST() } }),
        }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: stale premium row + RevenueCat error resolves false (fail closed)', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({
            tableGet: () => tableResponse([{ entitlement_expires_at: FUTURE(), has_lifetime: false, updated_at: STALE_AT() }]),
            revenuecat: () => Promise.reject(new TypeError('network error')),
        }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

// An updated_at that cannot be read as a timestamp proves nothing about the row's age, so
// it must land on the verify side of the cap rather than the trust side.
for (const updatedAt of [null, 'not-a-timestamp']) {
    Deno.test(`hasPremiumEntitlement: updated_at ${JSON.stringify(updatedAt)} is treated as stale and re-verified`, async () => {
        envFull()
        let rcCalls = 0
        await withStubbedFetch(
            routedFetch({
                tableGet: () => tableResponse([{ entitlement_expires_at: FUTURE(), has_lifetime: false, updated_at: updatedAt }]),
                tableUpsert: () => new Response(null, { status: 201 }),
                revenuecat: () => {
                    rcCalls++
                    return subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: FUTURE() } })
                },
            }),
            async () => {
                assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
            },
        )
        assertEquals(rcCalls, 1)
    })
}

// The write-back is what un-stales a row, and only because it sends updated_at itself:
// user_entitlements.sql's DEFAULT now() fires on INSERT only and there is no touch trigger,
// so an upsert that omitted the column would leave the conflicting row's old timestamp and
// every later request would re-verify against RevenueCat forever.
Deno.test('hasPremiumEntitlement: the write-back stamps a fresh updated_at, so the refreshed row reads fresh next time', async () => {
    envFull()
    let upsertBody = ''
    const before = Date.now()
    await withStubbedFetch(
        routedFetch({
            tableGet: () => tableResponse([{ entitlement_expires_at: FUTURE(), has_lifetime: false, updated_at: STALE_AT() }]),
            tableUpsert: (body) => {
                upsertBody = body
                return new Response(null, { status: 201 })
            },
            revenuecat: () => subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: FUTURE() } }),
        }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
    const written = new Date(JSON.parse(upsertBody).updated_at as string).getTime()
    assertEquals(Number.isNaN(written), false)
    assertEquals(written >= before && written <= Date.now(), true)
})

// --- Fallback + self-heal ---

Deno.test('hasPremiumEntitlement: expired mirror row falls back to an active RevenueCat sub and writes the row back', async () => {
    envFull()
    let upsertBody = ''
    await withStubbedFetch(
        routedFetch({
            tableGet: () => tableResponse([{ entitlement_expires_at: PAST(), has_lifetime: false }]),
            tableUpsert: (body) => {
                upsertBody = body
                return new Response(null, { status: 201 })
            },
            revenuecat: () => subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: FUTURE() } }),
        }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
    assertEquals(JSON.parse(upsertBody).user_id, TEST_USER_ID)
    assertEquals(JSON.parse(upsertBody).has_lifetime, false)
})

Deno.test('hasPremiumEntitlement: missing mirror row + no RevenueCat entitlement resolves false and mirrors the negative', async () => {
    envFull()
    let upserted = false
    await withStubbedFetch(
        routedFetch({
            tableGet: () => tableResponse([]),
            tableUpsert: () => {
                upserted = true
                return new Response(null, { status: 201 })
            },
            revenuecat: () => subscriberResponse({}),
        }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
    assertEquals(upserted, true)
})

Deno.test('hasPremiumEntitlement: mirror read error + active RevenueCat sub still resolves true', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({
            tableGet: () => new Response('boom', { status: 500 }),
            tableUpsert: () => new Response(null, { status: 201 }),
            revenuecat: () => subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: FUTURE() } }),
        }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

Deno.test('hasPremiumEntitlement: mirror read error + RevenueCat error resolves false (fail closed end to end)', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({
            tableGet: () => new Response('boom', { status: 500 }),
            revenuecat: () => Promise.reject(new TypeError('network error')),
        }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: missing service-role env skips the mirror and uses RevenueCat directly', async () => {
    envRcOnly()
    await withStubbedFetch(
        // No table routes: any mirror call would throw
        routedFetch({ revenuecat: () => subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: FUTURE() } }) }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

Deno.test('hasPremiumEntitlement: a failed write-back does not change the result', async () => {
    envFull()
    await withStubbedFetch(
        routedFetch({
            tableGet: () => tableResponse([]),
            tableUpsert: () => new Response('boom', { status: 500 }),
            revenuecat: () => subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: FUTURE() } }),
        }),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

Deno.test('refreshEntitlementFromRevenueCat: maps a null expires_date to a lifetime mirror row', async () => {
    envFull()
    let upsertBody = ''
    await withStubbedFetch(
        routedFetch({
            tableUpsert: (body) => {
                upsertBody = body
                return new Response(null, { status: 201 })
            },
            revenuecat: () => subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: null } }),
        }),
        async () => {
            assertEquals(await refreshEntitlementFromRevenueCat(TEST_USER_ID), { premium: true, stored: true })
        },
    )
    assertEquals(JSON.parse(upsertBody).has_lifetime, true)
    assertEquals(JSON.parse(upsertBody).entitlement_expires_at, null)
})

// --- RevenueCat fallback failure matrix (the pre-mirror guarantees, unchanged) ---

Deno.test('hasPremiumEntitlement: active, unexpired entitlement resolves true', async () => {
    envRcOnly()
    await withStubbedFetch(
        () => Promise.resolve(subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: FUTURE() } })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

Deno.test('hasPremiumEntitlement: non-expiring (null expires_date) entitlement resolves true', async () => {
    envRcOnly()
    await withStubbedFetch(
        () => Promise.resolve(subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: null } })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

Deno.test('hasPremiumEntitlement: expired entitlement resolves false (fail closed)', async () => {
    envRcOnly()
    await withStubbedFetch(
        () => Promise.resolve(subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: PAST() } })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: missing entitlement resolves false (fail closed)', async () => {
    envRcOnly()
    await withStubbedFetch(
        () => Promise.resolve(subscriberResponse({ 'some other entitlement': { expires_date: null } })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: non-200 response from RevenueCat resolves false (fail closed)', async () => {
    envRcOnly()
    await withStubbedFetch(
        () => Promise.resolve(new Response(JSON.stringify({ message: 'not found' }), { status: 404 })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: network error resolves false (fail closed)', async () => {
    envRcOnly()
    await withStubbedFetch(
        () => Promise.reject(new TypeError('network error')),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: abort/timeout resolves false (fail closed)', async () => {
    envRcOnly()
    await withStubbedFetch(
        () => Promise.reject(new DOMException('The operation was aborted', 'AbortError')),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: missing secret key resolves false (fail closed) without calling fetch', async () => {
    envRcOnly()
    Deno.env.delete('REVENUECAT_SECRET_API_KEY')
    await withStubbedFetch(
        () => {
            throw new Error('fetch should not be called when the secret key is missing')
        },
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
})
