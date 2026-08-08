// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function RatingScreenRoute() {
    if (__DEV__) {
        const RatingScreenTest = require('@/components/devTest/RatingScreenTest').default
        return <RatingScreenTest />
    }
    return null
}
