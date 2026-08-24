// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function PlanInfoPopupTestRoute() {
    if (__DEV__) {
        const PlanInfoPopupTest = require('@/components/devTest/PlanInfoPopupTest').default
        return <PlanInfoPopupTest />
    }
    return null
}
