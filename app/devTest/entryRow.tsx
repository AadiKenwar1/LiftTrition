// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function EntryRowTestRoute() {
    if (__DEV__) {
        const EntryRowTest = require('@/components/devTest/EntryRowTest').default
        return <EntryRowTest />
    }
    return null
}
