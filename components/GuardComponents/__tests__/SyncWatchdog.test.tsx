// SyncWatchdog.test.tsx
// Pins H4's watchdog telemetry: a kick 'error' outcome only breadcrumbs (kickPowerSync's own catch
// already captured the failure once inside the orchestrator — capturing again here would double
// count the same underlying error), and the watchdog_resume path's intentional swallow never
// reaches Sentry even when ensurePowerSyncConnected rejects.

// react-test-renderer ships no bundled types (@types/react-test-renderer not installed).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import React from 'react'

// Reassignable so a test can swap in a fresh session object; the `mock` prefix is what
// lets the hoisted jest.mock factory below close over it.
let mockAuthState: { session: unknown; loading: boolean } = { session: { user: { id: 'u1' } }, loading: false }
jest.mock('@/context/AuthContext', () => ({
    useAuth: () => mockAuthState,
}))

const mockKickPowerSync = jest.fn()
const mockGetKickThrottleRemainingMs = jest.fn(() => 0)
const mockGetPowerSyncOrchestratorState = jest.fn(() => ({}) as { lastError?: string })
const mockEnsureConnected = jest.fn()
jest.mock('@/lib/powersync/orchestrator', () => ({
    ensurePowerSyncConnected: (...args: unknown[]) => mockEnsureConnected(...args),
    // Zero-arg in production (SyncWatchdog.tsx calls both with no parameters), so the mocks —
    // created via jest.fn(() => ...) — infer a zero-parameter call signature; matching that
    // arity here (rather than spreading a non-tuple unknown[]) is what TS2556 requires.
    getKickThrottleRemainingMs: () => mockGetKickThrottleRemainingMs(),
    getPowerSyncOrchestratorState: () => mockGetPowerSyncOrchestratorState(),
    kickPowerSync: (...args: unknown[]) => mockKickPowerSync(...args),
}))

const mockCurrentStatus: { connected: boolean; lastSyncedAt?: Date } = { connected: false, lastSyncedAt: undefined }
jest.mock('@/lib/powersync/system', () => ({
    powerSync: {
        get currentStatus() {
            return mockCurrentStatus
        },
    },
}))

jest.mock('@/lib/powersync/watchdogStatus', () => ({
    setWatchdogStatus: jest.fn(),
}))

jest.mock('@sentry/react-native', () => ({
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
}))

// SyncWatchdog renders nothing (`return null`), so a minimal AppState stand-in is enough — no
// need to pull in the rest of react-native for this test.
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
import { SyncWatchdog } from '../SyncWatchdog'

let tree: any

beforeEach(() => {
    jest.clearAllMocks()
    mockCurrentStatus.connected = false
    mockCurrentStatus.lastSyncedAt = undefined
    mockGetKickThrottleRemainingMs.mockReturnValue(0)
    mockGetPowerSyncOrchestratorState.mockReturnValue({})
    appStateListener = undefined
    mockAuthState = { session: { user: { id: 'u1' } }, loading: false }
})

afterEach(() => {
    if (tree) act(() => tree.unmount())
    tree = null
})

// Mount SyncWatchdog; one async act drains the mount-time check() -> kick() -> kickPowerSync()
// chain through to a settled state.
async function renderWatchdog(): Promise<void> {
    await act(async () => {
        tree = create(React.createElement(SyncWatchdog))
    })
}

describe('SyncWatchdog', () => {
    it("breadcrumbs (but does not capture) a kick 'error' outcome — already captured once in orchestrator", async () => {
        mockGetPowerSyncOrchestratorState.mockReturnValue({ lastError: 'kick boom' })
        mockKickPowerSync.mockResolvedValue('error')

        await renderWatchdog()

        expect(mockKickPowerSync).toHaveBeenCalledWith('watchdog_disconnected')
        expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1)
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('never captures a successful kick', async () => {
        mockKickPowerSync.mockResolvedValue('ok')

        await renderWatchdog()

        expect(Sentry.addBreadcrumb).not.toHaveBeenCalled()
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('never captures the watchdog_resume swallow, even when ensurePowerSyncConnected rejects', async () => {
        // Already healthy at mount, so the initial check() does not itself kick — isolating the
        // resume path below.
        mockCurrentStatus.connected = true
        mockCurrentStatus.lastSyncedAt = new Date()
        mockEnsureConnected.mockRejectedValue(new Error('resume failed'))

        await renderWatchdog()
        expect(typeof appStateListener).toBe('function')

        await act(async () => {
            appStateListener?.('active')
        })

        expect(mockEnsureConnected).toHaveBeenCalledWith('watchdog_resume')
        expect(Sentry.captureException).not.toHaveBeenCalled()
        expect(mockKickPowerSync).not.toHaveBeenCalled()
    })

    it('does not tear down and rebuild the monitor when a token refresh replaces the session object', async () => {
        // Healthy at mount so the initial check() does not kick — any later kick would come
        // from the effect re-running, which is exactly what this pins.
        mockCurrentStatus.connected = true
        mockCurrentStatus.lastSyncedAt = new Date()

        await renderWatchdog()
        expect(mockAddEventListener).toHaveBeenCalledTimes(1)

        // Supabase hands back a new session object on every hourly token refresh; same user.
        mockAuthState = { session: { user: { id: 'u1' } }, loading: false }
        await act(async () => {
            tree.update(React.createElement(SyncWatchdog))
        })

        expect(mockAddEventListener).toHaveBeenCalledTimes(1)
        expect(mockRemove).not.toHaveBeenCalled()
    })
})
