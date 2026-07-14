// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function LoadingScreenTestRoute() {
    if (__DEV__) {
        const LoadingScreenTest = require('@/components/devTest/LoadingScreenTest').default
        return <LoadingScreenTest />
    }
    return null
}
