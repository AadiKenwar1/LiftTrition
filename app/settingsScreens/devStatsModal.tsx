import { useAuth } from '@/context/AuthContext'
import { powerSync } from '@/lib/powersync/system'
import { getWatchdogStatus, subscribeWatchdogStatus, type WatchdogStatus } from '@/lib/powersync/watchdogStatus'
import { formatDateTime } from '@/lib/utils/dateHelper'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

export default function DevStatsScreen() {
    const { session, loading: authLoading } = useAuth()
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | undefined>(() => powerSync.currentStatus.lastSyncedAt)
    const [powerSyncConnected, setPowerSyncConnected] = useState(() => powerSync.currentStatus.connected)
    const [watchdog, setWatchdog] = useState<WatchdogStatus>(() => getWatchdogStatus())

    useEffect(() => {
        const unsubscribe = powerSync.registerListener({
            statusChanged: (status) => {
                setLastSyncedAt(status.lastSyncedAt)
                setPowerSyncConnected(status.connected)
            },
        })
        return () => unsubscribe?.()
    }, [])

    useEffect(() => {
        return subscribeWatchdogStatus(setWatchdog)
    }, [])

    return (
        <View style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Dev Stats</Text>

                {lastSyncedAt ?
                    <Text style={[styles.line, styles.subtle]}>Last synced: {formatDateTime(lastSyncedAt)}</Text>
                : powerSyncConnected ?
                    <Text style={[styles.line, styles.subtle]}>Syncing...</Text>
                :   null}

                <Text style={[styles.line, powerSyncConnected ? styles.ok : styles.warn]}>PowerSync: {powerSyncConnected ? 'Connected' : 'Not connected'}</Text>

                <Text
                    style={[
                        styles.line,
                        authLoading ? styles.subtle
                        : session ? styles.ok
                        : styles.warn,
                    ]}
                >
                    Session:{' '}
                    {authLoading ?
                        'Checking…'
                    : session ?
                        'Signed in'
                    :   'Not signed in'}
                </Text>

                <Text style={[styles.line, styles.subtle]}>Watchdog: {watchdog.enabled ? 'Enabled' : 'Disabled'}</Text>
                <Text style={[styles.line, styles.subtle]}>
                    Watchdog reason: {watchdog.reason}
                    {watchdog.message ? ` (${watchdog.message})` : ''}
                </Text>
                {watchdog.lastKickAt ?
                    <Text style={[styles.line, styles.subtle]}>Watchdog last kick: {formatDateTime(watchdog.lastKickAt)}</Text>
                :   null}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#333',
        borderRadius: 3,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 40,
    },
    title: {
        fontSize: 22,
        color: '#FFF',
        letterSpacing: -0.2,
        marginBottom: 12,
        fontFamily: 'Poppins_600SemiBold',
    },
    line: {
        fontSize: 13,
        color: '#aaa',
        letterSpacing: 0.2,
        marginTop: 8,
        fontFamily: 'Poppins_400Regular',
    },
    subtle: {
        color: '#666',
    },
    ok: {
        color: '#7a9e7a',
    },
    warn: {
        color: '#c9a227',
    },
})
