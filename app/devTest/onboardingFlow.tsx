// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function OnboardingFlowRoute() {
    if (__DEV__) {
        const FlowRunner = require('@/components/devTest/onboarding/FlowRunner').default
        return <FlowRunner />
    }
    return null
}
