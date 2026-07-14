// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function ColorHueTestRoute() {
    if (__DEV__) {
        const ColorHueTest = require('@/components/devTest/ColorHueTest').default
        return <ColorHueTest />
    }
    return null
}
