import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Dev-only switch to force a context load to fail once, so the load-failure
 * retry UI can be exercised on-device from the Dev Hub without editing code.
 * Persisted to AsyncStorage so it survives the relaunch that triggers a startup
 * load. In production __DEV__ is statically false, so every function no-ops and
 * an armed failure is impossible — the switch is always effectively off.
 */

export type LoadScope = 'settings' | 'nutrition' | 'workout' | 'powersync'

export const LOAD_SCOPES: LoadScope[] = ['settings', 'nutrition', 'workout', 'powersync']

const storageKey = (scope: LoadScope) => `devForceLoadFailure:${scope}`

/** Arm or disarm a one-shot load failure for a scope. Dev-only. */
export async function setLoadFailureArmed(scope: LoadScope, armed: boolean): Promise<void> {
    if (!__DEV__) return
    if (armed) await AsyncStorage.setItem(storageKey(scope), '1')
    else await AsyncStorage.removeItem(storageKey(scope))
}

/** Whether a scope is currently armed to fail on its next load. Dev-only. */
export async function isLoadFailureArmed(scope: LoadScope): Promise<boolean> {
    if (!__DEV__) return false
    return (await AsyncStorage.getItem(storageKey(scope))) === '1'
}

/**
 * If the scope is armed, consume the flag and throw so the load fails exactly
 * once (the next retry then succeeds). No-op in production.
 */
export async function throwIfLoadFailureArmed(scope: LoadScope): Promise<void> {
    if (!__DEV__) return
    const key = storageKey(scope)
    if ((await AsyncStorage.getItem(key)) !== '1') return
    // Disarm after a short delay rather than synchronously: React dev-mode
    // double-invokes effects, so the load runs twice on mount. Consuming the
    // flag on the first run would let the immediate second run succeed and
    // overwrite the error state. Delaying keeps both mount-time runs failing
    // (so the retry screen sticks) while a later user-tapped retry succeeds.
    setTimeout(() => {
        void AsyncStorage.removeItem(key)
    }, 1000)
    throw new Error(`[dev] Forced "${scope}" load failure (Dev Hub)`)
}
