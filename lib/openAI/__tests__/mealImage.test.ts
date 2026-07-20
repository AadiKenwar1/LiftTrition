// mealImage.test.ts
// M9 regression guard: the audit flagged "AI photos upload full-size", but the resize/compress
// pipeline already existed (mealImage.ts predates the audit — see PRODUCTION_READINESS_FIXES.txt
// M9). This pins the invariant so it stays true: every capture/pick path resizes to its mode's
// width ceiling AND compresses at its mode's exact quality before base64 — pinning compress too
// (not just width) closes the gap where a future compress bump would silently reinflate payload
// past a width-only guard. Meal capture additionally crops to the on-screen frame before resizing;
// item/label capture and all library picks do not crop (kept uncropped/high-res for OCR legibility).

// Both mocks below are called through a wrapper arrow function (not assigned directly) so the
// property reads the mockX variable at CALL time, not at jest.mock-factory-execution time — the
// factory runs while resolving the `import` below, which (per ESM hoisting) happens before the
// `const mockX = jest.fn()` assignments further down this file would otherwise have run.
const mockManipulateAsync = jest.fn()
jest.mock('expo-image-manipulator', () => ({
    manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
    SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}))

const mockDimensionsGet = jest.fn()
jest.mock('react-native', () => ({
    Dimensions: { get: (...args: unknown[]) => mockDimensionsGet(...args) },
}))

import * as ImageManipulator from 'expo-image-manipulator'
import { processCameraCapture, processPickedImageUri } from '../mealImage'

type ManipulateCall = [string, ImageManipulator.Action[], ImageManipulator.SaveOptions]

// Reads the resize target width off a manipulateAsync action, or undefined if it isn't a resize step.
function resizeWidthOf(action: ImageManipulator.Action): number | undefined {
    return 'resize' in action ? action.resize.width : undefined
}

// True if the action is a crop step (only meal-mode capture crops, toward the on-screen frame).
function isCrop(action: ImageManipulator.Action): boolean {
    return 'crop' in action
}

beforeEach(() => {
    jest.clearAllMocks()
    mockManipulateAsync.mockImplementation(async (uri: string) => ({ uri: `${uri}-processed`, width: 1, height: 1 }))
    // Fixed viewport for processCameraCapture's meal-mode crop math — only that path reads Dimensions.
    mockDimensionsGet.mockReturnValue({ width: 390, height: 844 })
})

describe('processPickedImageUri (library picks)', () => {
    it('meal mode: resizes to width <=800, compress 0.8, JPEG', async () => {
        await processPickedImageUri('file://pick.jpg', 'meal')

        expect(mockManipulateAsync).toHaveBeenCalledTimes(1)
        const [uri, actions, saveOptions] = mockManipulateAsync.mock.calls[0] as ManipulateCall
        expect(uri).toBe('file://pick.jpg')
        expect(actions).toHaveLength(1)
        expect(resizeWidthOf(actions[0])).toBeLessThanOrEqual(800)
        expect(saveOptions.compress).toBe(0.8)
        expect(saveOptions.format).toBe(ImageManipulator.SaveFormat.JPEG)
    })

    // item and label share the same (non-meal) resize/compress path — see mealImage.ts's mode branch.
    it.each(['item', 'label'] as const)('%s mode: resizes to width <=1400, compress 0.9, JPEG', async (mode) => {
        await processPickedImageUri('file://pick.jpg', mode)

        const [, actions, saveOptions] = mockManipulateAsync.mock.calls[0] as ManipulateCall
        expect(actions).toHaveLength(1)
        expect(resizeWidthOf(actions[0])).toBeLessThanOrEqual(1400)
        expect(saveOptions.compress).toBe(0.9)
        expect(saveOptions.format).toBe(ImageManipulator.SaveFormat.JPEG)
    })
})

describe('processCameraCapture (in-app camera)', () => {
    const photo = { uri: 'file://camera.jpg', width: 3000, height: 4000 }

    it('meal mode: emits [crop, resize<=800] compress 0.8, JPEG', async () => {
        await processCameraCapture(photo, 'meal')

        expect(mockManipulateAsync).toHaveBeenCalledTimes(1)
        const [uri, actions, saveOptions] = mockManipulateAsync.mock.calls[0] as ManipulateCall
        expect(uri).toBe(photo.uri)
        expect(actions).toHaveLength(2)
        expect(isCrop(actions[0])).toBe(true)
        expect(resizeWidthOf(actions[1])).toBeLessThanOrEqual(800)
        expect(saveOptions.compress).toBe(0.8)
        expect(saveOptions.format).toBe(ImageManipulator.SaveFormat.JPEG)
    })

    // item and label share the same (non-meal, no-crop) path — see mealImage.ts's mode branch.
    it.each(['item', 'label'] as const)('%s mode: emits [resize<=1400] compress 0.9, JPEG, no crop', async (mode) => {
        await processCameraCapture(photo, mode)

        expect(mockManipulateAsync).toHaveBeenCalledTimes(1)
        const [uri, actions, saveOptions] = mockManipulateAsync.mock.calls[0] as ManipulateCall
        expect(uri).toBe(photo.uri)
        expect(actions).toHaveLength(1)
        expect(actions.some(isCrop)).toBe(false)
        expect(resizeWidthOf(actions[0])).toBeLessThanOrEqual(1400)
        expect(saveOptions.compress).toBe(0.9)
        expect(saveOptions.format).toBe(ImageManipulator.SaveFormat.JPEG)
    })
})
