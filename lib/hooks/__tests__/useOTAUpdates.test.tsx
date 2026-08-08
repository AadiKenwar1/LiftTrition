// useOTAUpdates.test.tsx
// State & concurrency coverage for the in-session OTA update flow. The transition matrix:
// a reload fires exactly once per pending update and only in enabled builds (release +
// expo-updates on); foreground checks run only on 'active', only after the throttle window,
// and mount counts as a check (the native cold-boot check just ran). Every expo-updates
// call failure is swallowed — the app keeps running on the old bundle, and offline check
// failures never become Sentry error events (breadcrumbs at most).

// react-test-renderer ships no bundled types (@types/react-test-renderer not installed).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import React from 'react'

// Mutable expo-updates surface: `isEnabled` is read at effect time so tests flip it per
// case, and useUpdates re-reads its mock on every render. Every property defers lazily —
// the factory runs during hoisted imports, before these consts initialise (same seam as
// SyncWatchdog.test), so referencing them eagerly would hit the temporal dead zone.
const mockCheckForUpdateAsync = jest.fn()
const mockFetchUpdateAsync = jest.fn()
const mockReloadAsync = jest.fn()
const mockUseUpdates = jest.fn()
let mockIsEnabled = true
jest.mock('expo-updates', () => ({
    get isEnabled() {
        return mockIsEnabled
    },
    useUpdates: () => mockUseUpdates(),
    checkForUpdateAsync: () => mockCheckForUpdateAsync(),
    fetchUpdateAsync: () => mockFetchUpdateAsync(),
    reloadAsync: () => mockReloadAsync(),
}))

jest.mock('@sentry/react-native', () => ({
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
}))

// The hook renders nothing, so a minimal AppState stand-in is enough — no need to pull in
// the rest of react-native for this test (same seam as SyncWatchdog.test).
let appStateListener: ((state: string) => void) | undefined
const mockRemove = jest.fn()
const mockAddEventListener = jest.fn((_event: string, cb: (state: string) => void) => {
    appStateListener = cb
    return { remove: mockRemove }
})
jest.mock('react-native', () => ({
    AppState: {
        currentState: 'active',
        addEventListener: (...args: [string, (state: string) => void]) => mockAddEventListener(...args),
    },
}))

import * as Sentry from '@sentry/react-native'
import { useOTAUpdates } from '../useOTAUpdates'

function Probe() {
    useOTAUpdates()
    return null
}

const T0 = new Date(2026, 6, 31, 12, 0, 0)
/** Mirrors FOREGROUND_CHECK_MIN_INTERVAL_MS in useOTAUpdates.ts — a deliberate literal so a behaviour change breaks a test. */
const WINDOW_MS = 5 * 60_000

let tree: any

// Mounts the probe inside async act so mount effects (reload check, listener registration) settle.
async function mount() {
    await act(async () => {
        tree = create(<Probe />)
    })
}

// Re-renders the probe so useUpdates' new mock value flows into the hook.
async function rerender() {
    await act(async () => {
        tree.update(<Probe />)
    })
}

// Fires an AppState transition and flushes the async check/fetch chain it may start.
async function fireAppState(state: string) {
    await act(async () => {
        appStateListener?.(state)
    })
}

