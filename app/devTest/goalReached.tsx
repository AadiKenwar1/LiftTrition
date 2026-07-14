// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function GoalReachedTestRoute() {
    if (__DEV__) {
        const GoalReachedTest = require('@/components/devTest/GoalReachedTest').default
        return <GoalReachedTest />
    }
    return null
}
