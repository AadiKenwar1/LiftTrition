// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ScanCancelRoute() {
    if (__DEV__) {
        const ScanCancelTest = require('@/components/devTest/ScanCancelTest').default
        return <ScanCancelTest />
    }
    return null
}
