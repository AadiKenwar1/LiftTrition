// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function AddNutritionVariantRoute() {
    if (__DEV__) {
        const AddNutritionModalHost = require('@/components/devTest/AddNutritionModalHost').default
        return <AddNutritionModalHost />
    }
    return null
}
