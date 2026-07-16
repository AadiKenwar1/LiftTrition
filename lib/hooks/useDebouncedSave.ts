import { useEffect, useRef } from 'react'

// Debounces save(value) to at most once per delayMs of quiet, and flushes once
// on unmount if the latest value hasn't been saved. Skips saving while value
// equals initial. Built for the notes modal, which has no save button — the
// unmount flush is the "save on close".
export function useDebouncedSave(value: string, initial: string, save: (value: string) => void, delayMs = 600): void {
    const savedRef = useRef(initial)
    const valueRef = useRef(value)
    valueRef.current = value
    const saveRef = useRef(save)
    saveRef.current = save

    useEffect(() => {
        if (value === savedRef.current) return
        const timer = setTimeout(() => {
            savedRef.current = value
            saveRef.current(value)
        }, delayMs)
        return () => clearTimeout(timer)
    }, [value, delayMs])

    useEffect(() => () => {
        if (valueRef.current !== savedRef.current) {
            savedRef.current = valueRef.current
            saveRef.current(valueRef.current)
        }
    }, [])
}
