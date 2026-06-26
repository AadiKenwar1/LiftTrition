// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function BarChartTestRoute() {
    if (__DEV__) {
        const BarChartTest = require('@/components/devTest/BarChartTest').default
        return <BarChartTest />
    }
    return null
}
