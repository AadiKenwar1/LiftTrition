import { useAuth } from '@/context/AuthContext'
import { getBackgroundSyncMetrics, type BackgroundSyncMetrics } from '@/lib/powersync/backgroundSyncMetrics'
import { getKickThrottleRemainingMs, getPowerSyncOrchestratorState, type PowerSyncOrchestratorState } from '@/lib/powersync/orchestrator'
import { isPowerSyncBackgroundTaskRegistered } from '@/lib/powersync/registerBackgroundPowerSync'
import { powerSync } from '@/lib/powersync/system'
import { getWatchdogStatus, subscribeWatchdogStatus, type WatchdogStatus } from '@/lib/powersync/watchdogStatus'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils/dateHelper'
import * as BackgroundTask from 'expo-background-task'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

type TokenServerCheck = 'idle' | 'checking' | 'valid' | 'invalid' | 'error'

function formatAgeShort(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000))
    if (s < 60) return `${s}s ago`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ${s % 60}s ago`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m ago`
}

function formatTimeUntil(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000))
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ${s % 60}s`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
}

function replicationFreshnessHint(connected: boolean, lastSyncedAt: Date | undefined): string {
    if (!connected) return 'Transport is down — replication cannot run.'
    if (!lastSyncedAt) return 'No lastSyncedAt yet — first sync may still be in progress, or no server data applied.'
    const ageMs = Date.now() - lastSyncedAt.getTime()
    if (ageMs < 2 * 60_000) return 'Marker is recent — replication likely healthy (or no new server data to apply).'
    if (ageMs > 10 * 60_000) return 'Marker is old — may be stalled, or simply no server changes since then (watchdog uses 10m stale rule).'
    return 'Marker age is moderate — if you expect new data, confirm server-side changes are reaching PowerSync.'
}

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
    const [tokenServerCheck, setTokenServerCheck] = useState<TokenServerCheck>('idle')
    const [tokenServerDetail, setTokenServerDetail] = useState<string | undefined>()
    const [lastGetUserAt, setLastGetUserAt] = useState<Date | undefined>()

    const refreshOrchestrator = useCallback(() => {
        setOrchestrator(getPowerSyncOrchestratorState())
        setKickCooldownMs(getKickThrottleRemainingMs())
    }, [])

    const refreshBackground = useCallback(async () => {
        const [metrics, registered, status] = await Promise.all([getBackgroundSyncMetrics(), isPowerSyncBackgroundTaskRegistered(), BackgroundTask.getStatusAsync().catch(() => null)])
        setBgMetrics(metrics)
        setBgRegistered(registered)
        setBgApiStatus(status)
    }, [])

    /** Poll SDK truth so Dev Stats cannot drift if a status event is missed. */
    const syncPowerSyncFromDevice = useCallback(() => {
        const st = powerSync.currentStatus
        setLastSyncedAt(st.lastSyncedAt)
        setPowerSyncConnected(st.connected)
        refreshOrchestrator()
    }, [refreshOrchestrator])

    const runGetUserValidation = useCallback(async () => {
        if (!session?.user?.id) {
            setTokenServerCheck('idle')
            setTokenServerDetail(undefined)
            setLastGetUserAt(undefined)
            return
        }
        setTokenServerCheck('checking')
        const { data, error } = await supabase.auth.getUser()
        setLastGetUserAt(new Date())
        if (error) {
            setTokenServerCheck('error')
            setTokenServerDetail(error.message)
            return
        }
        if (!data.user) {
            setTokenServerCheck('invalid')
            setTokenServerDetail('No user returned from server')
            return
        }
        setTokenServerCheck('valid')
        setTokenServerDetail(undefined)
    }, [session?.user?.id])

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
        void runGetUserValidation()
    }, [runGetUserValidation])

    useEffect(() => {
        const id = setInterval(() => void runGetUserValidation(), 15_000)
        return () => clearInterval(id)
    }, [runGetUserValidation])

    useEffect(() => {
        const tick = () => {
            syncPowerSyncFromDevice()
            void refreshBackground()
        }
        const id = setInterval(tick, 1000)
        tick()
        return () => clearInterval(id)
    }, [syncPowerSyncFromDevice, refreshBackground])

    return (
        <View style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Dev Stats</Text>

                <Text style={[styles.line, styles.sectionLabel]}>Transport & replication</Text>
                <Text style={[styles.line, powerSyncConnected ? styles.ok : styles.warn]}>PowerSync transport: {powerSyncConnected ? 'connected' : 'not connected'}</Text>
                {lastSyncedAt ?
                    <>
                        <Text style={[styles.line, styles.subtle]}>lastSyncedAt: {formatDateTime(lastSyncedAt)}</Text>
                        <Text style={[styles.line, styles.subtle]}>Marker age: {formatAgeShort(Date.now() - lastSyncedAt.getTime())}</Text>
                    </>
                : powerSyncConnected ?
                    <Text style={[styles.line, styles.subtle]}>lastSyncedAt: none yet (still syncing or no server writes applied)</Text>
                :   <Text style={[styles.line, styles.subtle]}>lastSyncedAt: —</Text>}
                <Text style={[styles.line, styles.subtle]}>{replicationFreshnessHint(powerSyncConnected, lastSyncedAt)}</Text>

                <Text style={[styles.line, styles.sectionLabel]}>Session & token</Text>
                <Text
                    style={[
                        styles.line,
                        authLoading ? styles.subtle
                        : session ? styles.ok
                        : styles.warn,
                    ]}
                >
                    Session in memory:{' '}
                    {authLoading ?
                        'Checking…'
                    : session ?
                        'present (signed in)'
                    :   'absent'}
                </Text>
                {session?.expires_at ?
                    <Text style={[styles.line, styles.subtle]}>
                        Access token expiry (client): {formatDateTime(new Date(session.expires_at * 1000))}
                        {Date.now() / 1000 > session.expires_at ? ' — expired (refresh should run)' : ` — in ${formatTimeUntil(new Date(session.expires_at * 1000).getTime() - Date.now())}`}
                    </Text>
                :   null}
                <Text
                    style={[
                        styles.line,
                        tokenServerCheck === 'valid' ? styles.ok
                        : tokenServerCheck === 'checking' ? styles.subtle
                        : tokenServerCheck === 'idle' ? styles.subtle
                        : styles.warn,
                    ]}
                >
                    Server token check (getUser):{' '}
                    {tokenServerCheck === 'idle' ?
                        '—'
                    : tokenServerCheck === 'checking' ?
                        'Checking…'
                    : tokenServerCheck === 'valid' ?
                        'Valid'
                    : tokenServerCheck === 'invalid' ?
                        `Invalid${tokenServerDetail ? ` (${tokenServerDetail})` : ''}`
                    :   `Error${tokenServerDetail ? `: ${tokenServerDetail}` : ''}`}
                </Text>
                {lastGetUserAt ?
                    <Text style={[styles.line, styles.subtle]}>Last getUser: {formatDateTime(lastGetUserAt)} (every 15s)</Text>
                :   null}

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
                    Last attempt: {orchestrator.lastAttemptReason ?? '—'}
                    {orchestrator.lastAttemptAt ? ` @ ${formatDateTime(orchestrator.lastAttemptAt)}` : ''}
                </Text>
                {orchestrator.lastError ?
                    <Text style={[styles.line, styles.warn]}>Orchestrator error: {orchestrator.lastError}</Text>
                :   <Text style={[styles.line, styles.subtle]}>Orchestrator error: none</Text>}
                <Text style={[styles.line, styles.subtle]}>Kick cooldown: {kickCooldownMs > 0 ? `${Math.ceil(kickCooldownMs / 1000)}s until kick allowed` : 'Kick allowed now'}</Text>

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
                <Text style={[styles.line, styles.subtle]}>Registered: {bgRegistered ? 'Yes' : 'No'}</Text>
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
