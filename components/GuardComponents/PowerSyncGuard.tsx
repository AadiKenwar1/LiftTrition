import { useAuth } from '@/context/AuthContext'
import { useAsyncLoad } from '@/lib/hooks/useAsyncLoad'
import { throwIfLoadFailureArmed } from '@/lib/devtools/forceLoadFailure'
import { powerSync } from '@/lib/powersync/system'
import React from 'react'
import { AppLoadingScreen } from './AppLoadingScreen'

type Props = {
    children: React.ReactNode
}

export function PowerSyncGuard({ children }: Props) {
    const { session, loading: authLoading } = useAuth()

    // Wait for PowerSync's first sync before rendering the app. A failure now
    // surfaces the retry affordance instead of silently continuing.
    const { status, retry } = useAsyncLoad(async () => {
        if (!session) return
        if (__DEV__) await throwIfLoadFailureArmed('powersync')
        await powerSync.waitForFirstSync()
    }, [session, authLoading])

    if (authLoading || status !== 'ready') {
        return (
            <AppLoadingScreen
                message="Syncing data..."
                loadFailed={!authLoading && status === 'error'}
                onRetry={retry}
            />
        )
    }

    return <>{children}</>
}
