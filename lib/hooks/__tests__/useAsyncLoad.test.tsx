import { act, create } from 'react-test-renderer'
import { useAsyncLoad, type LoadStatus } from '../useAsyncLoad'

type HookResult = { status: LoadStatus; retry: () => void }

let latest: HookResult

function Harness({ loader, deps }: { loader: (isStale: () => boolean) => Promise<void>; deps: unknown[] }) {
    latest = useAsyncLoad(loader, deps)
    return null
}

let warnSpy: jest.SpyInstance

beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
    warnSpy.mockRestore()
})

describe('useAsyncLoad', () => {
    it('stays in loading status while the loader is pending', async () => {
        await act(async () => {
            create(<Harness loader={() => new Promise<void>(() => {})} deps={['A']} />)
        })

        expect(latest.status).toBe('loading')
    })

    it('becomes ready when the loader resolves', async () => {
        await act(async () => {
            create(<Harness loader={() => Promise.resolve()} deps={['A']} />)
        })

        expect(latest.status).toBe('ready')
    })

    it('becomes error when the loader rejects', async () => {
        await act(async () => {
            create(<Harness loader={() => Promise.reject(new Error('boom'))} deps={['A']} />)
        })

        expect(latest.status).toBe('error')
    })

    it('re-runs the loader when retry is called', async () => {
        let calls = 0
        const loader = () => {
            calls++
            return Promise.resolve()
        }

        await act(async () => {
            create(<Harness loader={loader} deps={['A']} />)
        })
        expect(calls).toBe(1)

        await act(async () => {
            latest.retry()
        })
        expect(calls).toBe(2)
    })

    it('re-runs the loader when deps change', async () => {
        let calls = 0
        const loader = () => {
            calls++
            return Promise.resolve()
        }

        let root!: ReturnType<typeof create>
        await act(async () => {
            root = create(<Harness loader={loader} deps={['A']} />)
        })
        expect(calls).toBe(1)

        await act(async () => {
            root.update(<Harness loader={loader} deps={['B']} />)
        })
        expect(calls).toBe(2)
    })

    it('reports isStale() true to a run whose deps changed mid-flight', async () => {
        let resolveFirst!: () => void
        const first = new Promise<void>((resolve) => {
            resolveFirst = resolve
        })
        const staleAtResolve: boolean[] = []
        let index = 0

        const loader = (isStale: () => boolean) => {
            const myIndex = index++
            const pending = myIndex === 0 ? first : Promise.resolve()
            return pending.then(() => {
                staleAtResolve[myIndex] = isStale()
            })
        }

        let root!: ReturnType<typeof create>
        await act(async () => {
            root = create(<Harness loader={loader} deps={['A']} />)
        })
        await act(async () => {
            root.update(<Harness loader={loader} deps={['B']} />)
        })
        await act(async () => {
            resolveFirst()
            await first
        })

        expect(staleAtResolve[1]).toBe(false) // current run is not stale
        expect(staleAtResolve[0]).toBe(true) // superseded run is stale
    })

    it('does not flip to error when a superseded run rejects', async () => {
        let rejectFirst!: (e: unknown) => void
        const first = new Promise<void>((_, reject) => {
            rejectFirst = reject
        })
        let index = 0
        const loader = () => {
            const myIndex = index++
            return myIndex === 0 ? first : Promise.resolve()
        }

        let root!: ReturnType<typeof create>
        await act(async () => {
            root = create(<Harness loader={loader} deps={['A']} />)
        })
        await act(async () => {
            root.update(<Harness loader={loader} deps={['B']} />)
        })
        expect(latest.status).toBe('ready')

        await act(async () => {
            rejectFirst(new Error('stale'))
            await first.catch(() => {})
        })

        expect(latest.status).toBe('ready')
    })
})
