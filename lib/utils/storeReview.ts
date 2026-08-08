import * as StoreReview from 'expo-store-review'

/**
 * Hands the user off to the OS review sheet when it can appear, and does nothing at all when it can't.
 *
 * requestReview() reports nothing back: resolving does not mean the sheet was shown (Apple quotas it to 3
 * displays per user per 365 days and may decline silently) and never means anything was rated. No caller
 * may claim a rating happened. Every failure here is the same dead end — no native module, no store URL, or
 * the app backgrounded out of a presentable window scene — and the ask is optional, so none of it is
 * surfaced to the user.
 */
export async function openRatingPrompt(): Promise<void> {
    try {
        if (!(await StoreReview.hasAction())) return
        await StoreReview.requestReview()
    } catch {
        // Intentionally silent — see above.
    }
}
