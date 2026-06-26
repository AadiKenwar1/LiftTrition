// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function LineChartTestRoute() {
    if (__DEV__) {
        const LineChartTest = require('@/components/devTest/LineChartTest').default
        return <LineChartTest />
    }
    return null
}
