// The throttle keeps module-level state (one alert window across all failures),
// so each test re-requires the module fresh to isolate that state, and drives
// time with fake timers.
describe('persistErrors', () => {
    let reportPersistFailure: typeof import('../persistErrors').reportPersistFailure
    let persistBackoffMs: typeof import('../persistErrors').persistBackoffMs
    let Sentry: { captureException: jest.Mock }
    let Alert: typeof import('react-native').Alert
    let alertSpy: jest.SpyInstance

    beforeEach(() => {
        jest.resetModules()
        jest.doMock('@sentry/react-native', () => ({ captureException: jest.fn() }))
        Sentry = require('@sentry/react-native')
        Alert = require('react-native').Alert
        alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        ;({ reportPersistFailure, persistBackoffMs } = require('../persistErrors'))
        jest.useFakeTimers()
        jest.setSystemTime(0)
    })

    afterEach(() => {
        alertSpy.mockRestore()
        jest.useRealTimers()
    })

    describe('persistBackoffMs', () => {
        it('grows exponentially from 1s', () => {
            expect(persistBackoffMs(0)).toBe(1000)
            expect(persistBackoffMs(1)).toBe(2000)
            expect(persistBackoffMs(2)).toBe(4000)
        })

        it('caps at 30s', () => {
            expect(persistBackoffMs(5)).toBe(30000)
            expect(persistBackoffMs(20)).toBe(30000)
        })
    })

    describe('reportPersistFailure', () => {
        it('captures the error to Sentry tagged with the scope', () => {
            const err = new Error('boom')
            reportPersistFailure('nutrition', err)

            expect(Sentry.captureException).toHaveBeenCalledTimes(1)
            const [captured, ctx] = Sentry.captureException.mock.calls[0]
            expect(captured).toBe(err)
            expect(ctx.tags.scope).toBe('nutrition')
        })

        it('rolls back by calling reload during normal use', () => {
            const reload = jest.fn()
            reportPersistFailure('nutrition', new Error('x'), { reload })
            expect(reload).toHaveBeenCalledTimes(1)
        })

        it('does NOT reload during onboarding (memory is the source of truth)', () => {
            const reload = jest.fn()
            reportPersistFailure('settings', new Error('x'), { reload, onboarding: true })
            expect(reload).not.toHaveBeenCalled()
        })

        it('stays silent during onboarding — Sentry only, no user alert', () => {
            reportPersistFailure('settings', new Error('x'), { onboarding: true, severity: 'high' })
            expect(alertSpy).not.toHaveBeenCalled()
            expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        })

        it('throttles a burst of failures to a single alert, then alerts again after the window', () => {
            reportPersistFailure('workout', new Error('1'))
            reportPersistFailure('workout', new Error('2'))
            expect(alertSpy).toHaveBeenCalledTimes(1)

            jest.advanceTimersByTime(30000)
            reportPersistFailure('workout', new Error('3'))
            expect(alertSpy).toHaveBeenCalledTimes(2)
        })

        it('uses a distinct alert title for high-severity (settings) failures', () => {
            reportPersistFailure('settings', new Error('x'), { severity: 'high' })
            const normalTitle = alertSpy.mock.calls[0][0]

            jest.advanceTimersByTime(30000)
            reportPersistFailure('nutrition', new Error('y'), { severity: 'normal' })
            const highTitle = alertSpy.mock.calls[1][0]

            expect(normalTitle).not.toBe(highTitle)
        })
    })
})
