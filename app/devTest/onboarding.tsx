// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function OnboardingFlowTestRoute() {
    if (__DEV__) {
        const OnboardingFlowTest = require('@/components/devTest/OnboardingFlowTest').default
        return <OnboardingFlowTest />
    }
    return null
}
