// cameraScreen.test.tsx
// M9 regression guard: cameraScreen.tsx's pickFromLibrary must keep allowsEditing:true on its
// launchImageLibraryAsync call. mealImage.ts's resize op only bounds width, not height — on iOS,
// allowsEditing:true is documented (expo-image-picker) to force a square crop, which is the real
// (implicit) height/pixel-count bound for library picks. Silently dropping it would reopen that
// unbounded-height gap without mealImage.test.ts's width-only guard ever catching it.
import { ThemeProvider } from '@/context/ThemeContext'
import { TouchableOpacity } from 'react-native'
import { act, create } from 'react-test-renderer'

const mockRequestMediaLibraryPermissionsAsync = jest.fn()
const mockLaunchImageLibraryAsync = jest.fn()
jest.mock('expo-image-picker', () => ({
    requestMediaLibraryPermissionsAsync: (...args: unknown[]) => mockRequestMediaLibraryPermissionsAsync(...args),
    launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}))

// Passthrough stand-in for a native view wrapper: renders only its children. Used for CameraView
// (whose on-screen controls, including the library button, must still render) and LinearGradient
// — neither's real native implementation is needed to test the library-pick flow.
function mockPassthrough(displayName: string) {
    const ReactActual = require('react')
    const Component = ReactActual.forwardRef((props: { children?: unknown }, _ref: unknown) =>
        ReactActual.createElement(ReactActual.Fragment, null, props.children),
    )
    Component.displayName = displayName
    return Component
}

const mockRequestPermission = jest.fn()
jest.mock('expo-camera', () => ({
    CameraView: mockPassthrough('CameraView'),
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, mockRequestPermission],
}))

jest.mock('expo-linear-gradient', () => ({
    LinearGradient: mockPassthrough('LinearGradient'),
}))

jest.mock('@/context/BillingContext', () => ({
    useBilling: () => ({ hasPremium: true }),
}))

jest.mock('expo-router', () => ({
    useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}))

// Render the real screen inside the real ThemeProvider, mirroring editEntry.test.tsx's pattern.
function renderScreen() {
    const CameraScreen = require('../cameraScreen').default
    let tree: ReturnType<typeof create>
    act(() => {
        tree = create(
            <ThemeProvider>
                <CameraScreen />
            </ThemeProvider>,
        )
    })
    return tree!
}

describe('CameraScreen library pick (M9 regression guard)', () => {
    afterEach(() => jest.clearAllMocks())

    it('still requests allowsEditing:true on launchImageLibraryAsync', async () => {
        mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true })
        mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] })

        const tree = renderScreen()
        const libraryButton = tree.root.findAllByType(TouchableOpacity).find(
            (n) => n.props.accessibilityLabel === 'Choose photo from library',
        )
        expect(libraryButton).toBeDefined()

        await act(async () => {
            await libraryButton!.props.onPress()
        })

        expect(mockLaunchImageLibraryAsync).toHaveBeenCalledTimes(1)
        expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true }))
    })
})
