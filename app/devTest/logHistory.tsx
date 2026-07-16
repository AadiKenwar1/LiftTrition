// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function LogHistoryListTestRoute() {
    if (__DEV__) {
        const LogHistoryListTest = require('@/components/devTest/LogHistoryListTest').default
        return <LogHistoryListTest />
    }
    return null
}
