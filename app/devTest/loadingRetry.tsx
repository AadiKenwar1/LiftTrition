// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function LoadingRetryTestRoute() {
    if (__DEV__) {
        const LoadingRetryTest = require('@/components/devTest/LoadingRetryTest').default
        return <LoadingRetryTest />
    }
    return null
}
