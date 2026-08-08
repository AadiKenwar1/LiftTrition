import Purchases from 'react-native-purchases'

// The four ways the app can know (or fail to know) who the RevenueCat SDK is acting as.
export type BillingIdentityStatus = 'none' | 'pending' | 'verified' | 'failed'

export type BillingIdentityErrorReason = 'no-user' | 'identity-pending' | 'login-retry-failed' | 'mismatch-after-retry'

// The one user-facing copy for every not-purchasable state: guard rejections surface it
// via err.message, and the paywall/subscription screens render it as the inline note
// whenever purchasing is impossible (identity unproven, packages missing, no store key).
export const BILLING_IDENTITY_ERROR_MESSAGE = "Purchases aren't available right now. Please try again later."

// Typed rejection so callers can tell an identity refusal apart from a store failure.
export class BillingIdentityError extends Error {
    readonly reason: BillingIdentityErrorReason

    constructor(reason: BillingIdentityErrorReason) {
        super(BILLING_IDENTITY_ERROR_MESSAGE)
        this.name = 'BillingIdentityError'
        this.reason = reason
    }
}

// Call-time money gate: proves the SDK is acting as expectedUserId before a purchase or
// restore can reach the store. The happy path is one local read (identity is cached on
// device, so it costs ~0ms). On divergence it self-heals with exactly one logIn retry —
// but never while the provider's own logIn is still in flight, since stacking logIns
// re-creates the identity race this guard exists to close. It can only block, never
// enable: a rejection here means the receipt would have landed on the wrong customer.
export async function ensureBillingIdentity(expectedUserId: string | null, status: BillingIdentityStatus): Promise<void> {
    if (!expectedUserId) throw new BillingIdentityError('no-user')

    // A rejected read (SDK unconfigured) counts as unknown identity, not a crash
    const actual = await Purchases.getAppUserID().catch(() => null)
    if (actual === expectedUserId) return

    if (status === 'pending') throw new BillingIdentityError('identity-pending')

    try {
        await Purchases.logIn(expectedUserId)
    } catch {
        throw new BillingIdentityError('login-retry-failed')
    }

    const rechecked = await Purchases.getAppUserID().catch(() => null)
    if (rechecked !== expectedUserId) throw new BillingIdentityError('mismatch-after-retry')
}
