import { CameraType, CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Camera, FlipHorizontal, Zap } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Alert, Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function CameraScreen() {
    const router = useRouter()
    const cameraRef = useRef<CameraView>(null)
    const [facing, setFacing] = useState<CameraType>('back')
    const [permission, requestPermission] = useCameraPermissions()
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
    const [flashEnabled, setFlashEnabled] = useState(false)

    // Handle permissions
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
                {/* Drag Handle */}
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                <View style={styles.permissionContentWrapper}>
                    <View style={styles.permissionContent}>
                        <View style={styles.iconCircle}>
                            <Camera size={48} color="#22C922" strokeWidth={2.5} />
                        </View>
                        <Text style={styles.permissionTitle}>Camera Access Required</Text>
                        <Text style={styles.permissionMessage}>We need access to your camera to take photos of your meals for nutrition tracking.</Text>
                        <TouchableOpacity onPress={requestPermission} activeOpacity={0.8} style={styles.permissionButtonTouchable}>
                            <LinearGradient colors={['#3CB855', '#22C922', '#5CE073']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.permissionButton}>
                                <Text style={styles.permissionButtonText}>Grant Permission</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton} activeOpacity={0.7}>
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
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: false,
                })
                if (photo) {
                    // Get screen dimensions
                    const screenWidth = Dimensions.get('window').width
                    const frameWidthOnScreen = Math.min(screenWidth * 0.7, 320)
                    const frameHeightOnScreen = frameWidthOnScreen * (4 / 3) // 3:4 aspect ratio

                    // Calculate the scale between photo and screen
                    const scaleX = photo.width / screenWidth
                    const scaleY = photo.height / Dimensions.get('window').height

                    // Use the larger scale to ensure we don't cut off the frame
                    const scale = Math.max(scaleX, scaleY)

                    // Calculate crop dimensions in photo coordinates
                    const cropWidth = frameWidthOnScreen * scale
                    const cropHeight = frameHeightOnScreen * scale

                    // Center the crop
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
                            { resize: { width: 800 } }, // Resize to max 800px width to save costs
                        ],
                        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
                    )

                    setCapturedPhoto(croppedImage.uri)
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to take picture. Please try again.')
            }
        }
    }

    function retakePhoto() {
        setCapturedPhoto(null)
    }

    function usePhoto() {
        if (capturedPhoto) {
            // Navigate to analyzing modal with photo
            router.push({
                pathname: '/nutritionScreens/analyzingModal',
                params: { photoUri: capturedPhoto },
            })
        }
    }

    // Preview captured photo
    if (capturedPhoto) {
        return (
            <View style={styles.container}>
                {/* Drag Handle */}
                <View style={styles.handleContainerAbsolute}>
                    <View style={styles.handle} />
                </View>

                <Image source={{ uri: capturedPhoto }} style={styles.preview} resizeMode="contain" />

                {/* Bottom Actions */}
                <View style={styles.previewActions}>
                    <TouchableOpacity onPress={retakePhoto} style={styles.retakeButton} activeOpacity={0.7}>
                        <Text style={styles.retakeButtonText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={usePhoto} activeOpacity={0.8} style={styles.usePhotoButtonTouchable}>
                        <LinearGradient colors={['#3CB855', '#22C922', '#5CE073']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.usePhotoButton}>
                            <Text style={styles.usePhotoButtonText}>Use Photo</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    // Camera view
    return (
        <View style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainerAbsolute}>
                <View style={styles.handle} />
            </View>

            <CameraView ref={cameraRef} style={styles.camera} facing={facing} enableTorch={flashEnabled}>
                {/* Flash Button */}
                <View style={styles.topBar}>
                    <View style={styles.spacer} />
                    <TouchableOpacity onPress={toggleFlash} style={[styles.flashButton, flashEnabled && styles.flashButtonActive]} activeOpacity={0.7}>
                        <Zap size={24} color={flashEnabled ? '#FFF' : '#AAA'} strokeWidth={2.5} fill={flashEnabled ? '#FFF' : 'transparent'} />
                    </TouchableOpacity>
                </View>

                {/* Framing Box */}
                <View style={styles.frameContainer}>
                    <View style={styles.frame}>
                        {/* Corner guides */}
                        <View style={[styles.corner, styles.cornerTopLeft]} />
                        <View style={[styles.corner, styles.cornerTopRight]} />
                        <View style={[styles.corner, styles.cornerBottomLeft]} />
                        <View style={[styles.corner, styles.cornerBottomRight]} />
                    </View>
                </View>

                {/* Bottom Controls */}
                <View style={styles.controls}>
                    <View style={styles.controlsInner}>
                        <View style={styles.emptySpace} />

                        <TouchableOpacity onPress={takePicture} style={styles.captureButton} activeOpacity={0.8}>
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleCameraFacing} style={styles.flipButton} activeOpacity={0.7}>
                            <FlipHorizontal size={28} color="#FFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: '#121212',
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
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#22C922',
        marginBottom: 24,
    },
    permissionTitle: {
        fontSize: 24,
        color: '#FFF',
        marginBottom: 6,
        textAlign: 'center',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    permissionMessage: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    permissionText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
    },
    permissionButtonTouchable: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#22C922',
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
        fontFamily: 'Poppins_600SemiBold',
    },
    cancelButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
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
    flashButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    flashButtonActive: {
        backgroundColor: 'rgba(76, 217, 100, 0.3)',
    },
    frameContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    frame: {
        width: '70%',
        maxWidth: 320,
        aspectRatio: 3 / 4,
        borderWidth: 2,
        borderColor: 'rgba(76, 217, 100, 0.5)',
        borderRadius: 16,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#22C922',
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
    emptySpace: {
        width: 60,
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
    flipButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
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
        fontFamily: 'Poppins_600SemiBold',
    },
    usePhotoButtonTouchable: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#22C922',
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
        fontFamily: 'Poppins_600SemiBold',
    },
})
