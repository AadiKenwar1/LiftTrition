// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function AddNutritionTeaserVariantRoute() {
    if (__DEV__) {
        const AddNutritionModalPreview = require('@/components/devTest/AddNutritionModalPreview').default
        return <AddNutritionModalPreview />
    }
    return null
}
