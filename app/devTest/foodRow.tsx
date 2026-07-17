// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function FoodRowRoute() {
    if (__DEV__) {
        const FoodRowTest = require('@/components/devTest/FoodRowTest').default
        return <FoodRowTest />
    }
    return null
}
