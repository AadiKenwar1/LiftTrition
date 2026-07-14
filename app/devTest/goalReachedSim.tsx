// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function GoalReachedSimTestRoute() {
    if (__DEV__) {
        const GoalReachedSimTest = require('@/components/devTest/GoalReachedSimTest').default
        return <GoalReachedSimTest />
    }
    return null
}
