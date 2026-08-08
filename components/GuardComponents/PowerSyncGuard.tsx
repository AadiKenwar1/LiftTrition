import { useAuth } from '@/context/AuthContext'
import { forceSignOut } from '@/context/AuthContext/functions/accountFunctions'
import { useAsyncLoad } from '@/lib/hooks/useAsyncLoad'
import { throwIfLoadFailureArmed } from '@/lib/devtools/forceLoadFailure'
import { ensurePowerSyncConnected } from '@/lib/powersync/orchestrator'
import { FIRST_SYNC_TIMEOUT_MS, waitForFirstSyncOrThrow } from '@/lib/powersync/waitForFirstSync'
import { confirmDelete } from '@/lib/utils/confirmDelete'
import React, { useCallback } from 'react'
import { AppLoadingScreen } from './AppLoadingScreen'

type Props = {
    children: React.ReactNode
}

export function PowerSyncGuard({ children }: Props) {
    const { session, loading: authLoading } = useAuth()

    // (Re)attempt the connection, then wait for the first sync with a timeout. A
    // timeout/failure surfaces the retry + sign-out affordances instead of hanging
    // on "Syncing data..." forever. ensurePowerSyncConnected is what makes retry
    // actually re-connect (it's mutex-serialized and no-ops when already connected).
    // Keyed on the user id, not the session object: Supabase hands back a new session object on
    // every token refresh, and re-running the loader re-closes the gate, unmounting the whole
    // provider subtree (Settings/Billing/Workout/Nutrition) mid-session.
    const { status, retry } = useAsyncLoad(async () => {
        if (!session) return
        if (__DEV__) await throwIfLoadFailureArmed('powersync')
        await ensurePowerSyncConnected('auth_session')
        await waitForFirstSyncOrThrow(FIRST_SYNC_TIMEOUT_MS)
    }, [session?.user?.id, authLoading])

    // Escape hatch when first sync can't complete: confirm, then force sign-out.
    // forceSignOut (not signOut) skips the upload flush, which would itself hang on
    // the unreachable connection; a device stuck on first sync has no local data to lose.
    const handleEscape = useCallback(() => {
        confirmDelete({
            title: 'Sign out?',
            message: "You can sign back in once you're online. A device that hasn't finished its first sync has no unsaved data to lose.",
            confirmText: 'Sign out',
            onConfirm: () => {
                void forceSignOut().catch((e) => {
                    console.warn('[PowerSyncGuard] forceSignOut failed', e)
                })
            },
        })
    }, [])

    if (authLoading || status !== 'ready') {
        return (
            <AppLoadingScreen
                message="Syncing data..."
                loadFailed={!authLoading && status === 'error'}
                onRetry={retry}
                onSignOut={handleEscape}
            />
        )
    }

    return <>{children}</>
}
