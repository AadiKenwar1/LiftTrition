// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function DateSheetTestRoute() {
    if (__DEV__) {
        const DateSheetTest = require('@/components/devTest/DateSheetTest').default
        return <DateSheetTest />
    }
    return null
}
