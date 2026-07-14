// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function EditPhotoVariantRoute() {
    if (__DEV__) {
        const EditPhotoModalHost = require('@/components/devTest/EditPhotoModalHost').default
        return <EditPhotoModalHost />
    }
    return null
}
