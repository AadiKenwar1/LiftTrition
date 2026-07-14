// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function NumberParsingTestRoute() {
    if (__DEV__) {
        const NumberParsingTest = require('@/components/devTest/NumberParsingTest').default
        return <NumberParsingTest />
    }
    return null
}
