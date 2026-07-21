// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function DynamicTypeTestRoute() {
    if (__DEV__) {
        const DynamicTypeTest = require('@/components/devTest/DynamicTypeTest').default
        return <DynamicTypeTest />
    }
    return null
}
