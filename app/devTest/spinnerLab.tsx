// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function SpinnerLabRoute() {
    if (__DEV__) {
        const SpinnerLabTest = require('@/components/devTest/SpinnerLabTest').default
        return <SpinnerLabTest />
    }
    return null
}
