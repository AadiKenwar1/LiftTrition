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

export default function LoadingScreenTest() {
    const [messageKey, setMessageKey] = useState<MessageKey>('profile')

    const controls = (
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
    )

    return (
        <MockupShell controls={controls}>
            <AppLoadingScreen key={messageKey} message={MESSAGES[messageKey]} />
        </MockupShell>
    )
}
