// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function NutritionEntryMenuTestRoute() {
    if (__DEV__) {
        const NutritionEntryMenuTest = require('@/components/devTest/NutritionEntryMenuTest').default
        return <NutritionEntryMenuTest />
    }
    return null
}
