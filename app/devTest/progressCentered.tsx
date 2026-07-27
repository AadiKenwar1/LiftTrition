// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ProgressCenteredTestRoute() {
    if (__DEV__) {
        const ProgressCenteredTest = require('@/components/devTest/ProgressCenteredTest').default
        return <ProgressCenteredTest />
    }
    return null
}
