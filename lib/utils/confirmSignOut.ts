import { isUploadFlushError, UploadFlushNotConnectedError } from '@/lib/powersync/FlushUploads'
import * as Sentry from '@sentry/react-native'
import { Alert } from 'react-native'

export interface ConfirmSignOutOptions {
    /** True while a previous attempt is still in flight — guards against a double-tap re-opening the confirm. */
    loading: boolean
    /** Toggles the caller's loading flag around both the normal and forced sign-out attempts. */
    setLoading: (loading: boolean) => void
    /** Normal, flush-gated sign-out (waits for pending uploads to drain before clearing local data). */
    signOut: () => Promise<void>
    /** Skips the upload flush — only invoked after the user explicitly accepts losing unsynced data. */
    forceSignOut: () => Promise<void>
}

/**
 * Shared confirm-then-sign-out flow (extracted from profile.tsx so onboarding's sign-out escape stays
 * behaviorally identical): shows the confirm Alert, calls `signOut` on confirm, and on an upload-flush
 * failure offers an offline/still-syncing fallback that force-signs-out via `forceSignOut`. Any other
 * failure surfaces a generic error Alert.
 */
export function confirmSignOut({ loading, setLoading, signOut, forceSignOut }: ConfirmSignOutOptions): void {
    if (loading) return

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
                setLoading(true)
                try {
                    await signOut()
                } catch (error: unknown) {
                    if (isUploadFlushError(error)) {
                        const offline = error instanceof UploadFlushNotConnectedError
                        // Lead-up trail only — this fires before the user's Force/Cancel choice,
                        // and Cancel means no data was lost, so it isn't a capturable failure yet.
                        Sentry.addBreadcrumb({ category: 'sign-out', level: 'info', message: offline ? 'sign_out_offline' : 'sign_out_still_syncing' })
                        const title = offline ? "You're offline" : 'Still syncing'
                        const message = offline ? 'Sign out anyway? Unsynced data will be lost.' : "We're still uploading your data. You can wait and try again, or force sign out (unsynced data may be lost)."
                        Alert.alert(title, message, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Force sign out',
                                style: 'destructive',
                                onPress: async () => {
                                    setLoading(true)
                                    try {
                                        await forceSignOut()
                                    } catch (e: unknown) {
                                        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to force sign out')
                                    } finally {
                                        setLoading(false)
                                    }
                                },
                            },
                        ])
                    } else {
                        // Genuinely unexpected sign-out failure (e.g. supabase.auth.signOut error,
                        // disconnectAndClearPowerSync failing on the normal path) — real ops signal.
                        Sentry.captureException(error, { tags: { area: 'sign-out-failure' } })
                        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out')
                    }
                } finally {
                    setLoading(false)
                }
            },
        },
    ])
}
