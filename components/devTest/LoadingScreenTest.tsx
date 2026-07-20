import { AppLoadingScreen } from '@/components/GuardComponents/AppLoadingScreen'
import { useState } from 'react'
import { Field, Segmented } from './DevControls'
import MockupShell from './mockups/MockupShell'

const MESSAGES = {
    profile: 'Loading your profile...',
    sync: 'Syncing data...',
    long: 'Hang tight — getting everything ready for your first workout...',
} as const

type MessageKey = keyof typeof MESSAGES

// Dev harness for AppLoadingScreen: preview each caption plus the error state (retry + sign-out links) in light/dark.
export default function LoadingScreenTest() {
    const [messageKey, setMessageKey] = useState<MessageKey>('profile')
    const [loadFailed, setLoadFailed] = useState(false)

    const controls = (
        <>
            <Field label="Message">
                <Segmented
                    value={messageKey}
                    onChange={setMessageKey}
                    options={[
                        { label: 'Profile', value: 'profile' },
                        { label: 'Syncing', value: 'sync' },
                        { label: 'Long copy', value: 'long' },
                    ]}
                />
            </Field>
            <Field label="State">
                <Segmented
                    value={loadFailed ? 'error' : 'loading'}
                    onChange={(v) => setLoadFailed(v === 'error')}
                    options={[
                        { label: 'Loading', value: 'loading' },
                        { label: 'Load failed', value: 'error' },
                    ]}
                />
            </Field>
        </>
    )

    return (
        <MockupShell controls={controls}>
            <AppLoadingScreen
                key={`${messageKey}-${loadFailed}`}
                message={MESSAGES[messageKey]}
                loadFailed={loadFailed}
                onRetry={() => {}}
                onSignOut={() => {}}
            />
        </MockupShell>
    )
}
