import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Dev-only switch to force a persist (local write) to fail once, so the
 * save-failure policy (alert + rollback-by-reload) can be exercised on-device
 * from the Dev Hub without editing code. The write analog of forceLoadFailure.
 * In production __DEV__ is statically false, so every function no-ops and an
 * armed failure is impossible — the switch is always effectively off.
 */

export type SaveScope = 'settings' | 'nutrition' | 'workout'

export const SAVE_SCOPES: SaveScope[] = ['settings', 'nutrition', 'workout']

const storageKey = (scope: SaveScope) => `devForceSaveFailure:${scope}`

/** Arm or disarm a one-shot save failure for a scope. Dev-only. */
export async function setSaveFailureArmed(scope: SaveScope, armed: boolean): Promise<void> {
    if (!__DEV__) return
    if (armed) await AsyncStorage.setItem(storageKey(scope), '1')
    else await AsyncStorage.removeItem(storageKey(scope))
}

/** Whether a scope is currently armed to fail on its next save. Dev-only. */
export async function isSaveFailureArmed(scope: SaveScope): Promise<boolean> {
    if (!__DEV__) return false
    return (await AsyncStorage.getItem(storageKey(scope))) === '1'
}

/**
 * If the scope is armed, consume the flag and throw so the write fails exactly
 * once (the next retry then succeeds). Unlike the load variant, writes are
 * user-triggered (no dev-mode double invocation), so the flag is consumed
 * synchronously. No-op in production.
 */
export async function throwIfSaveFailureArmed(scope: SaveScope): Promise<void> {
    if (!__DEV__) return
    const key = storageKey(scope)
    if ((await AsyncStorage.getItem(key)) !== '1') return
    await AsyncStorage.removeItem(key)
    throw new Error(`[dev] Forced "${scope}" save failure (Dev Hub)`)
}
