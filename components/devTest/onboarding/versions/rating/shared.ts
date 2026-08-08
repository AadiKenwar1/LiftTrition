import { useRouter } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import { useOnboardingFlow } from '../_shared/flowContext'

/**
 * Dev-only shared logic for the rating-ask versions. Every version makes the same single hand-off — only
 * Apple's sheet can accept a rating, so no version collects stars of its own — and differs purely in how the
 * ask looks. `hasAction()` gates `requestReview()` (the sheet can't appear on TestFlight / web / without a
 * store URL in app.json); those cases get an Alert stand-in so the beat stays walkable in a simulator.
 *
 * Before any of this ships, three constraints on requestReview() decide the production shape:
 *  · Apple rejects rating prompts fired DURING onboarding (guideline 5.6.3) — the shipping trigger belongs
 *    at a post-onboarding value moment (e.g. first completed workout), not in this flow slot.
 *  · The prompt is quota'd (3 per user per 365 days) and can silently not show, so Apple's HIG says not to
 *    trigger it from a button — a tap that produces nothing reads as broken. The compliant shape is the
 *    screen as priming with the prompt auto-fired; the CTA here exists so the dev preview is drivable.
 *  · There is no callback, which is why `prompted` records only that the sheet was requested — no version
 *    may thank the user or claim a rating happened.
 */
export async function openRatingPrompt() {
    try {
        if (await StoreReview.hasAction()) {
            await StoreReview.requestReview()
            return
        }
    } catch {
        // fall through to the stand-in — a failed capability check is the same dead end as an unavailable one
    }
    Alert.alert('Rate PLATES', "The system rating sheet can't open here — it's unavailable on TestFlight, on web, and without a store URL in app.json. In a released build this is where it appears.")
}

/**
 * Advance/rate handlers shared by every rating version. The sheet reports nothing back, so `prompted` only
 * records that it was shown — a version can soften its CTA to Continue but never claim a rating happened.
 */
export function useRatingBeat() {
    const router = useRouter()
    const flow = useOnboardingFlow()
    const [prompted, setPrompted] = useState(false)

    const advance = () => (flow ? flow.goNext() : router.back())
    const back = () => (flow ? flow.goBack() : router.back())
    const rate = async () => {
        if (prompted) {
            advance()
            return
        }
        await openRatingPrompt()
        setPrompted(true)
    }

    return { prompted, rate, advance, back }
}

/**
 * Fires the prompt once, on its own, a beat after the screen settles — the shape Apple's HIG actually asks
 * for ("don't use buttons or other controls to request feedback"), because the 3-per-365-days quota means a
 * tap can produce nothing and read as broken. The ref guard keeps a re-render from re-requesting.
 */
export function useAutoRatingPrompt(delayMs: number) {
    const fired = useRef(false)

    useEffect(() => {
        if (fired.current) return
        fired.current = true
        const t = setTimeout(() => void openRatingPrompt(), delayMs)
        return () => clearTimeout(t)
    }, [delayMs])
}
