import { useCallback, useEffect, useState, type DependencyList } from 'react'

export type LoadStatus = 'loading' | 'ready' | 'error'

/**
 * Runs an async loader as an effect and tracks its lifecycle as an explicit
 * status. The loader performs its own side effects (writing context state);
 * this hook owns status + retry, so a FAILED load is a distinct 'error' state
 * instead of being indistinguishable from success. Re-runs on deps change or
 * retry(). A run whose deps changed mid-flight is ignored (cancelled flag), and
 * the loader is handed isStale() so it can bail before writing stale data.
 */
export function useAsyncLoad(
    loader: (isStale: () => boolean) => Promise<void>,
    deps: DependencyList,
): { status: LoadStatus; retry: () => void } {
    const [status, setStatus] = useState<LoadStatus>('loading')
    const [nonce, setNonce] = useState(0)

    const retry = useCallback(() => setNonce((n) => n + 1), [])

    useEffect(() => {
        let cancelled = false
        setStatus('loading')

        loader(() => cancelled)
            .then(() => {
                if (!cancelled) setStatus('ready')
            })
            .catch((e) => {
                if (!cancelled) {
                    console.warn('[useAsyncLoad] load failed', e)
                    setStatus('error')
                }
            })

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, nonce])

    return { status, retry }
}
