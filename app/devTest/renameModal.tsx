// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function RenameModalTestRoute() {
    if (__DEV__) {
        const RenameModalTest = require('@/components/devTest/RenameModalTest').default
        return <RenameModalTest />
    }
    return null
}
