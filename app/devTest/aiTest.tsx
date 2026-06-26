// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function AiTestRoute() {
    if (__DEV__) {
        const AiTest = require('@/components/devTest/AiTest').default
        return <AiTest />
    }
    return null
}
