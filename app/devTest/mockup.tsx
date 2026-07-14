// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function MockupRoute() {
    if (__DEV__) {
        const MockupHost = require('@/components/devTest/mockups/MockupHost').default
        return <MockupHost />
    }
    return null
}
