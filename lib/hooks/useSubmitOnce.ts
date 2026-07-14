import { useCallback, useRef, useState } from 'react'

/**
 * Single-flight guard for submit CTAs. A double-tap during a modal's closing
 * animation (or during an await) otherwise fires the handler twice — duplicate
 * entries, or two paid AI analyses. State alone is a frame too slow to catch a
 * real double-tap, so the block is a synchronous ref; `submitting` is the React
 * mirror for disabled styling.
 *
 * By default a guarded handler stays disabled after it completes — the assumption
 * is it navigated away and the screen is leaving. Pass { retryable: true } for
 * handlers that stay on-screen (e.g. the camera shutter) so they re-enable in a
 * finally, letting the action run again. `reset()` re-enables a default guard
 * manually — for a synchronous navigate that must re-arm on a later state change
 * (e.g. the camera "Use Photo" button after the user retakes).
 */

type GuardOptions = { retryable?: boolean }

export type SubmitGuard = <A extends unknown[]>(
    fn: (...args: A) => unknown,
    options?: GuardOptions,
) => (...args: A) => Promise<void>

export function useSubmitOnce(): [SubmitGuard, boolean, () => void] {
    const inFlight = useRef(false)
    const [submitting, setSubmitting] = useState(false)

    const reset = useCallback(() => {
        inFlight.current = false
        setSubmitting(false)
    }, [])

    const guard = useCallback<SubmitGuard>(
        (fn, options) =>
            async (...args) => {
                if (inFlight.current) return
                inFlight.current = true
                setSubmitting(true)
                try {
                    await fn(...args)
                } finally {
                    if (options?.retryable) reset()
                }
            },
        [reset],
    )

    return [guard, submitting, reset]
}
