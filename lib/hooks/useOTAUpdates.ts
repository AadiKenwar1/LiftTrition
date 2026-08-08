import * as Sentry from '@sentry/react-native'
import * as Updates from 'expo-updates'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

/** Minimum gap between foreground server checks; the cold-boot check is done natively by expo-updates. */
const FOREGROUND_CHECK_MIN_INTERVAL_MS = 5 * 60_000

// True only where an update can actually be fetched and applied: release builds with
// expo-updates configured. checkForUpdateAsync/reloadAsync reject in dev and Expo Go.
function canUseOTAUpdates(): boolean {
    return !__DEV__ && Updates.isEnabled
}

// Asks the server for a newer update and downloads it; failures (offline, CDN errors) are
// breadcrumbed and swallowed — the next foreground past the throttle window retries.
async function checkAndFetchUpdate(): Promise<void> {
    try {
        const result = await Updates.checkForUpdateAsync()
        if (result.isAvailable) await Updates.fetchUpdateAsync()
    } catch (error) {
        Sentry.addBreadcrumb({
            category: 'ota-updates',
            level: 'warning',
            message: 'check_or_fetch_failed',
            data: { error: String(error) },
        })
    }
}

/**
 * Applies OTA updates in the session they are found instead of two cold starts later.
 *
 * - expo-updates natively checks and downloads at cold boot but only launches the result on
 *   the NEXT boot; this hook reloads into a fully downloaded update as soon as it lands.
 * - That native check runs only at cold boot, so foregrounding re-checks the server,
 *   throttled to one request per FOREGROUND_CHECK_MIN_INTERVAL_MS.
 */
export function useOTAUpdates(): void {
    const { isUpdatePending } = Updates.useUpdates()
    // Mount counts as a check — the native cold-boot check has just run.
    const lastCheckAtRef = useRef(Date.now())

    // Swap to the downloaded bundle the moment it is ready.
    useEffect(() => {
        if (!canUseOTAUpdates() || !isUpdatePending) return
        Updates.reloadAsync().catch((error) => {
            // A downloaded update that refuses to launch is unexpected and actionable, unlike
            // the routine network failures above — so this one is a real Sentry event.
            Sentry.captureException(error, { tags: { area: 'ota-updates' } })
        })
    }, [isUpdatePending])

    // Foreground re-check; background/inactive transitions never trigger network work.
    useEffect(() => {
        if (!canUseOTAUpdates()) return
        const sub = AppState.addEventListener('change', (state) => {
            if (state !== 'active') return
            const now = Date.now()
            if (now - lastCheckAtRef.current < FOREGROUND_CHECK_MIN_INTERVAL_MS) return
            // Recorded before the async work so a failed check still consumes the window
            // (no request hammering while offline).
            lastCheckAtRef.current = now
            void checkAndFetchUpdate()
        })
        return () => sub.remove()
    }, [])
}
