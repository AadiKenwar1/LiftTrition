import { useAuth } from '@/context/AuthContext'
import { powerSync } from '@/lib/powersync/system'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

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

    // Show loading indicator while waiting for sync
    if (!powerSyncReady) {
        return (
            <View style={styles.syncContainer}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.syncText}>Syncing data...</Text>
            </View>
        )
    }

    return <>{children}</>
}

const styles = StyleSheet.create({
    syncContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    syncText: {
        color: '#888',
        marginTop: 16,
        fontSize: 16,
    },
})
