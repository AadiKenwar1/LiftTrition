// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ProgressionLabRoute() {
    if (__DEV__) {
        const ProgressionLabTest = require('@/components/devTest/ProgressionLabTest').default
        return <ProgressionLabTest />
    }
    return null
}
