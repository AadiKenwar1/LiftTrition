// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function SuggestSetTestRoute() {
    if (__DEV__) {
        const SuggestSetTest = require('@/components/devTest/SuggestSetTest').default
        return <SuggestSetTest />
    }
    return null
}
