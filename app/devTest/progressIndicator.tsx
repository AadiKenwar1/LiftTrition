// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ProgressIndicatorTestRoute() {
    if (__DEV__) {
        const ProgressIndicatorTest = require('@/components/devTest/ProgressIndicatorTest').default
        return <ProgressIndicatorTest />
    }
    return null
}
