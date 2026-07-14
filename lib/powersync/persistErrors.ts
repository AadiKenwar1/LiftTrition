import { Alert } from 'react-native'
import * as Sentry from '@sentry/react-native'

/**
 * One owner for "a local write failed" across every context. Optimistic UI means
 * React state (what the user sees) can diverge from SQLite (what survives a
 * restart); a swallowed failure lets that divergence ship silently. This reports
 * the failure to Sentry, tells the user (throttled), and — during normal use —
 * rolls the UI back to disk truth by re-running the owning context's load.
 *
 * Onboarding is the exception: the user's answers accumulate in memory across
 * several screens and are only written to disk piecemeal, so disk is NOT the
 * source of truth yet. Reloading there would wipe everything since the last
 * successful save, so onboarding failures skip the rollback and rely on retry.
 */

export type PersistScope = 'nutrition' | 'workout' | 'settings'
export type PersistSeverity = 'normal' | 'high'

interface ReportOptions {
    reload?: () => void
    severity?: PersistSeverity
    onboarding?: boolean
}

/** Exponential backoff for the settings retry loop: 1s, 2s, 4s… capped at 30s. */
export function persistBackoffMs(attempt: number): number {
    return Math.min(1000 * 2 ** attempt, 30000)
}

// One alert window across all failures so a burst doesn't become an alert storm.
const ALERT_THROTTLE_MS = 8000
let lastAlertAt = -Infinity

const ALERT_COPY: Record<PersistSeverity, { title: string; message: string }> = {
    normal: {
        title: "Couldn't save your change",
        message: "Something went wrong saving your change. We'll keep trying.",
    },
    high: {
        title: "Couldn't save your settings",
        message: "Your changes didn't save. Check your phone's storage and try again.",
    },
}

export function reportPersistFailure(scope: PersistScope, error: unknown, opts: ReportOptions = {}): void {
    const { reload, severity = 'normal', onboarding = false } = opts

    Sentry.captureException(error, { tags: { area: 'persist-failure', scope } })

    // During onboarding, answers live in memory and reach disk piecemeal, so disk
    // is not yet the source of truth: never roll back, and stay silent (retry
    // handles it; the final commit is gated separately). Sentry still records it.
    if (onboarding) return

    reload?.()

    const now = Date.now()
    if (now - lastAlertAt >= ALERT_THROTTLE_MS) {
        lastAlertAt = now
        const copy = ALERT_COPY[severity]
        Alert.alert(copy.title, copy.message)
    }
}
