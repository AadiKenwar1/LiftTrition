// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function PaceWizard2Route() {
    if (__DEV__) {
        const Step = require('@/components/devTest/paceWizard/adjustNutrition2').default
        return <Step />
    }
    return null
}
