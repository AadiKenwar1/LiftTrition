// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function PaceWizard4Route() {
    if (__DEV__) {
        const Step = require('@/components/devTest/paceWizard/adjustNutrition4').default
        return <Step />
    }
    return null
}
