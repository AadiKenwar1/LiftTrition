// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ProgressInlineTestRoute() {
    if (__DEV__) {
        const ProgressInlineTest = require('@/components/devTest/ProgressInlineTest').default
        return <ProgressInlineTest />
    }
    return null
}
