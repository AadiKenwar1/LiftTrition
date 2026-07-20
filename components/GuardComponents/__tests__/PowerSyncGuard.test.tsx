// react-test-renderer ships no bundled types (@types/react-test-renderer not installed).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { Alert, View } from 'react-native'

// Capture the props AppLoadingScreen is rendered with, without pulling its expo-image / animations into the test.
const mockAppLoadingScreen = jest.fn((_props: unknown) => null)
jest.mock('../AppLoadingScreen', () => ({
    AppLoadingScreen: (props: unknown) => mockAppLoadingScreen(props),
}))

const mockEnsureConnected = jest.fn()
jest.mock('@/lib/powersync/orchestrator', () => ({
    ensurePowerSyncConnected: (...args: unknown[]) => mockEnsureConnected(...args),
}))

const mockWaitForFirstSyncOrThrow = jest.fn()
jest.mock('@/lib/powersync/waitForFirstSync', () => ({
    FIRST_SYNC_TIMEOUT_MS: 30000,
    FirstSyncTimeoutError: class FirstSyncTimeoutError extends Error {},
    waitForFirstSyncOrThrow: (...args: unknown[]) => mockWaitForFirstSyncOrThrow(...args),
}))

const mockForceSignOut = jest.fn()
jest.mock('@/context/AuthContext/functions/accountFunctions', () => ({
    forceSignOut: (...args: unknown[]) => mockForceSignOut(...args),
}))

// Stable reference: a fresh object each render would change useAsyncLoad's [session] dep and re-run the loader forever.
const mockAuthValue = { session: { user: { id: 'u1' } }, loading: false }
jest.mock('@/context/AuthContext', () => ({
    useAuth: () => mockAuthValue,
}))

jest.mock('@/lib/devtools/forceLoadFailure', () => ({
    throwIfLoadFailureArmed: jest.fn().mockResolvedValue(undefined),
}))

import { FirstSyncTimeoutError } from '@/lib/powersync/waitForFirstSync'
import { PowerSyncGuard } from '../PowerSyncGuard'

// The most recent props AppLoadingScreen was rendered with.
function lastLoadingProps(): any {
    const calls = mockAppLoadingScreen.mock.calls
    return calls[calls.length - 1]?.[0]
}

// True if the guarded children (a marker View) made it into the tree.
function childrenRendered(root: any): boolean {
    return root.findAll((n: any) => n.props?.testID === 'app-content').length > 0
}

let tree: any
let warnSpy: jest.SpyInstance

// Mount the guard; a single async act drains useAsyncLoad's loader chain
// (ensureConnected -> waitForFirstSyncOrThrow -> setStatus) and commits the re-render.
async function renderGuard(): Promise<void> {
    await act(async () => {
        tree = create(
            <PowerSyncGuard>
                <View testID="app-content" />
            </PowerSyncGuard>,
        )
    })
}

beforeEach(() => {
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockEnsureConnected.mockResolvedValue(undefined)
})

afterEach(() => {
    // Unmount so useAsyncLoad's cleanup flags any late resolution as cancelled (no post-test logging).
    if (tree) act(() => tree.unmount())
    tree = null
    warnSpy.mockRestore()
})

describe('PowerSyncGuard', () => {
    it('connects then renders children once the first sync completes', async () => {
        mockWaitForFirstSyncOrThrow.mockResolvedValue(undefined)

        await renderGuard()

        expect(mockEnsureConnected).toHaveBeenCalledWith('auth_session')
        expect(childrenRendered(tree.root)).toBe(true)
    })

    it('surfaces the error state with retry + sign-out when the first sync hangs past the timeout', async () => {
        mockWaitForFirstSyncOrThrow.mockRejectedValue(new FirstSyncTimeoutError(30000))

        await renderGuard()

        const props = lastLoadingProps()
        expect(props.loadFailed).toBe(true)
        expect(typeof props.onRetry).toBe('function')
        expect(typeof props.onSignOut).toBe('function')
        expect(mockWaitForFirstSyncOrThrow).toHaveBeenCalledWith(30000)
        expect(childrenRendered(tree.root)).toBe(false)
    })

    it('confirms via Alert then force-signs-out (no flush) when the escape is taken', async () => {
        mockWaitForFirstSyncOrThrow.mockRejectedValue(new FirstSyncTimeoutError(30000))
        mockForceSignOut.mockResolvedValue(undefined)
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})

        await renderGuard()

        const props = lastLoadingProps()
        act(() => props.onSignOut())

        expect(alertSpy).toHaveBeenCalledTimes(1)
        const buttons = (alertSpy.mock.calls[0][2] ?? []) as { text: string; style?: string; onPress?: () => void }[]
        const confirm = buttons.find((b) => b.text === 'Sign out')
        expect(confirm?.style).toBe('destructive')
        // Nothing happens until the destructive button is pressed.
        expect(mockForceSignOut).not.toHaveBeenCalled()

        await act(async () => {
            confirm?.onPress?.()
        })

        expect(mockForceSignOut).toHaveBeenCalledTimes(1)
        alertSpy.mockRestore()
    })
})
