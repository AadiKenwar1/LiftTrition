// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ModeHeaderTestRoute() {
    if (__DEV__) {
        const ModeHeaderTest = require('@/components/devTest/ModeHeaderTest').default
        return <ModeHeaderTest />
    }
    return null
}
