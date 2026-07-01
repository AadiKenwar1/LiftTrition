// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function OnboardingPageRoute() {
    if (__DEV__) {
        const OnboardingVersionsList = require('@/components/devTest/onboarding/OnboardingVersionsList').default
        return <OnboardingVersionsList />
    }
    return null
}
