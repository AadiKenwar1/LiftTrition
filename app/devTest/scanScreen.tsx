// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ScanScreenTestRoute() {
    if (__DEV__) {
        const ScanScreenTest = require('@/components/devTest/ScanScreenTest').default
        return <ScanScreenTest />
    }
    return null
}
