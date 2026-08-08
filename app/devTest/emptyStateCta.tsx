// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function EmptyStateCtaTestRoute() {
    if (__DEV__) {
        const EmptyStateCtaTest = require('@/components/devTest/EmptyStateCtaTest').default
        return <EmptyStateCtaTest />
    }
    return null
}
