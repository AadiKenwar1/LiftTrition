// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function RatingRemovalTestRoute() {
    if (__DEV__) {
        const RatingRemovalTest = require('@/components/devTest/RatingRemovalTest').default
        return <RatingRemovalTest />
    }
    return null
}
