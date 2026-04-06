import { CameraView, useCameraPermissions } from 'expo-camera'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Barcode } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function BarcodeScreen() {
    const router = useRouter()
    const [permission, requestPermission] = useCameraPermissions()
    const [scannedData, setScannedData] = useState<string | null>(null)
    const [barcodeType, setBarcodeType] = useState<string | null>(null)

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
                            <Barcode size={48} color="#22C922" strokeWidth={2.5} />
                        </View>
                        <Text style={styles.permissionTitle}>Camera Access Required</Text>
                        <Text style={styles.permissionMessage}>We need access to your camera to scan product barcodes for nutrition information.</Text>
                        <TouchableOpacity onPress={requestPermission} activeOpacity={0.8} style={styles.permissionButtonTouchable}>
                            <LinearGradient colors={['#3CB855', '#22C922', '#5CE073']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.permissionButton}>
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

    function handleBarcodeScanned(scanningResult: any) {
        if (scanningResult.data) {
            setScannedData(scanningResult.data)
            setBarcodeType(scanningResult.type || 'Unknown')
        }
    }

    function resetScan() {
        setScannedData(null)
        setBarcodeType(null)
    }

    // Scanned result view
    if (scannedData) {
        return (
            <View style={styles.container}>
                <View style={styles.resultContainer}>
                    {/* Drag Handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    {/* Result Content */}
                    <View style={styles.resultContent}>
                        <View style={styles.resultIconCircle}>
                            <Barcode size={56} color="#22C922" strokeWidth={2.5} />
                        </View>

                        <Text style={styles.resultTitle}>Barcode Scanned</Text>

                        <View style={styles.dataContainer}>
                            <Text style={styles.dataLabel}>Type:</Text>
                            <Text style={styles.dataValue}>{barcodeType}</Text>
                        </View>

                        <View style={styles.dataContainer}>
                            <Text style={styles.dataLabel}>Data:</Text>
                            <Text style={styles.dataValue} selectable>
                                {scannedData}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={resetScan} activeOpacity={0.8} style={styles.scanAgainButtonTouchable}>
                            <LinearGradient colors={['#3CB855', '#22C922', '#5CE073']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scanAgainButton}>
                                <Text style={styles.scanAgainButtonText}>Scan Again</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        )
    }

    // Barcode scanner view
    return (
        <View style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainerAbsolute}>
                <View style={styles.handle} />
            </View>

            <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'qr'],
                }}
                onBarcodeScanned={handleBarcodeScanned}
            >
                {/* Scanning Frame */}
                <View style={styles.scannerContainerWithTop}>
                    <View style={styles.scannerFrame}>
                        {/* Corner decorations */}
                        <View style={[styles.corner, styles.cornerTopLeft]} />
                        <View style={[styles.corner, styles.cornerTopRight]} />
                        <View style={[styles.corner, styles.cornerBottomLeft]} />
                        <View style={[styles.corner, styles.cornerBottomRight]} />

                        {/* Animated scan line effect */}
                        <View style={styles.scanLine} />
                    </View>

                    <View style={styles.instructionsBox}>
                        <Text style={styles.instructionsText}>Align barcode within frame</Text>
                    </View>
                </View>

                {/* Info at bottom */}
                <View style={styles.bottomInfo}>
                    <View style={styles.infoBox}>
                        <Barcode size={20} color="#22C922" strokeWidth={2.5} />
                        <Text style={styles.infoText}>Point at product barcode to scan</Text>
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
    scannerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerContainerWithTop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 25,
    },
    scannerFrame: {
        width: 280,
        height: 200,
        borderWidth: 2,
        borderColor: 'rgba(76, 217, 100, 0.5)',
        borderRadius: 12,
        position: 'relative',
        backgroundColor: 'transparent',
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
        borderTopLeftRadius: 12,
    },
    cornerTopRight: {
        top: -2,
        right: -2,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    cornerBottomLeft: {
        bottom: -2,
        left: -2,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    cornerBottomRight: {
        bottom: -2,
        right: -2,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    scanLine: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#22C922',
        opacity: 0.7,
    },
    instructionsBox: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 32,
    },
    instructionsText: {
        color: '#FFF',
        fontSize: 16,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    bottomInfo: {
        paddingBottom: Platform.OS === 'ios' ? 40 : 30,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    infoText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    resultContainer: {
        flex: 1,
        backgroundColor: '#121212',
    },
    resultContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    resultIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#22C922',
        marginBottom: 32,
    },
    resultTitle: {
        fontSize: 28,
        color: '#FFF',
        marginBottom: 32,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    dataContainer: {
        width: '100%',
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    dataLabel: {
        fontSize: 13,
        color: '#888',
        marginBottom: 6,
        letterSpacing: -0.5,
        textTransform: 'uppercase',
        fontFamily: 'Poppins_600SemiBold',
    },
    dataValue: {
        fontSize: 16,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    scanAgainButtonTouchable: {
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
        marginTop: 16,
    },
    scanAgainButton: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanAgainButtonText: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
