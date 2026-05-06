import { useAuth } from '@/context/AuthContext'
import { getBackgroundSyncMetrics, type BackgroundSyncMetrics } from '@/lib/powersync/backgroundSyncMetrics'
import {
    getKickThrottleRemainingMs,
    getPowerSyncOrchestratorState,
    type PowerSyncOrchestratorState,
} from '@/lib/powersync/orchestrator'
import { isPowerSyncBackgroundTaskRegistered } from '@/lib/powersync/registerBackgroundPowerSync'
import { powerSync } from '@/lib/powersync/system'
import * as BackgroundTask from 'expo-background-task'
import { getWatchdogStatus, subscribeWatchdogStatus, type WatchdogStatus } from '@/lib/powersync/watchdogStatus'
import { formatDateTime } from '@/lib/utils/dateHelper'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

export default function DevStatsScreen() {
    const { session, loading: authLoading } = useAuth()
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | undefined>(() => powerSync.currentStatus.lastSyncedAt)
    const [powerSyncConnected, setPowerSyncConnected] = useState(() => powerSync.currentStatus.connected)
    const [watchdog, setWatchdog] = useState<WatchdogStatus>(() => getWatchdogStatus())
    const [orchestrator, setOrchestrator] = useState<PowerSyncOrchestratorState>(() => getPowerSyncOrchestratorState())
    const [kickCooldownMs, setKickCooldownMs] = useState(() => getKickThrottleRemainingMs())
    const [bgMetrics, setBgMetrics] = useState<BackgroundSyncMetrics | null>(null)
    const [bgRegistered, setBgRegistered] = useState(false)
    const [bgApiStatus, setBgApiStatus] = useState<number | null>(null)

    const refreshOrchestrator = useCallback(() => {
        setOrchestrator(getPowerSyncOrchestratorState())
        setKickCooldownMs(getKickThrottleRemainingMs())
    }, [])

    const refreshBackground = useCallback(async () => {
        const [metrics, registered, status] = await Promise.all([
            getBackgroundSyncMetrics(),
            isPowerSyncBackgroundTaskRegistered(),
            BackgroundTask.getStatusAsync().catch(() => null),
        ])
        setBgMetrics(metrics)
        setBgRegistered(registered)
        setBgApiStatus(status)
    }, [])

    useEffect(() => {
        const unsubscribe = powerSync.registerListener({
            statusChanged: (status) => {
                setLastSyncedAt(status.lastSyncedAt)
                setPowerSyncConnected(status.connected)
                refreshOrchestrator()
            },
        })
        return () => unsubscribe?.()
    }, [refreshOrchestrator])

    useEffect(() => {
        return subscribeWatchdogStatus((next) => {
            setWatchdog(next)
            refreshOrchestrator()
        })
    }, [refreshOrchestrator])

    useEffect(() => {
        void refreshBackground()
    }, [refreshBackground])

    useEffect(() => {
        const id = setInterval(() => {
            refreshOrchestrator()
            void refreshBackground()
        }, 1000)
        return () => clearInterval(id)
    }, [refreshOrchestrator, refreshBackground])

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

                <Text style={[styles.line, styles.sectionLabel]}>Orchestrator</Text>
                <Text style={[styles.line, styles.subtle]}>
                    Last attempt:{' '}
                    {orchestrator.lastAttemptReason ?? '—'}
                    {orchestrator.lastAttemptAt ? ` @ ${formatDateTime(orchestrator.lastAttemptAt)}` : ''}
                </Text>
                {orchestrator.lastError ?
                    <Text style={[styles.line, styles.warn]}>Orchestrator error: {orchestrator.lastError}</Text>
                :   <Text style={[styles.line, styles.subtle]}>Orchestrator error: none</Text>}
                <Text style={[styles.line, styles.subtle]}>
                    Kick cooldown:{' '}
                    {kickCooldownMs > 0 ? `${Math.ceil(kickCooldownMs / 1000)}s until kick allowed` : 'Kick allowed now'}
                </Text>

                <Text style={[styles.line, styles.sectionLabel]}>Background sync task</Text>
                <Text style={[styles.line, styles.subtle]}>
                    API:{' '}
                    {bgApiStatus === BackgroundTask.BackgroundTaskStatus.Available ?
                        'Available'
                    : bgApiStatus === BackgroundTask.BackgroundTaskStatus.Restricted ?
                        'Restricted (Expo Go / web / policy)'
                    : bgApiStatus !== null ?
                        `Status ${bgApiStatus}`
                    :   'Unknown'}
                </Text>
                <Text style={[styles.line, styles.subtle]}>
                    Registered:{' '}
                    {bgRegistered ? 'Yes' : 'No'}
                </Text>
                {bgMetrics ?
                    <>
                        <Text style={[styles.line, styles.subtle]}>
                            BG runs: {bgMetrics.runCount} — last: {formatDateTime(new Date(bgMetrics.lastRunAt))}
                        </Text>
                        <Text style={[styles.line, styles.subtle]}>
                            Last BG result: {bgMetrics.lastResult}
                            {bgMetrics.lastSyncedAdvanced === true ? ' (lastSyncedAt advanced)' : ''}
                            {bgMetrics.lastSyncedAdvanced === false ? ' (lastSyncedAt unchanged)' : ''}
                        </Text>
                        {bgMetrics.lastError ?
                            <Text style={[styles.line, styles.warn]}>BG last error: {bgMetrics.lastError}</Text>
                        :   null}
                    </>
                :   <Text style={[styles.line, styles.subtle]}>No background runs recorded yet</Text>}
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
    sectionLabel: {
        marginTop: 16,
        fontSize: 11,
        color: '#555',
        letterSpacing: 0.8,
        fontFamily: 'Poppins_600SemiBold',
        textTransform: 'uppercase',
    },
})
