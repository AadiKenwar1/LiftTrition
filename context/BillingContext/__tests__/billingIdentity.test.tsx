// react-test-renderer ships no bundled types (@types/react-test-renderer not
// installed); suppress the missing-declaration error (test-only runtime dep).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases'
import { ENV } from '@/lib/env'
import { BillingProvider, useBilling } from '../index'
import { ENTITLEMENT_ID } from '../functions/billingFunctions'
import { resetSdkIdentityForTests } from '../functions/sdkIdentity'
import { BillingContextInterface } from '../types'

/**
 * The SDK is configured with the signed-in user's id from the start — there is no
 * anonymous window on launch. The remaining race surface is the account switch, where
 * logIn(newUser) is a network call: these cases pin that nothing stale renders, nothing
 * is fetched early, and above all the store is unreachable until identity is proven
 * (a purchase filed against the wrong customer unlocks the client while every paid
 * server call fails closed — the user pays for nothing).
 */

// Reassigned per test, then read on each render by the mocked useAuth below. The `mock`
// prefix is required — jest.mock factories are hoisted above every other declaration.
let mockAuthState: { user: { id: string } | null; loading: boolean } = { user: { id: 'user-1' }, loading: false }

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => mockAuthState,
}))

// Static fake keys so the provider's configure path runs under Jest (no .env is loaded);
// individual cases mutate the imported ENV object and beforeEach restores it.
jest.mock('@/lib/env', () => ({
    ENV: {
        REVENUECAT_API_KEY_IOS: 'test-key-ios',
        REVENUECAT_API_KEY_ANDROID: 'test-key-android',
    },
}))

jest.mock('react-native-purchases', () => ({
    __esModule: true,
    default: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
        enableAdServicesAttributionTokenCollection: jest.fn().mockResolvedValue(undefined),
        logIn: jest.fn(),
        logOut: jest.fn(),
        getAppUserID: jest.fn(),
        getOfferings: jest.fn(),
        getCustomerInfo: jest.fn(),
        purchasePackage: jest.fn(),
        restorePurchases: jest.fn(),
        addCustomerInfoUpdateListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
        removeCustomerInfoUpdateListener: jest.fn(),
    },
    LOG_LEVEL: { VERBOSE: 'VERBOSE', ERROR: 'ERROR' },
}))

const mockConfigure = Purchases.configure as jest.Mock
const mockEnableAttribution = Purchases.enableAdServicesAttributionTokenCollection as jest.Mock
const mockLogIn = Purchases.logIn as jest.Mock
const mockLogOut = Purchases.logOut as jest.Mock
const mockGetAppUserID = Purchases.getAppUserID as jest.Mock
const mockGetOfferings = Purchases.getOfferings as jest.Mock
const mockGetCustomerInfo = Purchases.getCustomerInfo as jest.Mock
const mockPurchase = Purchases.purchasePackage as jest.Mock
const mockRestore = Purchases.restorePurchases as jest.Mock

const PREMIUM_INFO = { entitlements: { active: { [ENTITLEMENT_ID]: { isActive: true } } } } as unknown as CustomerInfo
const A_PACKAGE = { identifier: 'annual' } as unknown as PurchasesPackage

// A promise whose settlement this test controls — the only way to hold the provider
// inside the switch-identity window long enough to assert on it.
function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

let latest: BillingContextInterface

function Probe() {
    latest = useBilling()
    return null
}

type Root = { update: (element: React.ReactElement) => void; unmount: () => void }

// Mounts the provider and returns the root so a test can re-render it after moving mockAuthState
async function mountProbe(): Promise<Root> {
    let root: Root
    await act(async () => {
        root = create(
            <BillingProvider>
                <Probe />
            </BillingProvider>,
        )
    })
    return root!
}

// Re-renders the same tree so the user?.id change re-runs the identity effect
async function rerender(root: Root) {
    await act(async () => {
        root.update(
            <BillingProvider>
                <Probe />
            </BillingProvider>,
        )
    })
}

// Moves auth to the given user (or signed-out) and re-renders
async function switchAuth(root: Root, user: { id: string } | null) {
    mockAuthState = { user, loading: false }
    await rerender(root)
}

