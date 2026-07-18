// Dev-only route — stripped from production builds by Metro (see the __DEV__ guard).
export default function NotificationsTestRoute() {
    if (__DEV__) {
        const NotificationsTest = require('@/components/devTest/NotificationsTest').default
        return <NotificationsTest />
    }
    return null
}
