import { Alert } from 'react-native'
import { openRatingPrompt } from '../storeReview'

/**
 * expo-store-review resolves a native module at import time, and jest.setup.js does not mock it, so this
 * mock is mandatory rather than a convenience. Both functions are faked per test.
 */
jest.mock('expo-store-review', () => ({
    hasAction: jest.fn(),
    requestReview: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const StoreReview = require('expo-store-review') as { hasAction: jest.Mock; requestReview: jest.Mock }

describe('openRatingPrompt', () => {
    let alertSpy: jest.SpyInstance

    beforeEach(() => {
        StoreReview.hasAction.mockReset()
        StoreReview.requestReview.mockReset()
        StoreReview.requestReview.mockResolvedValue(undefined)
        alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    })

    afterEach(() => {
        alertSpy.mockRestore()
    })

    // The one happy path. Ten of these would prove nothing the first does not.
    it('requests the sheet when the platform reports an available action', async () => {
        StoreReview.hasAction.mockResolvedValue(true)

        await openRatingPrompt()

        expect(StoreReview.requestReview).toHaveBeenCalledTimes(1)
    })

    // Web, and TestFlight without an ios.appStoreUrl — the sheet cannot appear, so we must not ask for it.
    it('never requests the sheet when the platform reports no action', async () => {
        StoreReview.hasAction.mockResolvedValue(false)

        await openRatingPrompt()

        expect(StoreReview.requestReview).not.toHaveBeenCalled()
    })

    it('treats a rejected capability check as no action', async () => {
        StoreReview.hasAction.mockRejectedValue(new Error('native module unavailable'))

        await expect(openRatingPrompt()).resolves.toBeUndefined()
        expect(StoreReview.requestReview).not.toHaveBeenCalled()
    })

    // Pins that the awaited capability check sits INSIDE the try, not before it.
    it('catches a synchronous throw from the capability check', async () => {
        StoreReview.hasAction.mockImplementation(() => {
            throw new Error('module missing')
        })

        await expect(openRatingPrompt()).resolves.toBeUndefined()
        expect(StoreReview.requestReview).not.toHaveBeenCalled()
    })

    // The real iOS rejection: MissingCurrentWindowSceneException, thrown when the app has no
    // foreground-active window scene (backgrounded mid-tap).
    it('swallows a rejected review request', async () => {
        StoreReview.hasAction.mockResolvedValue(true)
        StoreReview.requestReview.mockRejectedValue(new Error('MissingCurrentWindowSceneException'))

        await expect(openRatingPrompt()).resolves.toBeUndefined()
    })

    // The regression guard: the dev prototype shows an Alert naming app.json and TestFlight when the
    // sheet cannot open. That copy must never reach a user, so no failure path may surface anything.
    it('surfaces nothing to the user on any failure', async () => {
        const failures: (() => void)[] = [
            () => StoreReview.hasAction.mockResolvedValue(false),
            () => StoreReview.hasAction.mockRejectedValue(new Error('unavailable')),
            () => {
                StoreReview.hasAction.mockImplementation(() => {
                    throw new Error('module missing')
                })
            },
            () => {
                StoreReview.hasAction.mockResolvedValue(true)
                StoreReview.requestReview.mockRejectedValue(new Error('no window scene'))
            },
        ]

        for (const setUpFailure of failures) {
            StoreReview.hasAction.mockReset()
            StoreReview.requestReview.mockReset()
            StoreReview.requestReview.mockResolvedValue(undefined)
            setUpFailure()

            await openRatingPrompt()
        }

        expect(alertSpy).not.toHaveBeenCalled()
    })

    // The screen calls this as `void openRatingPrompt()`, so an escaping rejection is an unhandled
    // promise rejection rather than a caught error.
    it.each([
        ['the capability check rejects', () => StoreReview.hasAction.mockRejectedValue(new Error('x'))],
        [
            'the capability check throws',
            () =>
                StoreReview.hasAction.mockImplementation(() => {
                    throw new Error('x')
                }),
        ],
        [
            'the review request rejects',
            () => {
                StoreReview.hasAction.mockResolvedValue(true)
                StoreReview.requestReview.mockRejectedValue(new Error('x'))
            },
        ],
    ])('resolves to undefined when %s', async (_label, setUpFailure) => {
        setUpFailure()

        await expect(openRatingPrompt()).resolves.toBeUndefined()
    })

    // Without this, the "swallows a rejected review request" case passes vacuously against an
    // implementation that forgot to await — the rejection would escape after the assertion ran.
    it('waits for the review request to settle before resolving', async () => {
        StoreReview.hasAction.mockResolvedValue(true)
        let releaseSheet: () => void = () => {}
        StoreReview.requestReview.mockReturnValue(
            new Promise<void>((resolve) => {
                releaseSheet = resolve
            })
        )
        let settled = false

        const pending = openRatingPrompt().then(() => {
            settled = true
        })
        await Promise.resolve()
        expect(settled).toBe(false)

        releaseSheet()
        await pending
        expect(settled).toBe(true)
    })

    // No module-level "already asked" memo. That is only safe because onboarding runs once per account;
    // a caller outside onboarding would owe its own persisted flag.
    it('asks the platform again on every call', async () => {
        StoreReview.hasAction.mockResolvedValue(true)

        await openRatingPrompt()
        await openRatingPrompt()

        expect(StoreReview.hasAction).toHaveBeenCalledTimes(2)
        expect(StoreReview.requestReview).toHaveBeenCalledTimes(2)
    })
})
