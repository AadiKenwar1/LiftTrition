import React from 'react'
import { act, create } from 'react-test-renderer'
import { AppState, AppStateStatus } from 'react-native'
import { useToday } from '../useToday'

function Probe({ onRender }: { onRender: (value: string) => void }) {
    const today = useToday()
    onRender(today)
    return null
}

describe('useToday', () => {
    let listener: (state: AppStateStatus) => void
    let removeMock: jest.Mock
    let addEventListenerSpy: jest.SpyInstance

    beforeEach(() => {
        jest.useFakeTimers()
        removeMock = jest.fn()
        addEventListenerSpy = jest
            .spyOn(AppState, 'addEventListener')
            .mockImplementation((_event, handler) => {
                listener = handler
                return { remove: removeMock } as ReturnType<typeof AppState.addEventListener>
            })
    })

    afterEach(() => {
        jest.useRealTimers()
        addEventListenerSpy.mockRestore()
    })

    it('returns todays key at mount', () => {
        jest.setSystemTime(new Date(2026, 6, 13, 22, 0))
        const values: string[] = []
        act(() => {
            create(<Probe onRender={(v) => values.push(v)} />)
        })
        expect(values[values.length - 1]).toBe('2026-07-13')
    })

    it('does not update or re-render on same-day foreground', () => {
        jest.setSystemTime(new Date(2026, 6, 13, 22, 0))
        const values: string[] = []
        act(() => {
            create(<Probe onRender={(v) => values.push(v)} />)
        })
        const renderCountBefore = values.length
        act(() => {
            listener('active')
        })
        expect(values.length).toBe(renderCountBefore)
        expect(values[values.length - 1]).toBe('2026-07-13')
    })

    it('updates to the new day when active fires after midnight', () => {
        jest.setSystemTime(new Date(2026, 6, 13, 22, 0))
        const values: string[] = []
        act(() => {
            create(<Probe onRender={(v) => values.push(v)} />)
        })
        jest.setSystemTime(new Date(2026, 6, 14, 7, 0))
        act(() => {
            listener('active')
        })
        expect(values[values.length - 1]).toBe('2026-07-14')
    })

    it('ignores background/inactive transitions even after a day change', () => {
        jest.setSystemTime(new Date(2026, 6, 13, 22, 0))
        const values: string[] = []
        act(() => {
            create(<Probe onRender={(v) => values.push(v)} />)
        })
        jest.setSystemTime(new Date(2026, 6, 14, 7, 0))
        act(() => {
            listener('background')
        })
        act(() => {
            listener('inactive')
        })
        expect(values[values.length - 1]).toBe('2026-07-13')
    })

    it('removes the AppState subscription on unmount', () => {
        jest.setSystemTime(new Date(2026, 6, 13, 22, 0))
        let root: ReturnType<typeof create>
        act(() => {
            root = create(<Probe onRender={() => {}} />)
        })
        act(() => {
            root.unmount()
        })
        expect(removeMock).toHaveBeenCalledTimes(1)
    })
})
