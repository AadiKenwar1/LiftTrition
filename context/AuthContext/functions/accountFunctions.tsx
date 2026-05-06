import { flushUploadsOrThrow, UploadFlushTimeoutError } from '@/lib/powersync/FlushUploads'
import { disconnectAndClearPowerSync } from '@/lib/powersync/orchestrator'
import { supabase } from '@/lib/supabase/client'
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function deleteAccount(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
        throw new Error('You must be signed in to delete your account.')
    }

    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/deleteAccount`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to delete account. Please try again.')
    }

    await signOut()
}

export async function signOut() {
    // Require a connected PowerSync client, then wait for all pending uploads to drain (Gate C)
    // before signing out and clearing local data.
    await flushUploadsOrThrow({ timeoutMs: 60_000 })

    const { error } = await supabase.auth.signOut()
    if (error) throw error

    await disconnectAndClearPowerSync()
    await AsyncStorage.clear()
}

/**
 * Force sign out immediately (skips upload flush). This can lose unsynced local data.
 * Intended to be called only after explicit user confirmation.
 */
export async function forceSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await disconnectAndClearPowerSync()
    await AsyncStorage.clear()
}

export function isUploadFlushTimeoutError(e: unknown): e is UploadFlushTimeoutError {
    return e instanceof UploadFlushTimeoutError
}