describe('BillingProvider identity', () => {
    let mounted: Root | null = null

    beforeEach(() => {
        jest.clearAllMocks()
        resetSdkIdentityForTests()
        mockAuthState = { user: { id: 'user-1' }, loading: false }
        ;(ENV as { REVENUECAT_API_KEY_IOS?: string }).REVENUECAT_API_KEY_IOS = 'test-key-ios'
        mockLogIn.mockResolvedValue(undefined)
        mockLogOut.mockResolvedValue(undefined)
        // What the native SDK would report after configure({ appUserID: 'user-1' })
        mockGetAppUserID.mockResolvedValue('user-1')
        mockGetOfferings.mockResolvedValue(null)
        mockGetCustomerInfo.mockResolvedValue(null)
    })

    // Unmounting clears the 15s init timeout the effect leaves pending in the deferred cases
    afterEach(async () => {
        if (mounted) {
            await act(async () => {
                mounted!.unmount()
            })
            mounted = null
        }
    })

    it('configures RevenueCat with the authenticated user and never logs in on first launch', async () => {
        mounted = await mountProbe()

        // The anonymous window cannot exist: the SDK learns the identity at configure time
        expect(mockConfigure).toHaveBeenCalledWith({ apiKey: 'test-key-ios', appUserID: 'user-1' })
        expect(mockLogIn).not.toHaveBeenCalled()
        // Apple Search Ads attribution is enabled once, in the same configure pass
        expect(mockEnableAttribution).toHaveBeenCalled()
        expect(latest.loaded).toBe(true)
    })

    it('does not report loaded while a switch identity call is in flight', async () => {
        mounted = await mountProbe()
        const login = deferred<void>()
        mockLogIn.mockReturnValue(login.promise)

        await switchAuth(mounted, { id: 'user-2' })

        expect(latest.loaded).toBe(false)
        expect(latest.loading).toBe(true)
    })

    it('fetches no subscription state for the new user until the switch identity call resolves', async () => {
        mounted = await mountProbe()
        const offeringsCalls = mockGetOfferings.mock.calls.length
        const infoCalls = mockGetCustomerInfo.mock.calls.length
        const login = deferred<void>()
        mockLogIn.mockReturnValue(login.promise)

        await switchAuth(mounted, { id: 'user-2' })

        // Offerings and CustomerInfo fetched before logIn resolves would describe the
        // previous customer, not the one signing in.
        expect(mockGetOfferings).toHaveBeenCalledTimes(offeringsCalls)
        expect(mockGetCustomerInfo).toHaveBeenCalledTimes(infoCalls)
    })

    it('never reaches the store while the app user id is unresolved', async () => {
        mounted = await mountProbe()
        const login = deferred<void>()
        mockLogIn.mockReturnValue(login.promise)
        mockPurchase.mockResolvedValue({ customerInfo: PREMIUM_INFO })

        await switchAuth(mounted, { id: 'user-2' })

        // A purchase completed here is filed against the previous app user ID: the client
        // unlocks, the Edge Functions keep failing closed, and the user has paid for nothing.
        await act(async () => {
            await expect(latest.purchasePackage(A_PACKAGE)).rejects.toThrow()
        })
        expect(mockPurchase).not.toHaveBeenCalled()
    })

    it('grants no premium when a switch identification fails', async () => {
        mounted = await mountProbe()
        mockLogIn.mockRejectedValue(new Error('network'))
        mockGetCustomerInfo.mockResolvedValue(PREMIUM_INFO)

        await switchAuth(mounted, { id: 'user-2' })

        expect(latest.hasPremium).toBe(false)
    })

    it('surfaces a failed identification rather than continuing quietly', async () => {
        mounted = await mountProbe()
        mockLogIn.mockRejectedValue(new Error('network'))

        await switchAuth(mounted, { id: 'user-2' })

        expect(latest.error).toBeInstanceOf(Error)
        expect(latest.error?.message).toBe('network')
    })

    it('signs out of the store on sign-out and logs the next user in without reconfiguring', async () => {
        mounted = await mountProbe()

        await switchAuth(mounted, null)
        expect(mockLogOut).toHaveBeenCalledTimes(1)

        await switchAuth(mounted, { id: 'user-2' })
        expect(mockLogIn).toHaveBeenLastCalledWith('user-2')
        expect(mockConfigure).toHaveBeenCalledTimes(1)
    })

    it('clears the previous user’s subscription state on sign-out', async () => {
        mockGetCustomerInfo.mockResolvedValue(PREMIUM_INFO)

        mounted = await mountProbe()
        expect(latest.hasPremium).toBe(true)

        await switchAuth(mounted, null)

        expect(latest.customerInfo).toBeNull()
        expect(latest.hasPremium).toBe(false)
    })

    it('neither configures nor logs out when no user was ever identified', async () => {
        mockAuthState = { user: null, loading: false }

        mounted = await mountProbe()

        expect(mockConfigure).not.toHaveBeenCalled()
        expect(mockLogOut).not.toHaveBeenCalled()
        expect(mockLogIn).not.toHaveBeenCalled()
        expect(latest.loaded).toBe(true)
    })

    it('waits for auth before configuring anyone', async () => {
        mockAuthState = { user: null, loading: true }

        mounted = await mountProbe()

        expect(mockConfigure).not.toHaveBeenCalled()
        expect(mockLogIn).not.toHaveBeenCalled()
        expect(latest.loading).toBe(true)
    })

    it('ignores an identity call that resolves after the user has already changed', async () => {
        mounted = await mountProbe()
        const offeringsCalls = mockGetOfferings.mock.calls.length
        const infoCalls = mockGetCustomerInfo.mock.calls.length
        mockGetCustomerInfo.mockResolvedValue(PREMIUM_INFO)

        const staleLogin = deferred<void>()
        const freshLogin = deferred<void>()
        mockLogIn.mockReturnValueOnce(staleLogin.promise).mockReturnValueOnce(freshLogin.promise)

        await switchAuth(mounted, { id: 'user-2' })
        await switchAuth(mounted, { id: 'user-3' })

        // user-2's logIn lands late; its continuation must not fetch or publish anything,
        // or user-3 inherits user-2's entitlement.
        await act(async () => {
            staleLogin.resolve()
            await Promise.resolve()
        })

        expect(mockGetOfferings).toHaveBeenCalledTimes(offeringsCalls)
        expect(mockGetCustomerInfo).toHaveBeenCalledTimes(infoCalls)
        expect(latest.hasPremium).toBe(false)
    })

    it('reaches the store once identity is verified', async () => {
        // Positive control: a guard that rejects everything must fail this
        mounted = await mountProbe()
        mockPurchase.mockResolvedValue({ customerInfo: PREMIUM_INFO })

        await act(async () => {
            await latest.purchasePackage(A_PACKAGE)
        })

        expect(mockPurchase).toHaveBeenCalledWith(A_PACKAGE)
        expect(latest.hasPremium).toBe(true)
    })

    it('un-gates the app shell after the timeout while purchases stay blocked', async () => {
        jest.useFakeTimers()
        try {
            mounted = await mountProbe()
            const login = deferred<void>()
            mockLogIn.mockReturnValue(login.promise)
            mockPurchase.mockResolvedValue({ customerInfo: PREMIUM_INFO })

            await switchAuth(mounted, { id: 'user-2' })
            expect(latest.loaded).toBe(false)

            await act(async () => {
                jest.advanceTimersByTime(15_000)
            })

            // A RevenueCat outage opens the app; it must never open the store
            expect(latest.loaded).toBe(true)
            await act(async () => {
                await expect(latest.purchasePackage(A_PACKAGE)).rejects.toThrow()
            })
            expect(mockPurchase).not.toHaveBeenCalled()
        } finally {
            jest.useRealTimers()
        }
    })

    it('blocks restore identically while identity is unresolved and clears restoring after', async () => {
        mounted = await mountProbe()
        const login = deferred<void>()
        mockLogIn.mockReturnValue(login.promise)

        await switchAuth(mounted, { id: 'user-2' })

        await act(async () => {
            await expect(latest.restorePurchases()).rejects.toThrow()
        })
        expect(mockRestore).not.toHaveBeenCalled()
        expect(latest.restoring).toBe(false)
    })

    it('self-heals a failed identification with exactly one retry logIn at purchase time', async () => {
        mounted = await mountProbe()
        mockLogIn.mockRejectedValueOnce(new Error('network'))
        await switchAuth(mounted, { id: 'user-2' })

        // The retry logs the SDK in for real, so the second read reports the new user
        mockGetAppUserID.mockResolvedValueOnce('user-1').mockResolvedValueOnce('user-2')
        mockPurchase.mockResolvedValue({ customerInfo: PREMIUM_INFO })

        await act(async () => {
            await latest.purchasePackage(A_PACKAGE)
        })

        expect(mockLogIn).toHaveBeenCalledTimes(2)
        expect(mockLogIn).toHaveBeenLastCalledWith('user-2')
        expect(mockPurchase).toHaveBeenCalledWith(A_PACKAGE)
    })

    it('rejects with a typed error when the retry logIn also fails', async () => {
        mounted = await mountProbe()
        mockLogIn.mockRejectedValue(new Error('network'))
        await switchAuth(mounted, { id: 'user-2' })

        await act(async () => {
            await expect(latest.purchasePackage(A_PACKAGE)).rejects.toMatchObject({ reason: 'login-retry-failed' })
        })
        expect(mockPurchase).not.toHaveBeenCalled()
    })

    it('rejects when the retry logIn lands but the identity still differs', async () => {
        mounted = await mountProbe()
        mockLogIn.mockRejectedValueOnce(new Error('network'))
        await switchAuth(mounted, { id: 'user-2' })

        // Retry resolves but the SDK keeps reporting the old identity
        await act(async () => {
            await expect(latest.purchasePackage(A_PACKAGE)).rejects.toMatchObject({ reason: 'mismatch-after-retry' })
        })
        expect(mockPurchase).not.toHaveBeenCalled()
    })

    it('reports identityReady from first configure, pending during a switch, ready on resolve', async () => {
        mounted = await mountProbe()
        expect(latest.identityReady).toBe(true)

        const login = deferred<void>()
        mockLogIn.mockReturnValue(login.promise)
        await switchAuth(mounted, { id: 'user-2' })
        expect(latest.identityReady).toBe(false)

        await act(async () => {
            login.resolve()
            await Promise.resolve()
        })
        expect(latest.identityReady).toBe(true)
    })

    it('keeps identityReady false when a switch identification fails', async () => {
        mounted = await mountProbe()
        mockLogIn.mockRejectedValue(new Error('network'))

        await switchAuth(mounted, { id: 'user-2' })

        expect(latest.identityReady).toBe(false)
    })

    it('clears the previous user’s prices and subscription state the moment a switch begins', async () => {
        mockGetOfferings.mockResolvedValue({ current: { identifier: 'default' } })
        mockGetCustomerInfo.mockResolvedValue(PREMIUM_INFO)
        mounted = await mountProbe()
        expect(latest.offerings).not.toBeNull()
        expect(latest.hasPremium).toBe(true)

        const login = deferred<void>()
        mockLogIn.mockReturnValue(login.promise)
        await switchAuth(mounted, { id: 'user-2' })

        // user-1's packages/entitlement must not render while user-2's logIn is pending
        expect(latest.offerings).toBeNull()
        expect(latest.customerInfo).toBeNull()
        expect(latest.hasPremium).toBe(false)
    })

    it('configures the SDK exactly once across sign-out, sign-in and account switch', async () => {
        mounted = await mountProbe()

        await switchAuth(mounted, null)
        await switchAuth(mounted, { id: 'user-2' })
        await switchAuth(mounted, { id: 'user-3' })

        // configure is once-per-process; every later identity change is a logIn/logOut
        expect(mockConfigure).toHaveBeenCalledTimes(1)
        expect(mockLogIn.mock.calls).toEqual([['user-2'], ['user-3']])
    })

    it('keeps the same user purchasable across a provider remount without reconfiguring or re-identifying', async () => {
        const first = await mountProbe()
        await act(async () => {
            first.unmount()
        })

        // The provider subtree really does unmount and remount under the app: PowerSyncGuard
        // closes its gate whenever the auth user id changes, and React StrictMode double-mounts
        // in dev. No reset here on purpose — that is the remount the module-scoped SDK state exists
        // for. A second configure would throw at the SDK, and dropping back to unverified would
        // disable the purchase CTAs for a user whose identity never actually changed.
        mounted = await mountProbe()

        expect(mockConfigure).toHaveBeenCalledTimes(1)
        expect(mockLogIn).not.toHaveBeenCalled()
        expect(latest.identityReady).toBe(true)
        expect(latest.loaded).toBe(true)
    })

    it('re-reads subscription state on a remount instead of reusing the unmounted provider’s', async () => {
        const first = await mountProbe()
        const infoCalls = mockGetCustomerInfo.mock.calls.length
        await act(async () => {
            first.unmount()
        })

        // React state dies with the unmount while the module-scoped identity survives; the
        // remount must still fetch, or the fresh provider renders a signed-in user as free.
        mockGetCustomerInfo.mockResolvedValue(PREMIUM_INFO)
        mounted = await mountProbe()

        expect(mockGetCustomerInfo.mock.calls.length).toBeGreaterThan(infoCalls)
        expect(latest.hasPremium).toBe(true)
    })

    it('configures nothing and reports billing unavailable when the API key is missing', async () => {
        ;(ENV as { REVENUECAT_API_KEY_IOS?: string }).REVENUECAT_API_KEY_IOS = 'NULL'

        mounted = await mountProbe()

        expect(mockConfigure).not.toHaveBeenCalled()
        expect(latest.loaded).toBe(true)
        expect(latest.identityReady).toBe(false)
    })
})
