import ScanBackdrop from '@/components/NutritionComponents/ScanBackdrop'
import PromptCard from '@/components/NeutralComponents/PromptCard'
import { useBilling } from '@/context/BillingContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { useScreenBottomPad } from '@/lib/hooks/useScreenBottomPad'
import { useSubmitOnce } from '@/lib/hooks/useSubmitOnce'
import { getFrameSize, measureCaptureLayout, processCameraCapture, processPickedImageUri, type ScanMode } from '@/lib/openAI/mealImage'
import { nextPermissionAction, openAppSettings } from '@/lib/utils/permissions'
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Camera, FlipHorizontal, Images, Settings, Sparkles, Tag, Utensils, Zap } from 'lucide-react-native'
import { useMemo, useRef, useState } from 'react'
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'

export default function CameraScreen() {
    const router = useRouter()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const bottomPad = useScreenBottomPad(6)
    const cameraRef = useRef<CameraView>(null)
    // Measured at shutter time so the capture crop lands exactly where the on-screen frame sat.
    const previewRef = useRef<View>(null)
    const frameRef = useRef<View>(null)
    const [facing, setFacing] = useState<CameraType>('back')
    const [permission, requestPermission] = useCameraPermissions()
    const { hasPremium } = useBilling()
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
    const [flashEnabled, setFlashEnabled] = useState(false)
    const [pickingFromLibrary, setPickingFromLibrary] = useState(false)
    // Two single-flight guards: the shutter re-enables after each shot; "Use Photo"
    // stays disabled after firing (it navigates to a paid AI analysis — never twice)
    // and is re-armed on retake.
    const [guardShutter, capturing] = useSubmitOnce()
    const [guardUsePhoto, usingPhoto, resetUsePhoto] = useSubmitOnce()
    const [scanKind, setScanKind] = useState<ScanMode>('meal')
    const scanMode: ScanMode = scanKind
    // On-screen frame matches the mode's capture crop exactly — same getFrameSize the crop math uses.
    const { width: windowWidth } = useWindowDimensions()
    const frameSize = getFrameSize(windowWidth, scanKind)

    if (!hasPremium) {
        return (
            <View style={styles.cameraContainer}>
                <View style={styles.handleContainerAbsolute}>
                    <View style={styles.handle} />
                </View>
                <ScanBackdrop />
                <PromptCard
                    icon={Sparkles}
                    title="Scan Meals with AI"
                    message="Snap a photo of any food or nutrition label and let AI log the macros for you. Upgrade to unlock scanning."
                    ctaLabel="Upgrade to Scan"
                    onPress={() => router.replace('/settingsScreens/subscription')}
                    onGoBack={() => router.back()}
                />
            </View>
        )
    }

    if (!permission) {
        return (
            <View style={styles.cameraContainer}>
                <View style={styles.handleContainerAbsolute}>
                    <View style={styles.handle} />
                </View>
                <ScanBackdrop />
            </View>
        )
    }

    if (!permission.granted) {
        const needsSettings = nextPermissionAction(permission) === 'settings'
        return (
            <View style={styles.cameraContainer}>
                <View style={styles.handleContainerAbsolute}>
                    <View style={styles.handle} />
                </View>
                <ScanBackdrop />
                <PromptCard
                    icon={needsSettings ? Settings : Camera}
                    title={needsSettings ? 'Camera Access Denied' : 'Camera Access Required'}
                    message={
                        needsSettings ?
                            'Camera access is turned off for this app. Enable Camera in Settings to scan your meals.'
                        :   'We need access to your camera to take photos of your meals for nutrition tracking with AI analysis.'
                    }
                    ctaLabel={needsSettings ? 'Open Settings' : 'Grant Permission'}
                    onPress={needsSettings ? openAppSettings : requestPermission}
                    onGoBack={() => router.back()}
                />
            </View>
        )
    }

    function toggleCameraFacing() {
        setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'))
    }

    function toggleFlash() {
        setFlashEnabled((current: boolean) => !current)
    }

    async function takePicture() {
        if (!cameraRef.current) return
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
            })
            if (photo) {
                const layout = await measureCaptureLayout(previewRef.current, frameRef.current)
                const uri = await processCameraCapture(photo, scanMode, layout ?? undefined)
                setCapturedPhoto(uri)
            }
        } catch {
            Alert.alert('Error', 'Failed to take picture. Please try again.')
        }
    }

    async function pickFromLibrary() {
        if (pickingFromLibrary) return
        setPickingFromLibrary(true)
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (!permissionResult.granted) {
                if (nextPermissionAction(permissionResult) === 'settings') {
                    Alert.alert('Photo Library Access', 'Enable photo access in Settings to choose a meal photo.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: openAppSettings },
                    ])
                } else {
                    Alert.alert('Permission Required', 'Please allow access to your photo library to choose a meal photo.')
                }
                return
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            })

            if (result.canceled || !result.assets[0]?.uri) return

            const uri = await processPickedImageUri(result.assets[0].uri, scanMode)
            setCapturedPhoto(uri)
        } catch {
            Alert.alert('Error', 'Failed to load photo from library. Please try again.')
        } finally {
            setPickingFromLibrary(false)
        }
    }

    function retakePhoto() {
        setCapturedPhoto(null)
        resetUsePhoto() // allow the next captured photo to be submitted
    }

    function usePhoto() {
        if (capturedPhoto) {
            router.push({
                pathname: '/nutritionScreens/analyzingModal',
                params: { photoUri: capturedPhoto, mode: scanMode },
            })
        }
    }

    if (capturedPhoto) {
        return (
            <View style={styles.cameraContainer}>
                <View style={styles.handleContainerAbsolute}>
                    <View style={styles.handle} />
                </View>

                <Image source={{ uri: capturedPhoto }} style={styles.preview} resizeMode="contain" />

                <View style={[styles.previewActions, { paddingBottom: bottomPad }]}>
                    <TouchableOpacity onPress={retakePhoto} style={styles.retakeButton} activeOpacity={0.5}>
                        <Text style={styles.retakeButtonText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={guardUsePhoto(usePhoto)} disabled={usingPhoto} activeOpacity={0.8} style={styles.usePhotoButtonTouchable}>
                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.usePhotoButton}>
                            <Text style={styles.usePhotoButtonText}>Use Photo</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <View ref={previewRef} style={styles.cameraContainer}>
            <View style={styles.handleContainerAbsolute}>
                <View style={styles.handle} />
            </View>

            {/* pictureSize "Photo" = the full-resolution photo pipeline; the default "High" captures low-res 1920x1080 video frames. */}
            <CameraView ref={cameraRef} style={styles.camera} facing={facing} enableTorch={flashEnabled} pictureSize={Platform.OS === 'ios' ? 'Photo' : undefined} />

            {/* Overlay is a sibling stacked on top — CameraView does not support children. */}
            <View style={styles.overlay} pointerEvents="box-none">
                <View style={styles.topBar}>
                    <View style={styles.spacer} />
                    <View style={styles.modeToggle}>
                        <TouchableOpacity onPress={() => setScanKind('meal')} style={[styles.modeButton, scanKind === 'meal' && styles.modeButtonActive]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Scan food">
                            <Utensils size={14} color={scanKind === 'meal' ? '#FFF' : '#CCC'} strokeWidth={2.5} />
                            <Text style={[styles.modeButtonText, scanKind === 'meal' && styles.modeButtonTextActive]}>Food</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setScanKind('label')} style={[styles.modeButton, scanKind === 'label' && styles.modeButtonActive]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Scan a nutrition label">
                            <Tag size={14} color={scanKind === 'label' ? '#FFF' : '#CCC'} strokeWidth={2.5} />
                            <Text style={[styles.modeButtonText, scanKind === 'label' && styles.modeButtonTextActive]}>Label</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={toggleFlash} style={[styles.flashButton, flashEnabled && styles.flashButtonActive]} activeOpacity={0.5}>
                        <Zap size={24} color={flashEnabled ? '#FFF' : '#AAA'} strokeWidth={2.5} fill={flashEnabled ? '#FFF' : 'transparent'} />
                    </TouchableOpacity>
                </View>

                <View style={styles.frameContainer}>
                    <View ref={frameRef} style={[styles.frame, { width: frameSize.width, height: frameSize.height }]}>
                        <View style={[styles.corner, styles.cornerTopLeft]} />
                        <View style={[styles.corner, styles.cornerTopRight]} />
                        <View style={[styles.corner, styles.cornerBottomLeft]} />
                        <View style={[styles.corner, styles.cornerBottomRight]} />
                    </View>
                    <Text style={styles.frameHint}>
                        {scanKind === 'label' ? 'Fit the nutrition label in frame' : 'Center your food in frame'}
                    </Text>
                </View>

                <View style={[styles.controls, { paddingBottom: bottomPad }]}>
                    <View style={styles.controlsInner}>
                        <TouchableOpacity onPress={pickFromLibrary} style={[styles.sideButton, pickingFromLibrary && styles.sideButtonDisabled]} activeOpacity={0.5} disabled={pickingFromLibrary} accessibilityLabel="Choose photo from library" accessibilityRole="button">
                            <Images size={26} color="#FFF" strokeWidth={2.5} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={guardShutter(takePicture, { retryable: true })} disabled={capturing} style={styles.captureButton} activeOpacity={0.8} accessibilityLabel="Take photo" accessibilityRole="button">
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleCameraFacing} style={styles.sideButton} activeOpacity={0.5} accessibilityLabel="Flip camera" accessibilityRole="button">
                            <FlipHorizontal size={28} color="#FFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        cameraContainer: {
            flex: 1,
            backgroundColor: '#000',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
        },
        handleContainerAbsolute: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 8,
            zIndex: 10,
            backgroundColor: 'rgba(18, 18, 18, 0.8)',
        },
        handle: {
            width: 40,
            height: 5,
            backgroundColor: '#333',
            borderRadius: 3,
        },
        camera: {
            flex: 1,
        },
        // Covers the camera exactly; lays out topBar / frameContainer / controls in the same column the camera fills.
        overlay: {
            ...StyleSheet.absoluteFillObject,
        },
        topBar: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: Platform.OS === 'ios' ? 35 : 25,
            paddingBottom: 20,
        },
        spacer: {
            width: 44,
        },
        modeToggle: {
            flexDirection: 'row',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 22,
            padding: 3,
        },
        modeButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 19,
        },
        modeButtonActive: {
            backgroundColor: colors.nutrition,
        },
        modeButtonText: {
            fontSize: 14,
            color: '#CCC',
            letterSpacing: -0.3,
            fontFamily: fonts.semibold,
        },
        modeButtonTextActive: {
            color: '#FFF',
        },
        frameHint: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 13,
            color: '#FFF',
            letterSpacing: -0.2,
            fontFamily: fonts.medium,
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
        },
        flashButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        flashButtonActive: {
            backgroundColor: colors.nutrition + '4D',
        },
        frameContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        // width/height come inline from getFrameSize(windowWidth, scanKind) — per-mode, not static.
        frame: {
            borderWidth: 2,
            borderColor: colors.nutrition + '80',
            borderRadius: 16,
            position: 'relative',
        },
        corner: {
            position: 'absolute',
            width: 30,
            height: 30,
            borderColor: colors.nutrition,
        },
        cornerTopLeft: {
            top: -2,
            left: -2,
            borderTopWidth: 4,
            borderLeftWidth: 4,
            borderTopLeftRadius: 16,
        },
        cornerTopRight: {
            top: -2,
            right: -2,
            borderTopWidth: 4,
            borderRightWidth: 4,
            borderTopRightRadius: 16,
        },
        cornerBottomLeft: {
            bottom: -2,
            left: -2,
            borderBottomWidth: 4,
            borderLeftWidth: 4,
            borderBottomLeftRadius: 16,
        },
        cornerBottomRight: {
            bottom: -2,
            right: -2,
            borderBottomWidth: 4,
            borderRightWidth: 4,
            borderBottomRightRadius: 16,
        },
        controls: {
            paddingHorizontal: 20,
        },
        controlsInner: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        sideButton: {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        sideButtonDisabled: {
            opacity: 0.5,
        },
        captureButton: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 4,
            borderColor: '#FFF',
        },
        captureButtonInner: {
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: '#FFF',
        },
        preview: {
            flex: 1,
            width: '100%',
            height: '100%',
        },
        previewActions: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 20,
            gap: 12,
        },
        retakeButton: {
            flex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.3)',
        },
        retakeButtonText: {
            color: '#FFF',
            fontSize: 17,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        usePhotoButtonTouchable: {
            flex: 2,
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: 8,
        },
        usePhotoButton: {
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        usePhotoButtonText: {
            fontSize: 17,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
    })
}
