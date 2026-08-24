// Shared image pipeline for nutrition AI photos.
// Used by the camera screen AND the dev AI test harness, which share the resize/compress
// path below (no drift). Capture cropping is camera-only — it needs a measured live preview,
// which the harness has none of, so harness runs send the uncropped image for every mode.

import * as ImageManipulator from 'expo-image-manipulator'
import { Dimensions, type View } from 'react-native'

// 'meal' covers every food photo — plated meals and packaged products alike (the old 'item'
// mode merged into it); the edge function still accepts 'item' from older builds.
export type ScanMode = 'meal' | 'label'

/**
 * Single source of truth for the capture frames. Drives BOTH the on-screen frame in
 * cameraScreen.tsx AND the capture crops below — change them here only.
 * `aspectRatio` is width:height (matches the RN style prop).
 */
export const SCAN_FRAME = { widthPct: 0.8, maxWidth: 400, aspectRatio: 0.7 } as const
// Label frame: narrower than SCAN_FRAME but the SAME height — a tall strip shaped like a Nutrition Facts panel.
export const LABEL_FRAME = { widthPct: 0.55, maxWidth: 250 } as const

/** On-screen frame size for a given screen width — label is narrower than the food frame at the same height. */
export function getFrameSize(screenWidth: number, mode: ScanMode = 'meal'): { width: number; height: number } {
    const mealWidth = Math.min(screenWidth * SCAN_FRAME.widthPct, SCAN_FRAME.maxWidth)
    const height = mealWidth / SCAN_FRAME.aspectRatio
    const width = mode === 'label' ? Math.min(screenWidth * LABEL_FRAME.widthPct, LABEL_FRAME.maxWidth) : mealWidth
    return { width, height }
}

// M9: every WIDTH/COMPRESS pair below is jointly load-bearing for base64 payload size (pinned
// together in mealImage.test.ts) — resize bounds width only, so height/pixel-count safety for
// library picks additionally depends on cameraScreen.tsx's allowsEditing:true (iOS square crop).
// Food photos (meals and packaged products): cropped to the on-screen frame, then downscaled —
// the crop is what keeps packaging text legible, because the subject fills the sent image.
const MEAL_IMAGE_MAX_WIDTH = 800
const MEAL_IMAGE_COMPRESS = 0.8

// Label photos: kept high-res so printed label text stays legible (OCR task); captures crop to LABEL_FRAME.
const LABEL_IMAGE_MAX_WIDTH = 1400
const LABEL_IMAGE_COMPRESS = 0.9

/** Resize and compress an image URI (library picks). Label keeps it high-res for text reading. */
export async function processPickedImageUri(uri: string, mode: ScanMode = 'meal'): Promise<string> {
    const width = mode === 'meal' ? MEAL_IMAGE_MAX_WIDTH : LABEL_IMAGE_MAX_WIDTH
    const compress = mode === 'meal' ? MEAL_IMAGE_COMPRESS : LABEL_IMAGE_COMPRESS
    const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width } }],
        { compress, format: ImageManipulator.SaveFormat.JPEG },
    )
    return result.uri
}

// Where the live preview and the frame actually sat on screen when the shutter fired (preview points).
export type CaptureLayout = {
    previewWidth: number
    previewHeight: number
    frameLeft: number
    frameTop: number
    frameWidth: number
    frameHeight: number
}

/** Measures the preview and frame views into a CaptureLayout; null if either is unmounted or not yet laid out. */
export function measureCaptureLayout(preview: View | null, frame: View | null): Promise<CaptureLayout | null> {
    if (!preview || !frame) return Promise.resolve(null)
    const rect = (view: View) =>
        new Promise<{ x: number; y: number; width: number; height: number }>((resolve) =>
            view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height })),
        )
    return Promise.all([rect(preview), rect(frame)]).then(([p, f]) => {
        // A view mid-layout can report 0x0 here; dividing by that in processCameraCapture would produce
        // an Infinity/NaN crop rect that silently passes expo-image-manipulator's bounds check instead of
        // failing it cleanly (the check only rejects positive out-of-range numbers, not NaN comparisons).
        if (p.width <= 0 || p.height <= 0 || f.width <= 0 || f.height <= 0) return null
        return {
            previewWidth: p.width,
            previewHeight: p.height,
            frameLeft: f.x - p.x,
            frameTop: f.y - p.y,
            frameWidth: f.width,
            frameHeight: f.height,
        }
    })
}

// Window-sized, frame-centered stand-in for callers that cannot measure the real preview (tests, harnesses).
function fallbackLayout(mode: ScanMode): CaptureLayout {
    const { width: previewWidth, height: previewHeight } = Dimensions.get('window')
    const { width: frameWidth, height: frameHeight } = getFrameSize(previewWidth, mode)
    return { previewWidth, previewHeight, frameLeft: (previewWidth - frameWidth) / 2, frameTop: (previewHeight - frameHeight) / 2, frameWidth, frameHeight }
}

/**
 * Camera capture.
 * - meal (any food photo): crop to the on-screen frame, then resize (keeps the food, drops
 *   background — a product filling the frame keeps its packaging text sharp).
 * - label: crop to the narrower LABEL_FRAME, high-res resize (label text must stay readable).
 */
export async function processCameraCapture(photo: { uri: string; width: number; height: number }, mode: ScanMode = 'meal', layout?: CaptureLayout): Promise<string> {
    const resizeWidth = mode === 'meal' ? MEAL_IMAGE_MAX_WIDTH : LABEL_IMAGE_MAX_WIDTH
    const compress = mode === 'meal' ? MEAL_IMAGE_COMPRESS : LABEL_IMAGE_COMPRESS

    // Crop to the SAME rectangle the user saw in the preview, measured at shutter time.
    const { previewWidth, previewHeight, frameLeft, frameTop, frameWidth, frameHeight } = layout ?? fallbackLayout(mode)

    // The preview cover-fits the photo, so preview points map to photo pixels by the SMALLER axis ratio.
    const pxPerPt = Math.min(photo.width / previewWidth, photo.height / previewHeight)
    // Cover-fit hides equal margins on the overflowing axis; the frame's offsets are relative to the visible part.
    const hiddenX = (photo.width - previewWidth * pxPerPt) / 2
    const hiddenY = (photo.height - previewHeight * pxPerPt) / 2

    const cropX = Math.max(0, hiddenX + frameLeft * pxPerPt)
    const cropY = Math.max(0, hiddenY + frameTop * pxPerPt)
    const cropWidth = Math.min(frameWidth * pxPerPt, photo.width - cropX)
    const cropHeight = Math.min(frameHeight * pxPerPt, photo.height - cropY)

    const croppedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
            { crop: { originX: cropX, originY: cropY, width: cropWidth, height: cropHeight } },
            // Never upscale: a crop already narrower than the mode's ceiling keeps its natural width.
            { resize: { width: Math.min(resizeWidth, cropWidth) } },
        ],
        { compress, format: ImageManipulator.SaveFormat.JPEG },
    )
    return croppedImage.uri
}
