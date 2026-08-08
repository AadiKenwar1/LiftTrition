// What the native RevenueCat SDK has been told in this JS process. Module scope on
// purpose: Purchases.configure is once-per-process, but BillingProvider can remount
// (PowerSyncGuard gate, Fast Refresh) — React state would forget and reconfigure.
let configured = false
let sdkUserId: string | null = null

// True once Purchases.configure has run in this process.
export function isSdkConfigured(): boolean {
    return configured
}

// The user id the SDK last completed a configure/logIn/logOut for; null = none/anonymous.
export function getSdkUserId(): string | null {
    return sdkUserId
}

// Records that configure ran with this user as the appUserID.
export function markSdkConfigured(userId: string): void {
    configured = true
    sdkUserId = userId
}

// Records a completed logIn (an id) or logOut (null) against the already-configured SDK.
export function setSdkUserId(userId: string | null): void {
    sdkUserId = userId
}

// Jest-only: module state outlives each test in a file; providers under test must start
// from the unconfigured state.
export function resetSdkIdentityForTests(): void {
    configured = false
    sdkUserId = null
}
