// Shared image pipeline for nutrition AI photos.
// Used by the camera screen AND the dev AI test harness so both run the identical
// production processing (no drift).

import * as ImageManipulator from 'expo-image-manipulator'
import { Dimensions } from 'react-native'

export type ScanMode = 'meal' | 'item' | 'label'

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

// M9: every WIDTH/COMPRESS pair below is jointly load-bearing for base64 payload size (pinned
// together in mealImage.test.ts) — resize bounds width only, so height/pixel-count safety for
// library picks additionally depends on cameraScreen.tsx's allowsEditing:true (iOS square crop).
// Meal photos: cropped to the on-screen frame, downscaled for cheap/fast vision (recognition task).
const MEAL_IMAGE_MAX_WIDTH = 800
const MEAL_IMAGE_COMPRESS = 0.8

// Item & label photos: NOT cropped, kept high-res so printed product/label text stays legible (OCR task).
const TEXT_IMAGE_MAX_WIDTH = 1400
const TEXT_IMAGE_COMPRESS = 0.9

/** Resize and compress an image URI (library picks). Item/label keep it high-res for text reading. */
export async function processPickedImageUri(uri: string, mode: ScanMode = 'meal'): Promise<string> {
    const width = mode === 'meal' ? MEAL_IMAGE_MAX_WIDTH : TEXT_IMAGE_MAX_WIDTH
    const compress = mode === 'meal' ? MEAL_IMAGE_COMPRESS : TEXT_IMAGE_COMPRESS
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
 * - item/label: no crop, high-res resize (keep the whole package/label sharp enough to read text).
 */
export async function processCameraCapture(photo: { uri: string; width: number; height: number }, mode: ScanMode = 'meal'): Promise<string> {
    if (mode !== 'meal') {
        const result = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: { width: TEXT_IMAGE_MAX_WIDTH } }],
            { compress: TEXT_IMAGE_COMPRESS, format: ImageManipulator.SaveFormat.JPEG },
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
