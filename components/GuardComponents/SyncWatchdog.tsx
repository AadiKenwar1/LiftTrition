import { useAuth } from '@/context/AuthContext'
import {
    ensurePowerSyncConnected,
    getKickThrottleRemainingMs,
    getPowerSyncOrchestratorState,
    kickPowerSync,
} from '@/lib/powersync/orchestrator'
import { powerSync } from '@/lib/powersync/system'
import { setWatchdogStatus } from '@/lib/powersync/watchdogStatus'
import * as Sentry from '@sentry/react-native'
import { useEffect } from 'react'
import { AppState } from 'react-native'

const CHECK_EVERY_MS = 30_000
const STALE_MS = 10 * 60_000

/**
 * PowerSync health monitor + recovery.
 *
 * - Runs only when a user session exists.
 * - Avoids doing work in background (iOS often suspends networking/JS anyway).
 * - Uses the orchestrator so connect/disconnect/kick actions never overlap.
 */
export function SyncWatchdog() {
    const { session, loading } = useAuth()

    useEffect(() => {
        if (loading) {
            setWatchdogStatus({ enabled: false, reason: 'disabled', message: 'auth_loading' })
            return
        }
        if (!session) {
            setWatchdogStatus({ enabled: false, reason: 'no_session', message: 'no_session' })
            return
        }

        setWatchdogStatus({ enabled: true, reason: 'currently_healthy', message: undefined })

        let appState = AppState.currentState
        let disposed = false

        /**
         * "Kick" is a hard reconnect (disconnect -> connect) routed through the orchestrator.
         * This is heavier than a simple connect, so the orchestrator enforces throttling.
         */
        const kick = async (reason: 'disconnected' | 'stale_last_sync') => {
            const orchestratorReason =
                reason === 'disconnected' ? 'watchdog_disconnected' : 'watchdog_stale_last_sync'

            const outcome = await kickPowerSync(orchestratorReason)
            if (disposed) return

            if (outcome === 'throttled') {
                const remainingMs = getKickThrottleRemainingMs()
                setWatchdogStatus({
                    enabled: true,
                    lastCheckAt: new Date(),
                    reason: 'throttled',
                    message: `${reason}:${Math.ceil(remainingMs / 1000)}s_remaining`,
                })
                return
            }

            if (outcome === 'background') {
                setWatchdogStatus({
                    enabled: true,
                    lastCheckAt: new Date(),
                    reason: 'background',
                    message: AppState.currentState,
                })
                return
            }

            if (outcome === 'error') {
                const { lastError } = getPowerSyncOrchestratorState()
                // Breadcrumb only — kickPowerSync's own catch already captured this failure once;
                // capturing it again here would double-count the same underlying error.
                Sentry.addBreadcrumb({ category: 'powersync', level: 'warning', message: `watchdog_kick_error:${reason}`, data: { lastError } })
                setWatchdogStatus({
                    enabled: true,
                    lastCheckAt: new Date(),
                    lastKickAt: new Date(),
                    reason: 'error',
                    message: lastError ?? reason,
                })
                return
            }

            setWatchdogStatus({
                enabled: true,
                lastCheckAt: new Date(),
                lastKickAt: new Date(),
                reason: 'kicked',
                message: reason,
            })
        }

        /**
         * Periodic health check:
         * - If not active, we only report background state.
         * - If disconnected, kick immediately.
         * - If lastSyncedAt is too old, kick to recover from "stuck but connected" cases.
         */
        const check = () => {
            if (disposed) return
            setWatchdogStatus({ enabled: true, lastCheckAt: new Date() })

            if (appState !== 'active') {
                setWatchdogStatus({ enabled: true, reason: 'background', message: appState })
                return
            }

            const { connected, lastSyncedAt } = powerSync.currentStatus
            if (!connected) {
                void kick('disconnected')
                return
            }

            const lastMs = lastSyncedAt?.getTime()
            const now = Date.now()
            if (!lastMs || now - lastMs > STALE_MS) {
                void kick('stale_last_sync')
                return
            }

            setWatchdogStatus({ enabled: true, reason: 'currently_healthy', message: undefined })
        }

        const sub = AppState.addEventListener('change', (next) => {
            appState = next
            if (next !== 'active') return
            // Resume path: iOS may drop the socket while backgrounded, but AuthContext won't re-run
            // unless the userId changes. We try a cheap "connect if disconnected" before the check.
            void (async () => {
                try {
                    await ensurePowerSyncConnected('watchdog_resume')
                } catch {
                    // Error is stored on orchestrator state; check() may still kick if disconnected.
                }
                if (!disposed) check()
            })()
        })

        const id = setInterval(check, CHECK_EVERY_MS)
        check()

        return () => {
            disposed = true
            sub.remove()
            clearInterval(id)
        }
    }, [session, loading])

    return null
}
