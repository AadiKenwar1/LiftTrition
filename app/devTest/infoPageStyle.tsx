// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function InfoPageStyleTestRoute() {
    if (__DEV__) {
        const InfoPageStyleTest = require('@/components/devTest/InfoPageStyleTest').default
        return <InfoPageStyleTest />
    }
    return null
}
