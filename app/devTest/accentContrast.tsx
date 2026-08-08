// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function AccentContrastTestRoute() {
    if (__DEV__) {
        const AccentContrastTest = require('@/components/devTest/AccentContrastTest').default
        return <AccentContrastTest />
    }
    return null
}
