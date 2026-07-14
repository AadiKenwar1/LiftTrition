// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function AddNutritionTestRoute() {
    if (__DEV__) {
        const AddNutritionTest = require('@/components/devTest/AddNutritionTest').default
        return <AddNutritionTest />
    }
    return null
}
