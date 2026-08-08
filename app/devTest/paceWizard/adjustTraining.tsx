// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function PaceWizardTrainingRoute() {
    if (__DEV__) {
        const Step = require('@/components/devTest/paceWizard/adjustTraining').default
        return <Step />
    }
    return null
}
