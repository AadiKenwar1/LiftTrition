import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { processCameraCapture, processPickedImageUri, SCAN_FRAME, type ScanMode } from '@/lib/openAI/mealImage'
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Camera, FlipHorizontal, Images, Package, Tag, Utensils, Zap } from 'lucide-react-native'
import { useMemo, useRef, useState } from 'react'
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function CameraScreen() {
    const router = useRouter()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const cameraRef = useRef<CameraView>(null)
    const [facing, setFacing] = useState<CameraType>('back')
    const [permission, requestPermission] = useCameraPermissions()
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
    const [flashEnabled, setFlashEnabled] = useState(false)
    const [pickingFromLibrary, setPickingFromLibrary] = useState(false)
    const [scanKind, setScanKind] = useState<'meal' | 'item' | 'label'>('meal')
    const scanMode: ScanMode = scanKind === 'label' ? 'label' : 'meal'

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>Loading camera...</Text>
            </View>
        )
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                <View style={styles.permissionContentWrapper}>
                    <View style={styles.permissionContent}>
                        <View style={styles.iconCircle}>
                            <Camera size={48} color={colors.nutrition} strokeWidth={2.5} />
                        </View>
                        <Text style={styles.permissionTitle}>Camera Access Required</Text>
                        <Text style={styles.permissionMessage}>We need access to your camera to take photos of your meals for nutrition tracking with AI analysis.</Text>
                        <TouchableOpacity onPress={requestPermission} activeOpacity={0.8} style={styles.permissionButtonTouchable}>
                            <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.permissionButton}>
                                <Text style={styles.permissionButtonText}>Grant Permission</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton} activeOpacity={0.5}>
                            <Text style={styles.cancelButtonText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
                const uri = await processCameraCapture(photo, scanMode)
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
                Alert.alert('Permission Required', 'Please allow access to your photo library to choose a meal photo.')
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

                <View style={styles.previewActions}>
                    <TouchableOpacity onPress={retakePhoto} style={styles.retakeButton} activeOpacity={0.5}>
                        <Text style={styles.retakeButtonText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={usePhoto} activeOpacity={0.8} style={styles.usePhotoButtonTouchable}>
                        <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.usePhotoButton}>
                            <Text style={styles.usePhotoButtonText}>Use Photo</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <View style={styles.cameraContainer}>
            <View style={styles.handleContainerAbsolute}>
                <View style={styles.handle} />
            </View>

            <CameraView ref={cameraRef} style={styles.camera} facing={facing} enableTorch={flashEnabled}>
                <View style={styles.topBar}>
                    <View style={styles.spacer} />
                    <View style={styles.modeToggle}>
                        <TouchableOpacity onPress={() => setScanKind('meal')} style={[styles.modeButton, scanKind === 'meal' && styles.modeButtonActive]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Scan a meal">
                            <Utensils size={14} color={scanKind === 'meal' ? '#FFF' : '#CCC'} strokeWidth={2.5} />
                            <Text style={[styles.modeButtonText, scanKind === 'meal' && styles.modeButtonTextActive]}>Meal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setScanKind('item')} style={[styles.modeButton, scanKind === 'item' && styles.modeButtonActive]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Scan a food or branded item">
                            <Package size={14} color={scanKind === 'item' ? '#FFF' : '#CCC'} strokeWidth={2.5} />
                            <Text style={[styles.modeButtonText, scanKind === 'item' && styles.modeButtonTextActive]}>Item</Text>
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
                    <View style={styles.frame}>
                        <View style={[styles.corner, styles.cornerTopLeft]} />
                        <View style={[styles.corner, styles.cornerTopRight]} />
                        <View style={[styles.corner, styles.cornerBottomLeft]} />
                        <View style={[styles.corner, styles.cornerBottomRight]} />
                    </View>
                    <Text style={styles.frameHint}>
                        {scanKind === 'label' ?
                            'Fit the nutrition label in frame'
                        : scanKind === 'item' ?
                            'Center the food or branded item in frame'
                        :   'Center your meal in frame'}
                    </Text>
                </View>

                <View style={styles.controls}>
                    <View style={styles.controlsInner}>
                        <TouchableOpacity onPress={pickFromLibrary} style={[styles.sideButton, pickingFromLibrary && styles.sideButtonDisabled]} activeOpacity={0.5} disabled={pickingFromLibrary} accessibilityLabel="Choose photo from library" accessibilityRole="button">
                            <Images size={26} color="#FFF" strokeWidth={2.5} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={takePicture} style={styles.captureButton} activeOpacity={0.8} accessibilityLabel="Take photo" accessibilityRole="button">
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleCameraFacing} style={styles.sideButton} activeOpacity={0.5} accessibilityLabel="Flip camera" accessibilityRole="button">
                            <FlipHorizontal size={28} color="#FFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
        },
        cameraContainer: {
            flex: 1,
            backgroundColor: '#000',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
        },
        handleContainer: {
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 8,
            backgroundColor: colors.background,
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
        permissionContentWrapper: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
        },
        permissionContent: {
            alignItems: 'center',
            width: '100%',
        },
        iconCircle: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.nutrition,
            marginBottom: 24,
        },
        permissionTitle: {
            fontSize: 24,
            color: colors.text,
            marginBottom: 6,
            textAlign: 'center',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        permissionMessage: {
            fontSize: 14,
            color: colors.labelMuted,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 32,
            fontFamily: fonts.regular,
            letterSpacing: 0.2,
        },
        permissionText: {
            color: colors.text,
            fontSize: 16,
            fontFamily: fonts.regular,
        },
        permissionButtonTouchable: {
            width: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: colors.nutrition,
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
            marginBottom: 12,
        },
        permissionButton: {
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        permissionButtonText: {
            fontSize: 17,
            color: '#FFF',
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
        },
        cancelButton: {
            paddingVertical: 14,
            paddingHorizontal: 24,
        },
        cancelButtonText: {
            fontSize: 16,
            color: colors.labelMuted,
            letterSpacing: -0.5,
            fontFamily: fonts.semibold,
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
        frame: {
            width: `${SCAN_FRAME.widthPct * 100}%`,
            maxWidth: SCAN_FRAME.maxWidth,
            aspectRatio: SCAN_FRAME.aspectRatio,
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
            paddingBottom: Platform.OS === 'ios' ? 40 : 30,
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
            paddingBottom: Platform.OS === 'ios' ? 40 : 30,
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
