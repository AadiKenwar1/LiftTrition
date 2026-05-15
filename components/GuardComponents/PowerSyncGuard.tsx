import { useAuth } from '@/context/AuthContext'
import { powerSync } from '@/lib/powersync/system'
import React, { useEffect, useState } from 'react'
import { AppLoadingScreen } from './AppLoadingScreen'

type Props = {
    children: React.ReactNode
}

export function PowerSyncGuard({ children }: Props) {
    const { session, loading: authLoading } = useAuth()
    const [powerSyncReady, setPowerSyncReady] = useState(false)

    useEffect(() => {
        if (authLoading) return

        // If no session, no need to wait for PowerSync sync
        if (!session) {
            setPowerSyncReady(true)
            return
        }

        // Wait for PowerSync to finish initial sync (per PowerSync docs)
        const waitForSync = async () => {
            try {
                await powerSync.waitForFirstSync()
                setPowerSyncReady(true)
            } catch (error) {
                console.warn('[PowerSyncGuard] waitForFirstSync failed, continuing anyway', error)
                setPowerSyncReady(true)
            }
        }

        waitForSync()
    }, [session, authLoading])

    if (!powerSyncReady) {
        return <AppLoadingScreen message="Syncing data..." />
    }

    return <>{children}</>
}
