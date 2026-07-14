// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function EditPhotoLabRoute() {
    if (__DEV__) {
        const EditPhotoEntryTest = require('@/components/devTest/EditPhotoEntryTest').default
        return <EditPhotoEntryTest />
    }
    return null
}
