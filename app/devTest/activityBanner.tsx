// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ActivityBannerTestRoute() {
    if (__DEV__) {
        const ActivityBannerTest = require('@/components/devTest/ActivityBannerTest').default
        return <ActivityBannerTest />
    }
    return null
}
