// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function AddNutritionTeaserRoute() {
    if (__DEV__) {
        const AddNutritionTeaserTest = require('@/components/devTest/AddNutritionTeaserTest').default
        return <AddNutritionTeaserTest />
    }
    return null
}
