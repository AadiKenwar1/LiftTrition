import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

/**
 * Dev-only switch that makes the whole app treat the user as free
 * (hasPremium → false) regardless of the real RevenueCat entitlement — there is
 * no way to deactivate a real subscription from the app, so this is how free
 * flows (scan teaser, food DB gate, PRO badge) are tested on-device. Persists
 * across restarts; the Dev Hub shows a loud indicator while it's on. Unlike
 * forceSaveFailure this must be readable synchronously (hasPremium is a
 * useMemo), hence the hydrated module state + subscription + hook.
 * In production __DEV__ is statically false, so every function no-ops and the
 * hook always returns false.
 */

const STORAGE_KEY = 'devForceFreeMode'

let value: boolean | null = null
const listeners = new Set<(v: boolean) => void>()

async function hydrate(): Promise<boolean> {
    if (!__DEV__) return false
    if (value === null) value = (await AsyncStorage.getItem(STORAGE_KEY)) === '1'
    return value
}

export async function isForceFreeModeOn(): Promise<boolean> {
    return hydrate()
}

export async function setForceFreeMode(on: boolean): Promise<void> {
    if (!__DEV__) return
    value = on
    listeners.forEach((cb) => cb(on))
    if (on) await AsyncStorage.setItem(STORAGE_KEY, '1')
    else await AsyncStorage.removeItem(STORAGE_KEY)
}

export function subscribeForceFreeMode(cb: (v: boolean) => void): () => void {
    listeners.add(cb)
    return () => listeners.delete(cb)
}

export function useForceFreeMode(): boolean {
    const [on, setOn] = useState(value === true)

    useEffect(() => {
        if (!__DEV__) return
        let cancelled = false
        void hydrate().then((v) => {
            if (!cancelled) setOn(v)
        })
        const unsubscribe = subscribeForceFreeMode(setOn)
        return () => {
            cancelled = true
            unsubscribe()
        }
    }, [])

    return __DEV__ ? on : false
}
