import { ThemeProvider } from '@/context/ThemeContext'
// react-test-renderer ships no bundled types (@types/react-test-renderer not installed).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { AppLoadingScreen } from '../AppLoadingScreen'

// expo-image needs no native backing here — a host stub keeps the render pure.
jest.mock('expo-image', () => ({ Image: 'Image' }))

// Pressable link nodes carrying an accessibility label (TouchableOpacity forwards onPress + label to an
// inner Pressable, so a rendered link yields >=1 match; an unrendered link yields 0).
function pressablesByLabel(root: any, label: string) {
    return root.findAll((n: any) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function')
}

let tree: any
let warnSpy: jest.SpyInstance

function renderScreen(props: Parameters<typeof AppLoadingScreen>[0]) {
    act(() => {
        tree = create(
            <ThemeProvider>
                <AppLoadingScreen {...props} />
            </ThemeProvider>,
        )
    })
    return tree
}

beforeEach(() => {
    // The loading animation uses useNativeDriver with no native module under Jest; silence that warning.
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
    // Unmount so the animation loops/timers stop (no post-test logging or leaks).
    if (tree) act(() => tree.unmount())
    tree = null
    warnSpy.mockRestore()
})

describe('AppLoadingScreen', () => {
    it('shows neither escape affordance while still loading', () => {
        renderScreen({ loadFailed: false, onRetry: () => {}, onSignOut: () => {} })

        expect(pressablesByLabel(tree.root, 'Retry')).toHaveLength(0)
        expect(pressablesByLabel(tree.root, 'Sign out')).toHaveLength(0)
    })

    it('shows retry but not sign-out when onSignOut is omitted (StackLayout context-load usage)', () => {
        renderScreen({ loadFailed: true, onRetry: () => {} })

        expect(pressablesByLabel(tree.root, 'Retry').length).toBeGreaterThan(0)
        expect(pressablesByLabel(tree.root, 'Sign out')).toHaveLength(0)
    })

    it('shows both retry and sign-out when failed and onSignOut is provided (PowerSyncGuard usage)', () => {
        renderScreen({ loadFailed: true, onRetry: () => {}, onSignOut: () => {} })

        expect(pressablesByLabel(tree.root, 'Retry').length).toBeGreaterThan(0)
        expect(pressablesByLabel(tree.root, 'Sign out').length).toBeGreaterThan(0)
    })

    it('marks both links as buttons and invokes their callbacks on press', () => {
        const onRetry = jest.fn()
        const onSignOut = jest.fn()
        renderScreen({ loadFailed: true, onRetry, onSignOut })

        const retry = pressablesByLabel(tree.root, 'Retry')[0]
        const signOut = pressablesByLabel(tree.root, 'Sign out')[0]

        expect(retry.props.accessibilityRole).toBe('button')
        expect(signOut.props.accessibilityRole).toBe('button')

        act(() => retry.props.onPress())
        act(() => signOut.props.onPress())

        expect(onRetry).toHaveBeenCalledTimes(1)
        expect(onSignOut).toHaveBeenCalledTimes(1)
    })
})
