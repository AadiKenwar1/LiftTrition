// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function OnboardingPreviewRoute() {
    if (__DEV__) {
        const OnboardingVersionPreview = require('@/components/devTest/onboarding/OnboardingVersionPreview').default
        return <OnboardingVersionPreview />
    }
    return null
}
