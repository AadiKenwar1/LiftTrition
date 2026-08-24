// mealImage.test.ts
// M9 regression guard: the audit flagged "AI photos upload full-size", but the resize/compress
// pipeline already existed (mealImage.ts predates the audit — see PRODUCTION_READINESS_FIXES.txt
// M9). This pins the invariant so it stays true: every capture/pick path resizes to its mode's
// width ceiling AND compresses at its mode's exact quality before base64 — pinning compress too
// (not just width) closes the gap where a future compress bump would silently reinflate payload
// past a width-only guard. Every capture additionally crops to its on-screen frame (label's is
// narrower — LABEL_FRAME) before resizing; library picks do not crop (no frame exists for a pick).

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
import type { View } from 'react-native'
import { getFrameSize, measureCaptureLayout, processCameraCapture, processPickedImageUri } from '../mealImage'

type ManipulateCall = [string, ImageManipulator.Action[], ImageManipulator.SaveOptions]

// Reads the resize target width off a manipulateAsync action, or undefined if it isn't a resize step.
function resizeWidthOf(action: ImageManipulator.Action): number | undefined {
    return 'resize' in action ? action.resize.width : undefined
}

// True if the action is a crop step (every capture crops toward its on-screen frame).
function isCrop(action: ImageManipulator.Action): boolean {
    return 'crop' in action
}

// Reads the crop rectangle width off a manipulateAsync action, or undefined if it isn't a crop step.
function cropWidthOf(action: ImageManipulator.Action): number | undefined {
    return 'crop' in action ? action.crop.width : undefined
}

// Reads the full crop rectangle off a manipulateAsync action, or undefined if it isn't a crop step.
function cropOf(action: ImageManipulator.Action) {
    return 'crop' in action ? action.crop : undefined
}

beforeEach(() => {
    jest.clearAllMocks()
    mockManipulateAsync.mockImplementation(async (uri: string) => ({ uri: `${uri}-processed`, width: 1, height: 1 }))
    // Fixed viewport for processCameraCapture's meal/label crop math — only those paths read Dimensions.
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

    it('label mode: resizes to width <=1400, compress 0.9, JPEG', async () => {
        await processPickedImageUri('file://pick.jpg', 'label')

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

    it('label mode: emits [crop, resize<=1400] compress 0.9, JPEG', async () => {
        await processCameraCapture(photo, 'label')

        expect(mockManipulateAsync).toHaveBeenCalledTimes(1)
        const [uri, actions, saveOptions] = mockManipulateAsync.mock.calls[0] as ManipulateCall
        expect(uri).toBe(photo.uri)
        expect(actions).toHaveLength(2)
        expect(isCrop(actions[0])).toBe(true)
        expect(resizeWidthOf(actions[1])).toBeLessThanOrEqual(1400)
        expect(saveOptions.compress).toBe(0.9)
        expect(saveOptions.format).toBe(ImageManipulator.SaveFormat.JPEG)
    })

    // Pins LABEL_FRAME being narrower than SCAN_FRAME: same photo, label's crop rect is smaller.
    it('label crop is narrower than meal crop', async () => {
        await processCameraCapture(photo, 'meal')
        await processCameraCapture(photo, 'label')

        const [, mealActions] = mockManipulateAsync.mock.calls[0] as ManipulateCall
        const [, labelActions] = mockManipulateAsync.mock.calls[1] as ManipulateCall
        expect(cropWidthOf(labelActions[0])!).toBeLessThan(cropWidthOf(mealActions[0])!)
    })

    // Pins the measured-layout crop mapping. Hand-computed: photo 3000x4000 cover-fit in a 390x800
    // preview gives pxPerPt = min(3000/390, 4000/800) = 5 and hides (3000-390*5)/2 = 525px per side
    // horizontally (nothing vertically), so a frame at (39, 100) sized 312x446 crops the rect below.
    it('crops exactly where the measured frame sat in the preview', async () => {
        const layout = { previewWidth: 390, previewHeight: 800, frameLeft: 39, frameTop: 100, frameWidth: 312, frameHeight: 446 }
        await processCameraCapture(photo, 'meal', layout)

        const [, actions] = mockManipulateAsync.mock.calls[0] as ManipulateCall
        expect(cropOf(actions[0])).toEqual({ originX: 525 + 39 * 5, originY: 100 * 5, width: 312 * 5, height: 446 * 5 })
    })

    // Pins that resize never upscales: a crop narrower than the mode's width ceiling keeps its
    // natural width. Hand-computed: pxPerPt = min(3000/390, 4000/800) = 5, so a 214.5pt-wide
    // label frame crops 214.5 * 5 = 1072.5px — under the 1400 ceiling, so resize stays 1072.5.
    it('label capture never upscales past its crop width', async () => {
        const layout = { previewWidth: 390, previewHeight: 800, frameLeft: 87.75, frameTop: 100, frameWidth: 214.5, frameHeight: 446 }
        await processCameraCapture(photo, 'label', layout)

        const [, actions] = mockManipulateAsync.mock.calls[0] as ManipulateCall
        expect(resizeWidthOf(actions[1])).toBe(1072.5)
    })

    // Pins the label frame shape: narrower than meal but the exact same height (tall label strip).
    it('label frame is narrower than meal frame at the same height', () => {
        const meal = getFrameSize(390, 'meal')
        const label = getFrameSize(390, 'label')
        expect(label.width).toBeLessThan(meal.width)
        expect(label.height).toBe(meal.height)
    })
})

describe('measureCaptureLayout', () => {
    // Minimal View-like stub whose measureInWindow reports the given rect synchronously.
    function stubView(x: number, y: number, width: number, height: number): View {
        return { measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => cb(x, y, width, height) } as unknown as View
    }

    it('measures preview and frame into a preview-relative CaptureLayout', async () => {
        const preview = stubView(10, 20, 390, 800)
        const frame = stubView(49, 120, 312, 446)

        expect(await measureCaptureLayout(preview, frame)).toEqual({
            previewWidth: 390,
            previewHeight: 800,
            frameLeft: 39,
            frameTop: 100,
            frameWidth: 312,
            frameHeight: 446,
        })
    })

    // A view mid-layout can report 0x0 from measureInWindow; that must not reach processCameraCapture's
    // crop math, where dividing by a 0 preview dimension produces an Infinity/NaN crop rect that bypasses
    // expo-image-manipulator's bounds check (it only rejects positive out-of-range numbers, not NaN).
    it.each([
        ['preview', stubView(0, 0, 0, 0), stubView(49, 120, 312, 446)],
        ['frame', stubView(10, 20, 390, 800), stubView(0, 0, 0, 0)],
    ])('returns null when the %s view measures as 0x0', async (_label, preview, frame) => {
        expect(await measureCaptureLayout(preview, frame)).toBeNull()
    })
})
