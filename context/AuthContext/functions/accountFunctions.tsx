import { flushUploadsOrThrow, UploadFlushTimeoutError } from '@/lib/powersync/FlushUploads'
import { disconnectAndClearPowerSync } from '@/lib/powersync/orchestrator'
import { supabase } from '@/lib/supabase/client'
import { clearUserStorage } from '@/lib/utils/userStorage'

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

    // Server confirmed: account and data are gone, so pending uploads are meaningless.
    // No Gate C flush — clear local state unconditionally.
    await clearLocalSession()
    await clearUserStorage(session.user.id)
}

export async function signOut(): Promise<void> {
    // Require a connected PowerSync client, then wait for all pending uploads to drain (Gate C)
    // before signing out and clearing local data.
    await flushUploadsOrThrow({ timeoutMs: 60_000 })

    const userID = await currentUserID()

    const { error } = await supabase.auth.signOut()
    if (error) throw error

    await disconnectAndClearPowerSync()
    if (userID) await clearUserStorage(userID)
}

/**
 * Force sign out immediately (skips upload flush). This can lose unsynced local data.
 * Intended to be called only after explicit user confirmation.
 */
export async function forceSignOut(): Promise<void> {
    const userID = await currentUserID()
    await clearLocalSession()
    if (userID) await clearUserStorage(userID)
}

/**
 * End the session on this device and wipe the local PowerSync replica.
 * Each step is guarded so a failure in one never strands the next.
 */
export async function clearLocalSession(): Promise<void> {
    try {
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error) console.warn('clearLocalSession: auth signOut failed', error)
    } catch (e) {
        console.warn('clearLocalSession: auth signOut threw', e)
    }

    try {
        await disconnectAndClearPowerSync()
    } catch (e) {
        console.warn('clearLocalSession: PowerSync clear failed', e)
    }
}

/**
 * The signed-in user's id, captured before auth teardown so scoped storage
 * (see clearUserStorage) can be erased. Returns undefined when no session is
 * available (e.g. a force sign-out of an already-broken session).
 */
async function currentUserID(): Promise<string | undefined> {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.user?.id
    } catch (e) {
        console.warn('currentUserID: getSession failed', e)
        return undefined
    }
}

export function isUploadFlushTimeoutError(e: unknown): e is UploadFlushTimeoutError {
    return e instanceof UploadFlushTimeoutError
}
