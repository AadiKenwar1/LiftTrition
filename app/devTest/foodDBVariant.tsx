// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function FoodDBVariantRoute() {
    if (__DEV__) {
        const FoodDBModalPreview = require('@/components/devTest/FoodDBModalPreview').default
        return <FoodDBModalPreview />
    }
    return null
}
