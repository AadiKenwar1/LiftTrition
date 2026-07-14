// react-test-renderer ships no bundled types; suppress the missing-declaration
// error (test-only runtime dep), matching useAsyncLoad.test.
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { useSubmitOnce } from '../useSubmitOnce'

type Guard = ReturnType<typeof useSubmitOnce>[0]

let guard: Guard
let submitting: boolean
let reset: () => void

function Harness() {
    ;[guard, submitting, reset] = useSubmitOnce()
    return null
}

async function mount() {
    await act(async () => {
        create(<Harness />)
    })
}

describe('useSubmitOnce', () => {
    it('runs the wrapped handler and forwards its arguments', async () => {
        await mount()
        const fn = jest.fn()

        await act(async () => {
            await guard(fn)('a', 1)
        })

        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('a', 1)
    })

    it('ignores re-entry while a handler is in flight (the double-tap guard)', async () => {
        await mount()
        let resolve!: () => void
        const pending = new Promise<void>((r) => {
            resolve = r
        })
        const fn = jest.fn(() => pending)

        const handler = guard(fn)
        await act(async () => {
            handler() // starts, stays in flight
            handler() // second tap — must be ignored
            handler() // third tap — must be ignored
        })
        expect(fn).toHaveBeenCalledTimes(1)

        await act(async () => {
            resolve()
            await pending
        })
    })

    it('exposes submitting = true while in flight', async () => {
        await mount()
        let resolve!: () => void
        const pending = new Promise<void>((r) => {
            resolve = r
        })

        await act(async () => {
            void guard(() => pending)()
        })
        expect(submitting).toBe(true)

        await act(async () => {
            resolve()
            await pending
        })
    })

    it('by default stays disabled after completion (navigating handlers never re-enable)', async () => {
        await mount()
        const fn = jest.fn()

        await act(async () => {
            await guard(fn)()
        })

        expect(submitting).toBe(true)
        // A later tap is still ignored — the screen is expected to be leaving.
        await act(async () => {
            await guard(fn)()
        })
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('with { retryable: true } re-enables after completion so the action can run again', async () => {
        await mount()
        const fn = jest.fn()

        await act(async () => {
            await guard(fn, { retryable: true })()
        })
        expect(submitting).toBe(false)

        await act(async () => {
            await guard(fn, { retryable: true })()
        })
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it('reset() re-enables a default (no-reset) guard so a fresh submission is allowed', async () => {
        await mount()
        const fn = jest.fn()

        await act(async () => {
            await guard(fn)()
        })
        expect(submitting).toBe(true)

        await act(async () => {
            reset()
        })
        expect(submitting).toBe(false)

        await act(async () => {
            await guard(fn)()
        })
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it('re-enables in finally even when a retryable handler throws', async () => {
        await mount()
        const fn = jest.fn(() => {
            throw new Error('boom')
        })

        await act(async () => {
            await guard(fn, { retryable: true })().catch(() => {})
        })

        expect(submitting).toBe(false)
    })
})
