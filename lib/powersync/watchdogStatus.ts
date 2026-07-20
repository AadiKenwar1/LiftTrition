export type WatchdogReason =
    | 'disabled'
    | 'background'
    | 'no_session'
    | 'disconnected'
    | 'stale_last_sync'
    | 'throttled'
    | 'kicked'
    | 'error'
    | 'currently_healthy'

export type WatchdogStatus = {
    enabled: boolean
    lastCheckAt?: Date
    lastKickAt?: Date
    reason: WatchdogReason
    message?: string
}

let status: WatchdogStatus = {
    enabled: false,
    reason: 'disabled',
}

type Listener = (next: WatchdogStatus) => void
const listeners = new Set<Listener>()

export function getWatchdogStatus(): WatchdogStatus {
    return status
}

export function setWatchdogStatus(partial: Partial<WatchdogStatus>) {
    status = { ...status, ...partial }
    for (const l of listeners) l(status)
}

export function subscribeWatchdogStatus(listener: Listener) {
    listeners.add(listener)
    listener(status)
    return () => { listeners.delete(listener) }
}

