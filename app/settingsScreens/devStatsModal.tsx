// Dev-only route. The `if (__DEV__)` block (and its require) is stripped by Metro in production,
// so DevStatsScreen and everything it imports (auth, PowerSync, Supabase) never ship or load.
export default function DevStatsModalRoute() {
    if (__DEV__) {
        const DevStatsScreen = require('@/components/devTest/DevStatsModal').default
        return <DevStatsScreen />
    }
    return null
}
