// Shared image pipeline for nutrition AI photos.
// Used by the camera screen AND the dev AI test harness so both run the identical
// production processing (no drift).

import * as ImageManipulator from 'expo-image-manipulator'
import { Dimensions } from 'react-native'

export type ScanMode = 'meal' | 'label'

/**
 * Single source of truth for the capture frame. Drives BOTH the on-screen frame in
 * cameraScreen.tsx AND the meal-capture crop below — change it here only.
 * `aspectRatio` is width:height (matches the RN style prop).
 */
export const SCAN_FRAME = { widthPct: 0.8, maxWidth: 360, aspectRatio: 3 / 4 } as const

/** On-screen frame size for a given screen width (width = capped %, height from aspect ratio). */
export function getFrameSize(screenWidth: number): { width: number; height: number } {
    const width = Math.min(screenWidth * SCAN_FRAME.widthPct, SCAN_FRAME.maxWidth)
    return { width, height: width / SCAN_FRAME.aspectRatio }
}

// Meal photos: cropped to the on-screen frame, downscaled for cheap/fast vision.
const MEAL_IMAGE_MAX_WIDTH = 800
const MEAL_IMAGE_COMPRESS = 0.8

// Label photos: NOT cropped, kept high-res so small printed text stays legible for OCR.
const LABEL_IMAGE_MAX_WIDTH = 1400
const LABEL_IMAGE_COMPRESS = 0.9

/** Resize and compress an image URI (library picks). Label mode keeps it high-res. */
export async function processPickedImageUri(uri: string, mode: ScanMode = 'meal'): Promise<string> {
    const width = mode === 'label' ? LABEL_IMAGE_MAX_WIDTH : MEAL_IMAGE_MAX_WIDTH
    const compress = mode === 'label' ? LABEL_IMAGE_COMPRESS : MEAL_IMAGE_COMPRESS
    const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width } }],
        { compress, format: ImageManipulator.SaveFormat.JPEG },
    )
    return result.uri
}

/**
 * Camera capture.
 * - meal: crop toward the on-screen frame, then resize (keeps the plate, drops background).
 * - label: no crop, high-res resize (keep the whole label sharp enough to read).
 */
export async function processCameraCapture(photo: { uri: string; width: number; height: number }, mode: ScanMode = 'meal'): Promise<string> {
    if (mode === 'label') {
        const result = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: { width: LABEL_IMAGE_MAX_WIDTH } }],
            { compress: LABEL_IMAGE_COMPRESS, format: ImageManipulator.SaveFormat.JPEG },
        )
        return result.uri
    }

    const screenWidth = Dimensions.get('window').width
    const screenHeight = Dimensions.get('window').height
    // Crop to the SAME frame the user sees on screen (single source of truth: SCAN_FRAME).
    const { width: frameWidthOnScreen, height: frameHeightOnScreen } = getFrameSize(screenWidth)

    const scaleX = photo.width / screenWidth
    const scaleY = photo.height / screenHeight
    const scale = Math.max(scaleX, scaleY)

    const cropWidth = frameWidthOnScreen * scale
    const cropHeight = frameHeightOnScreen * scale
    const cropX = (photo.width - cropWidth) / 2
    const cropY = (photo.height - cropHeight) / 2

    const croppedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
            {
                crop: {
                    originX: Math.max(0, cropX),
                    originY: Math.max(0, cropY),
                    width: Math.min(cropWidth, photo.width),
                    height: Math.min(cropHeight, photo.height),
                },
            },
            { resize: { width: MEAL_IMAGE_MAX_WIDTH } },
        ],
        { compress: MEAL_IMAGE_COMPRESS, format: ImageManipulator.SaveFormat.JPEG },
    )
    return croppedImage.uri
}
