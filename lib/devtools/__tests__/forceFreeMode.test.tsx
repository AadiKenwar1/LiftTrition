import AsyncStorage from '@react-native-async-storage/async-storage'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { isForceFreeModeOn, setForceFreeMode, subscribeForceFreeMode, useForceFreeMode } from '../forceFreeMode'

function Probe({ onRender }: { onRender: (value: boolean) => void }) {
    const forceFree = useForceFreeMode()
    onRender(forceFree)
    return null
}

// Order matters: the hydration test must be the first interaction with the
// module, before any explicit set caches a value.
describe('forceFreeMode', () => {
    it('hydrates from a persisted flag on first read', async () => {
        await AsyncStorage.setItem('devForceFreeMode', '1')
        await expect(isForceFreeModeOn()).resolves.toBe(true)
    })

    it('turns off and clears persistence', async () => {
        await setForceFreeMode(false)
        await expect(isForceFreeModeOn()).resolves.toBe(false)
        await expect(AsyncStorage.getItem('devForceFreeMode')).resolves.toBeNull()
    })

    it('turns on and persists', async () => {
        await setForceFreeMode(true)
        await expect(isForceFreeModeOn()).resolves.toBe(true)
        await expect(AsyncStorage.getItem('devForceFreeMode')).resolves.toBe('1')
    })

    it('notifies subscribers on change', async () => {
        await setForceFreeMode(false)
        const seen: boolean[] = []
        const unsubscribe = subscribeForceFreeMode((v) => seen.push(v))
        await setForceFreeMode(true)
        await setForceFreeMode(false)
        unsubscribe()
        await setForceFreeMode(true)
        expect(seen).toEqual([true, false])
    })

    it('useForceFreeMode tracks the flag reactively', async () => {
        await setForceFreeMode(false)
        const values: boolean[] = []
        await act(async () => {
            create(<Probe onRender={(v) => values.push(v)} />)
        })
        expect(values[values.length - 1]).toBe(false)
        await act(async () => {
            await setForceFreeMode(true)
        })
        expect(values[values.length - 1]).toBe(true)
    })
})
