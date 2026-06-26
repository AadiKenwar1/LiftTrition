// Dev-only route. The `if (__DEV__)` block (and its require) is stripped by Metro in production,
// so the DevHub component and everything it imports never ship.
export default function DevHubRoute() {
    if (__DEV__) {
        const DevHub = require('@/components/devTest/DevHub').default
        return <DevHub />
    }
    return null
}
