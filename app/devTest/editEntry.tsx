// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function EditEntryTestRoute() {
    if (__DEV__) {
        const EditEntryTest = require('@/components/devTest/EditEntryTest').default
        return <EditEntryTest />
    }
    return null
}
