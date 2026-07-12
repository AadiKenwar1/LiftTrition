// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function CalendarTestRoute() {
    if (__DEV__) {
        const CalendarTest = require('@/components/devTest/CalendarTest').default
        return <CalendarTest />
    }
    return null
}
