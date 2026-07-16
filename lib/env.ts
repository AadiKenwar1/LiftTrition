// Single home for every EXPO_PUBLIC_ env var the app consumes. Babel inlines
// these statically at build time, so each one must be written out as a full
// process.env.EXPO_PUBLIC_* expression — never indexed dynamically.
export const ENV = {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    POWERSYNC_URL: process.env.EXPO_PUBLIC_POWERSYNC_URL,
    REVENUECAT_API_KEY_IOS: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    REVENUECAT_API_KEY_ANDROID: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
} as const

// The app is unusable without these three; fail at startup with a nameable
// error instead of a broken client at first network call. RevenueCat keys and
// the Sentry DSN stay optional: billing already guards absence (BillingContext
// early-returns) and Sentry just disables itself.
export function assertRequiredEnv(): void {
    const missing = (['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'POWERSYNC_URL'] as const).filter((key) => !ENV[key])
    if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.map((key) => `EXPO_PUBLIC_${key}`).join(', ')} — check .env / EAS environment variables`)
    }
}
