import React from 'react'
import { act, create } from 'react-test-renderer'
import { useDebouncedSave } from '../useDebouncedSave'

function Probe({ value, save }: { value: string; save: (v: string) => void }) {
    useDebouncedSave(value, '', save)
    return null
}

describe('useDebouncedSave', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('saves once after the quiet period, not per change', () => {
        const save = jest.fn()
        let r!: ReturnType<typeof create>
        act(() => { r = create(<Probe value="a" save={save} />) })
        act(() => { r.update(<Probe value="ab" save={save} />) })
        act(() => { r.update(<Probe value="abc" save={save} />) })
        expect(save).not.toHaveBeenCalled()          // still typing
        act(() => { jest.advanceTimersByTime(600) })
        expect(save).toHaveBeenCalledTimes(1)
        expect(save).toHaveBeenCalledWith('abc')
    })

    it('flushes the latest value on unmount if unsaved', () => {
        const save = jest.fn()
        let r!: ReturnType<typeof create>
        act(() => { r = create(<Probe value="a" save={save} />) })
        act(() => { r.update(<Probe value="draft" save={save} />) })
        act(() => { r.unmount() })                    // dismissed before the debounce fired
        expect(save).toHaveBeenCalledTimes(1)
        expect(save).toHaveBeenCalledWith('draft')
    })

    it('never saves when the value stayed at initial', () => {
        const save = jest.fn()
        let r!: ReturnType<typeof create>
        act(() => { r = create(<Probe value="" save={save} />) })
        act(() => { jest.advanceTimersByTime(600) })
        act(() => { r.unmount() })
        expect(save).not.toHaveBeenCalled()
    })
})
