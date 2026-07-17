// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function CombineRoute() {
    if (__DEV__) {
        const CombineTest = require('@/components/devTest/CombineTest').default
        return <CombineTest />
    }
    return null
}
