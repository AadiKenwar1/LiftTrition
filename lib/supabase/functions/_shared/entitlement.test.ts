// Deno unit tests for the shared server-side RevenueCat entitlement check (audit H1).
// Run with: deno test --allow-env lib/supabase/functions/_shared/entitlement.test.ts
// (outside the jest-expo/tsc gate — these Edge Functions run on Deno, not Node.)
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { ENTITLEMENT_ID, hasPremiumEntitlement } from './entitlement.ts'

const TEST_USER_ID = 'test-user-id'
const originalFetch = globalThis.fetch

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

Deno.test('hasPremiumEntitlement: active, unexpired entitlement resolves true', async () => {
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await withStubbedFetch(
        () => Promise.resolve(subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: future } })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

Deno.test('hasPremiumEntitlement: non-expiring (null expires_date) entitlement resolves true', async () => {
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    await withStubbedFetch(
        () => Promise.resolve(subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: null } })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), true)
        },
    )
})

Deno.test('hasPremiumEntitlement: expired entitlement resolves false (fail closed)', async () => {
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await withStubbedFetch(
        () => Promise.resolve(subscriberResponse({ [ENTITLEMENT_ID]: { expires_date: past } })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: missing entitlement resolves false (fail closed)', async () => {
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    await withStubbedFetch(
        () => Promise.resolve(subscriberResponse({ 'some other entitlement': { expires_date: null } })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: non-200 response from RevenueCat resolves false (fail closed)', async () => {
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    await withStubbedFetch(
        () => Promise.resolve(new Response(JSON.stringify({ message: 'not found' }), { status: 404 })),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: network error resolves false (fail closed)', async () => {
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    await withStubbedFetch(
        () => Promise.reject(new TypeError('network error')),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: abort/timeout resolves false (fail closed)', async () => {
    Deno.env.set('REVENUECAT_SECRET_API_KEY', 'test-secret')
    await withStubbedFetch(
        () => Promise.reject(new DOMException('The operation was aborted', 'AbortError')),
        async () => {
            assertEquals(await hasPremiumEntitlement(TEST_USER_ID), false)
        },
    )
})

Deno.test('hasPremiumEntitlement: missing secret key resolves false (fail closed) without calling fetch', async () => {
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