describe('useOTAUpdates', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()
        jest.setSystemTime(T0)
        // jest-expo runs with __DEV__ true; the hook is a release-build feature, so the
        // default here is the production path and the dev case flips it back explicitly.
        ;(globalThis as any).__DEV__ = false
        mockIsEnabled = true
        appStateListener = undefined
        mockUseUpdates.mockReturnValue({ isUpdatePending: false })
        mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: false })
        mockFetchUpdateAsync.mockResolvedValue({})
        mockReloadAsync.mockResolvedValue(undefined)
    })

    afterEach(() => {
        jest.useRealTimers()
        ;(globalThis as any).__DEV__ = true
    })

    describe('applying a downloaded update', () => {
        it('reloads into an update that is already downloaded at mount', async () => {
            mockUseUpdates.mockReturnValue({ isUpdatePending: true })
            await mount()
            expect(mockReloadAsync).toHaveBeenCalledTimes(1)
        })

        it('reloads when a pending update lands after mount', async () => {
            await mount()
            expect(mockReloadAsync).not.toHaveBeenCalled()

            mockUseUpdates.mockReturnValue({ isUpdatePending: true })
            await rerender()
            expect(mockReloadAsync).toHaveBeenCalledTimes(1)
        })

        it('does not reload again on re-renders while the update stays pending', async () => {
            mockUseUpdates.mockReturnValue({ isUpdatePending: true })
            await mount()
            await rerender()
            await rerender()
            expect(mockReloadAsync).toHaveBeenCalledTimes(1)
        })

        it('captures a reload failure instead of throwing', async () => {
            mockReloadAsync.mockRejectedValue(new Error('corrupt bundle'))
            mockUseUpdates.mockReturnValue({ isUpdatePending: true })
            await mount()
            expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        })
    })

    describe('foreground re-check', () => {
        it('checks and fetches when foregrounded past the throttle window with an update available', async () => {
            mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true })
            await mount()

            jest.setSystemTime(new Date(T0.getTime() + WINDOW_MS))
            await fireAppState('active')

            expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1)
            expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1)
        })

        it('does not fetch when the server has nothing newer', async () => {
            mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: false })
            await mount()

            jest.setSystemTime(new Date(T0.getTime() + WINDOW_MS))
            await fireAppState('active')

            expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1)
            expect(mockFetchUpdateAsync).not.toHaveBeenCalled()
        })

        it('skips the foreground check right after cold boot (the native layer just checked)', async () => {
            await mount()
            await fireAppState('active')
            expect(mockCheckForUpdateAsync).not.toHaveBeenCalled()
        })

        it('throttles rapid foregrounds to one check per window', async () => {
            await mount()

            jest.setSystemTime(new Date(T0.getTime() + WINDOW_MS))
            await fireAppState('active')
            await fireAppState('active')
            expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1)

            jest.setSystemTime(new Date(T0.getTime() + 2 * WINDOW_MS))
            await fireAppState('active')
            expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(2)
        })

        it('ignores background and inactive transitions even past the window', async () => {
            await mount()
            jest.setSystemTime(new Date(T0.getTime() + WINDOW_MS))
            await fireAppState('background')
            await fireAppState('inactive')
            expect(mockCheckForUpdateAsync).not.toHaveBeenCalled()
        })

        it('swallows a failed check and retries only after the next window', async () => {
            mockCheckForUpdateAsync.mockRejectedValue(new Error('offline'))
            await mount()

            jest.setSystemTime(new Date(T0.getTime() + WINDOW_MS))
            await fireAppState('active')
            expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1)
            expect(mockFetchUpdateAsync).not.toHaveBeenCalled()
            // Offline foregrounds are routine — they must never become Sentry error events.
            expect(Sentry.captureException).not.toHaveBeenCalled()

            // The failed attempt consumed the window: an immediate re-foreground does not hammer.
            await fireAppState('active')
            expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1)

            jest.setSystemTime(new Date(T0.getTime() + 2 * WINDOW_MS))
            await fireAppState('active')
            expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(2)
        })

        it('does not start a second check while the first is still in flight', async () => {
            let resolveCheck: (result: { isAvailable: boolean }) => void = () => {}
            mockCheckForUpdateAsync.mockImplementation(
                () => new Promise((resolve) => { resolveCheck = resolve }),
            )
            await mount()

            jest.setSystemTime(new Date(T0.getTime() + WINDOW_MS))
            // Two 'active' transitions back-to-back before the first check resolves — a quick
            // background/foreground blip while the network call is still pending. The throttle
            // ref is written synchronously (before the await), so the second call sees it.
            act(() => {
                appStateListener?.('active')
                appStateListener?.('active')
            })
            expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1)

            // Let the in-flight check settle so it doesn't leak into the next test.
            await act(async () => {
                resolveCheck({ isAvailable: false })
            })
        })

        it('swallows a failed fetch without reloading', async () => {
            mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true })
            mockFetchUpdateAsync.mockRejectedValue(new Error('cdn 500'))
            await mount()

            jest.setSystemTime(new Date(T0.getTime() + WINDOW_MS))
            await fireAppState('active')

            expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1)
            expect(mockReloadAsync).not.toHaveBeenCalled()
            expect(Sentry.captureException).not.toHaveBeenCalled()
        })
    })

    describe('disabled environments', () => {
        it('does nothing in dev builds', async () => {
            ;(globalThis as any).__DEV__ = true
            mockUseUpdates.mockReturnValue({ isUpdatePending: true })
            await mount()
            expect(mockReloadAsync).not.toHaveBeenCalled()
            expect(mockAddEventListener).not.toHaveBeenCalled()
        })

        it('does nothing when expo-updates is disabled (Expo Go / dev client)', async () => {
            mockIsEnabled = false
            mockUseUpdates.mockReturnValue({ isUpdatePending: true })
            await mount()
            expect(mockReloadAsync).not.toHaveBeenCalled()
            expect(mockAddEventListener).not.toHaveBeenCalled()
        })
    })

    describe('cleanup', () => {
        it('removes the AppState subscription on unmount', async () => {
            await mount()
            await act(async () => {
                tree.unmount()
            })
            expect(mockRemove).toHaveBeenCalledTimes(1)
        })
    })
})
