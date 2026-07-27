// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ModeHeaderLiveRoute() {
    if (__DEV__) {
        const ModeHeaderLive = require('@/components/devTest/ModeHeaderLive').default
        return <ModeHeaderLive />
    }
    return null
}
