// orchestrator.test.ts
// Pins the single-capture-per-funnel invariant H4 introduced: kickPowerSync owns exactly one
// Sentry capture site for its one failure funnel (its sole caller, SyncWatchdog, only
// breadcrumbs), while ensurePowerSyncConnected AND disconnectAndClearPowerSync stay state-only.
// ensurePowerSyncConnected's callers own capture (AuthContext captures a real connect failure;
// SyncWatchdog's watchdog_resume path intentionally swallows it). disconnectAndClearPowerSync has
// two callers with different terminal handling for the same rethrown error, so each owns its own
// single capture site instead: signOut()'s propagated failure is captured once in profile.tsx;
// clearLocalSession()'s swallowed one is captured once in accountFunctions.tsx (see
// accountFunctions.test.ts).
//
// Module-level state (the kick throttle timestamp, the mutex chain) persists across `require`s of
// the same module instance, so — matching persistErrors.test.ts's pattern — every test resets the
// module registry and re-requires a fresh orchestrator instance.
// Flushes all currently-queued microtasks (a few passes covers the promise-chain depth used by
// enqueue) without advancing wall-clock — lets an enqueued task run up to its first pending await.
const flushMicrotasks = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('orchestrator', () => {
    let ensurePowerSyncConnected: typeof import('../orchestrator').ensurePowerSyncConnected
    let disconnectPowerSync: typeof import('../orchestrator').disconnectPowerSync
    let disconnectAndClearPowerSync: typeof import('../orchestrator').disconnectAndClearPowerSync
    let kickPowerSync: typeof import('../orchestrator').kickPowerSync
    let Sentry: { captureException: jest.Mock }
    let mockConnect: jest.Mock
    let mockDisconnect: jest.Mock
    let mockDisconnectAndClear: jest.Mock

    beforeEach(() => {
        jest.resetModules()

        jest.doMock('@sentry/react-native', () => ({ captureException: jest.fn() }))
        // Only AppState.currentState is read by the orchestrator; a plain object is enough and
        // avoids pulling in the rest of react-native for this unit test.
        jest.doMock('react-native', () => ({ AppState: { currentState: 'active' } }))
        // A trivial stand-in — orchestrator only ever does `new Connector()` and hands it to
        // powerSync.connect(), never touching its internals, so the real Connector (which pulls in
        // Supabase/env/PowerSync backend types) would be unnecessary weight here.
        jest.doMock('@/lib/powersync/Connector', () => ({ Connector: class {} }))

        mockConnect = jest.fn().mockResolvedValue(undefined)
        mockDisconnect = jest.fn().mockResolvedValue(undefined)
        mockDisconnectAndClear = jest.fn().mockResolvedValue(undefined)
        jest.doMock('@/lib/powersync/system', () => ({
            powerSync: {
                currentStatus: { connected: false },
                connect: (...args: unknown[]) => mockConnect(...args),
                disconnect: (...args: unknown[]) => mockDisconnect(...args),
                disconnectAndClear: (...args: unknown[]) => mockDisconnectAndClear(...args),
            },
        }))

        Sentry = require('@sentry/react-native')
        ;({ ensurePowerSyncConnected, disconnectPowerSync, disconnectAndClearPowerSync, kickPowerSync } = require('../orchestrator'))
    })

    describe('mutex serialization (mutexChain)', () => {
        it('does not start a disconnect until an in-flight connect resolves (serialized, never overlapping)', async () => {
            let resolveConnect!: () => void
            mockConnect.mockReturnValue(new Promise<void>((resolve) => { resolveConnect = resolve }))

            // Kick off both without awaiting; the mutex must run them one at a time, in order.
            const connecting = ensurePowerSyncConnected('auth_session')
            const disconnecting = disconnectPowerSync('auth_no_session')

            // connect has started but is still pending — the serialized disconnect must not have run.
            await flushMicrotasks()
            expect(mockConnect).toHaveBeenCalledTimes(1)
            expect(mockDisconnect).not.toHaveBeenCalled()

            resolveConnect()
            await connecting
            await disconnecting
            expect(mockDisconnect).toHaveBeenCalledTimes(1)
        })

        it('keeps the chain usable after a task rejects (recovers instead of wedging permanently)', async () => {
            mockConnect.mockRejectedValueOnce(new Error('connect boom'))

            await expect(ensurePowerSyncConnected('auth_session')).rejects.toThrow('connect boom')
            // A task enqueued after the rejection still runs — the chain recovered rather than
            // staying permanently rejected.
            await expect(disconnectPowerSync('auth_no_session')).resolves.toBeUndefined()
            expect(mockDisconnect).toHaveBeenCalledTimes(1)
        })
    })

    describe('ensurePowerSyncConnected', () => {
        it('never captures on failure — state-only by design, its callers own capture', async () => {
            const error = new Error('connect failed')
            mockConnect.mockRejectedValue(error)

            await expect(ensurePowerSyncConnected('auth_session')).rejects.toThrow('connect failed')

            expect(Sentry.captureException).not.toHaveBeenCalled()
        })

        it('never captures on success', async () => {
            await expect(ensurePowerSyncConnected('auth_session')).resolves.toBeUndefined()

            expect(Sentry.captureException).not.toHaveBeenCalled()
        })
    })

    describe('kickPowerSync', () => {
        it('captures exactly once, tagged powersync-kick, and reports "error"', async () => {
            const error = new Error('kick failed')
            mockConnect.mockRejectedValue(error)

            const outcome = await kickPowerSync('watchdog_disconnected')

            expect(outcome).toBe('error')
            expect(Sentry.captureException).toHaveBeenCalledTimes(1)
            expect(Sentry.captureException).toHaveBeenCalledWith(error, { tags: { area: 'powersync-kick' } })
        })

        it('never captures on success', async () => {
            const outcome = await kickPowerSync('watchdog_disconnected')

            expect(outcome).toBe('ok')
            expect(Sentry.captureException).not.toHaveBeenCalled()
        })

        it('throttles a second kick inside MIN_KICK_GAP_MS, reconnecting exactly once', async () => {
            const first = await kickPowerSync('watchdog_disconnected')
            const second = await kickPowerSync('watchdog_disconnected')

            expect(first).toBe('ok')
            expect(second).toBe('throttled')
            // Only the first kick actually hard-reconnects; the throttled one touches neither.
            expect(mockDisconnect).toHaveBeenCalledTimes(1)
            expect(mockConnect).toHaveBeenCalledTimes(1)
        })

        it('returns "background" and never reconnects when the app is not active', async () => {
            // orchestrator reads AppState.currentState at call time; flip the shared mock to background.
            require('react-native').AppState.currentState = 'background'

            const outcome = await kickPowerSync('watchdog_disconnected')

            expect(outcome).toBe('background')
            expect(mockConnect).not.toHaveBeenCalled()
            expect(mockDisconnect).not.toHaveBeenCalled()
        })
    })

    describe('disconnectAndClearPowerSync', () => {
        it('never captures on failure — state-only by design, its two callers (signOut via profile.tsx, clearLocalSession) own capture separately', async () => {
            const error = new Error('clear failed')
            mockDisconnectAndClear.mockRejectedValue(error)

            await expect(disconnectAndClearPowerSync()).rejects.toThrow('clear failed')

            expect(Sentry.captureException).not.toHaveBeenCalled()
        })

        it('never captures on success', async () => {
            await expect(disconnectAndClearPowerSync()).resolves.toBeUndefined()

            expect(Sentry.captureException).not.toHaveBeenCalled()
        })
    })
})
