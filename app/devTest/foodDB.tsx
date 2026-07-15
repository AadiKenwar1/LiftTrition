// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function FoodDBTestRoute() {
    if (__DEV__) {
        const FoodDBTest = require('@/components/devTest/FoodDBTest').default
        return <FoodDBTest />
    }
    return null
}
