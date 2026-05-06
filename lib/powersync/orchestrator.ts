import { Connector } from '@/lib/powersync/Connector'
import { powerSync } from '@/lib/powersync/system'
import { AppState } from 'react-native'

/** Who requested a PowerSync connection change (for logging / dev tools). */
export type PowerSyncReconnectReason =
    | 'auth_session'
    | 'auth_no_session'
    | 'auth_effect_cleanup'
    | 'sign_out_clear'
    | 'background_task'
    | 'watchdog_disconnected'
    | 'watchdog_stale_last_sync'

export type PowerSyncKickOutcome = 'ok' | 'throttled' | 'background' | 'error'

const MIN_KICK_GAP_MS = 10 * 60_000

/** Serialize connect / disconnect / kick so callers never overlap. */
let mutexChain: Promise<void> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = mutexChain.then(() => task())
    mutexChain = run.then(
        () => undefined,
        () => undefined
    )
    return run
}

let lastKickAtMs = 0

/** Milliseconds until another `kickPowerSync` is allowed (0 if kick is allowed now). */
export function getKickThrottleRemainingMs(): number {
    return Math.max(0, MIN_KICK_GAP_MS - (Date.now() - lastKickAtMs))
}

export type PowerSyncOrchestratorState = {
    lastError?: string
    lastAttemptReason?: PowerSyncReconnectReason | 'kick'
    lastAttemptAt?: Date
}

let orchestratorState: PowerSyncOrchestratorState = {}

export function getPowerSyncOrchestratorState(): PowerSyncOrchestratorState {
    return { ...orchestratorState }
}

/** Connect if not already connected (no disconnect). */
export async function ensurePowerSyncConnected(reason: PowerSyncReconnectReason): Promise<void> {
    try {
        await enqueue(async () => {
            orchestratorState = {
                ...orchestratorState,
                lastAttemptReason: reason,
                lastAttemptAt: new Date(),
                lastError: undefined,
            }
            if (powerSync.currentStatus.connected) return
            await powerSync.connect(new Connector())
        })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'unknown_error'
        orchestratorState = { ...orchestratorState, lastError: message }
        throw e
    }
}

/** Disconnect only (e.g. session lost). Does not clear local DB. */
export async function disconnectPowerSync(reason: PowerSyncReconnectReason): Promise<void> {
    try {
        await enqueue(async () => {
            orchestratorState = {
                ...orchestratorState,
                lastAttemptReason: reason,
                lastAttemptAt: new Date(),
                lastError: undefined,
            }
            await powerSync.disconnect()
        })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'unknown_error'
        orchestratorState = { ...orchestratorState, lastError: message }
        throw e
    }
}

/** Sign-out: disconnect and wipe local PowerSync DB (must be serialized with other ops). */
export async function disconnectAndClearPowerSync(): Promise<void> {
    try {
        await enqueue(async () => {
            orchestratorState = {
                ...orchestratorState,
                lastAttemptReason: 'sign_out_clear',
                lastAttemptAt: new Date(),
                lastError: undefined,
            }
            await powerSync.disconnectAndClear()
        })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'unknown_error'
        orchestratorState = { ...orchestratorState, lastError: message }
        throw e
    }
}

/**
 * Hard reconnect: disconnect then connect. Throttled and skipped when not active.
 * Watchdog / recovery paths should use this instead of calling disconnect/connect directly.
 */
export async function kickPowerSync(
    reason: 'watchdog_disconnected' | 'watchdog_stale_last_sync'
): Promise<PowerSyncKickOutcome> {
    if (AppState.currentState !== 'active') {
        return 'background'
    }

    const now = Date.now()
    if (now - lastKickAtMs < MIN_KICK_GAP_MS) {
        return 'throttled'
    }
    lastKickAtMs = now

    try {
        await enqueue(async () => {
            orchestratorState = {
                ...orchestratorState,
                lastAttemptReason: 'kick',
                lastAttemptAt: new Date(),
                lastError: undefined,
            }
            await powerSync.disconnect()
            await powerSync.connect(new Connector())
        })
        return 'ok'
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'unknown_error'
        orchestratorState = { ...orchestratorState, lastError: message }
        return 'error'
    }
}
