import { ENV } from '@/lib/env'
import { clearFoodDBCaches } from '@/lib/foodDB/foodDB'
import { flushUploadsOrThrow } from '@/lib/powersync/FlushUploads'
import { disconnectAndClearPowerSync } from '@/lib/powersync/orchestrator'
import { supabase } from '@/lib/supabase/client'
import { clearUserStorage } from '@/lib/utils/userStorage'
import * as Sentry from '@sentry/react-native'

export async function deleteAccount(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
        throw new Error('You must be signed in to delete your account.')
    }

    const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/deleteaccount`, {
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
    clearFoodDBCaches()
}

/**
 * Force sign out immediately (skips upload flush). This can lose unsynced local data.
 * Intended to be called only after explicit user confirmation.
 */
export async function forceSignOut(): Promise<void> {
    // Deliberate, non-throwing data-loss action confirmed by the user — recorded as a message since
    // there is no exception object for this control-flow path. Its own possible failure (below) is
    // a separate, genuinely unexpected funnel and is captured/rethrown unchanged.
    Sentry.captureMessage('force_sign_out_data_loss', { level: 'warning', tags: { area: 'force-sign-out-data-loss' } })
    try {
        const userID = await currentUserID()
        await clearLocalSession()
        if (userID) await clearUserStorage(userID)
    } catch (e) {
        Sentry.captureException(e, { tags: { area: 'force-sign-out-failed' } })
        throw e
    }
}

/**
 * Remove the auth session from this device without requiring the network.
 * signOut({ scope: 'local' }) calls the server BEFORE deleting the stored
 * session, so offline it returns an error with the session still on disk.
 * The fallback calls supabase's private _removeSession — the exact cleanup a
 * successful sign-out runs (storage keys, memory, SIGNED_OUT event). Its
 * existence is pinned by lib/supabase/__tests__/authInternals.test.ts.
 */
async function removeLocalAuthSession(): Promise<void> {
    try {
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (!error) return
        console.warn('clearLocalSession: auth signOut failed; removing local session directly', error)
    } catch (e) {
        console.warn('clearLocalSession: auth signOut threw; removing local session directly', e)
    }

    const auth = supabase.auth as unknown as { _removeSession?: () => Promise<void> }
    if (typeof auth._removeSession !== 'function') {
        throw new Error('Could not sign out on this device. Please try again when back online.')
    }
    await auth._removeSession()
}

/**
 * End the session on this device and wipe the local PowerSync replica.
 * Session removal must succeed BEFORE anything is wiped — otherwise a failed
 * sign-out would leave the user signed in with an empty local database.
 */
export async function clearLocalSession(): Promise<void> {
    await removeLocalAuthSession()

    try {
        await disconnectAndClearPowerSync()
    } catch (e) {
        // Sole capture site for this swallowed path (reached only via deleteAccount/forceSignOut):
        // signOut() calls disconnectAndClearPowerSync directly and lets a failure propagate to
        // profile.tsx's catch-all, which captures it there instead — capturing in both places would
        // double-count the same underlying error.
        console.warn('clearLocalSession: PowerSync clear failed', e)
        Sentry.captureException(e, { tags: { area: 'powersync-disconnect-clear', reason: 'local_session_clear' } })
    }

    clearFoodDBCaches()
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
