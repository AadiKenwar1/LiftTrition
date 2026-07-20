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
describe('orchestrator', () => {
    let ensurePowerSyncConnected: typeof import('../orchestrator').ensurePowerSyncConnected
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
        ;({ ensurePowerSyncConnected, disconnectAndClearPowerSync, kickPowerSync } = require('../orchestrator'))
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
