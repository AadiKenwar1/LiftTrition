// M8: cancelling the analyze modal (swipe-dismiss / hardware back) must abort the in-flight
// edge-function request, not just discard the result once it resolves — the previously
// adjudicated hard-gate defect (analyzingModal's beforeRemove only set canceledRef.current,
// never touched the network call).
import { ThemeProvider } from '@/context/ThemeContext'
import { act, create } from 'react-test-renderer'

const mockDismissAll = jest.fn()
const mockBack = jest.fn()
const mockHandleAnalyzeAndAddPhoto = jest.fn()
let mockParams: { photoUri?: string; mode?: string; devFakeMs?: string; devFakeOutcome?: string } = {}
let beforeRemoveHandler: (() => void) | null = null

jest.mock('expo-router', () => ({
    useRouter: () => ({ back: mockBack, dismissAll: mockDismissAll }),
    useLocalSearchParams: () => mockParams,
    useNavigation: () => ({
        addListener: jest.fn((event: string, cb: () => void) => {
            if (event === 'beforeRemove') beforeRemoveHandler = cb
            return () => {}
        }),
    }),
}))

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ userID: 'user-1' }),
}))

jest.mock('@/context/NutritionContext', () => ({
    useNutrition: () => ({ handleAnalyzeAndAddPhoto: mockHandleAnalyzeAndAddPhoto }),
}))

// Render the real screen inside the real ThemeProvider, mirroring editEntry.test.tsx's pattern.
function renderModal(params: typeof mockParams) {
    mockParams = params
    beforeRemoveHandler = null
    const AnalyzingModal = require('../analyzingModal').default
    let tree: ReturnType<typeof create>
    act(() => {
        tree = create(
            <ThemeProvider>
                <AnalyzingModal />
            </ThemeProvider>,
        )
    })
    return tree!
}

describe('AnalyzingModal cancellation (M8)', () => {
    beforeEach(() => {
        // Animated.timing/.loop start real 30s/1s-repeating timers on mount; fake timers keep
        // Jest's exit clean (same reasoning as aiFunctions.test.ts's withTimeout dangling timers).
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.useRealTimers()
    })

    it('aborts the in-flight signal and flips shouldCommit false when swipe-dismissed mid-analysis', () => {
        let capturedSignal: AbortSignal | undefined
        let capturedShouldCommit: (() => boolean) | undefined
        mockHandleAnalyzeAndAddPhoto.mockImplementation((_uri: string, _userId: string, _mode: string, shouldCommit: () => boolean, signal: AbortSignal) => {
            capturedShouldCommit = shouldCommit
            capturedSignal = signal
            return new Promise(() => {}) // never resolves — simulates an in-flight request
        })

        renderModal({ photoUri: 'file://p.jpg', mode: 'meal' })

        expect(mockHandleAnalyzeAndAddPhoto).toHaveBeenCalledTimes(1)
        expect(capturedSignal).toBeInstanceOf(AbortSignal)
        expect(capturedSignal!.aborted).toBe(false)
        expect(capturedShouldCommit!()).toBe(true)

        // Simulate a swipe-dismiss / hardware back mid-flight.
        act(() => {
            beforeRemoveHandler?.()
        })

        expect(capturedSignal!.aborted).toBe(true)
        expect(capturedShouldCommit!()).toBe(false)
    })

    it('does not throw when swipe-dismissed before any analysis has started (no photoUri)', () => {
        expect(() => {
            renderModal({})
            act(() => {
                beforeRemoveHandler?.()
            })
        }).not.toThrow()
        expect(mockHandleAnalyzeAndAddPhoto).not.toHaveBeenCalled()
        expect(mockBack).toHaveBeenCalled()
    })
})
