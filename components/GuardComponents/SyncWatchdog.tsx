import { useAuth } from '@/context/AuthContext'
import { Connector } from '@/lib/powersync/Connector'
import { powerSync } from '@/lib/powersync/system'
import { setWatchdogStatus } from '@/lib/powersync/watchdogStatus'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

const CHECK_EVERY_MS = 30_000
const STALE_MS = 2 * 60_000
const MIN_KICK_GAP_MS = 2 * 60_000

export function SyncWatchdog() {
    const { session, loading } = useAuth()
    const lastKickAtMsRef = useRef(0)

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

        const kick = async (reason: 'disconnected' | 'stale_last_sync') => {
            const now = Date.now()
            const sinceLast = now - lastKickAtMsRef.current
            if (sinceLast < MIN_KICK_GAP_MS) {
                setWatchdogStatus({
                    enabled: true,
                    lastCheckAt: new Date(),
                    reason: 'throttled',
                    message: `${reason}:${Math.round((MIN_KICK_GAP_MS - sinceLast) / 1000)}s_remaining`,
                })
                return
            }

            lastKickAtMsRef.current = now
            setWatchdogStatus({
                enabled: true,
                lastCheckAt: new Date(),
                lastKickAt: new Date(),
                reason: 'kicked',
                message: reason,
            })

            try {
                await powerSync.disconnect()
                await powerSync.connect(new Connector())
            } catch (e: unknown) {
                if (disposed) return
                const message = e instanceof Error ? e.message : 'unknown_error'
                setWatchdogStatus({
                    enabled: true,
                    lastCheckAt: new Date(),
                    lastKickAt: new Date(),
                    reason: 'error',
                    message,
                })
            }
        }

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
            if (next === 'active') check()
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

