// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function PaceFlowLauncherRoute() {
    if (__DEV__) {
        const PaceFlowLauncher = require('@/components/devTest/PaceFlowLauncher').default
        return <PaceFlowLauncher />
    }
    return null
}
