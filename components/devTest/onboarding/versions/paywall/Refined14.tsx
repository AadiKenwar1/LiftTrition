import PaywallRefined from './Refined'

/**
 * Dev-only paywall variant — identical to the Refined paywall but with a 14-day trial, to compare
 * 7- vs 14-day framing side by side (onboardingresearch.md line 14). The real trial length is a
 * RevenueCat config change, not code; this only swaps the on-screen copy.
 */
export default function PaywallRefined14() {
    return <PaywallRefined trialDays={14} />
}
