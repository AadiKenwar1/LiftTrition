import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { SCAN_FRAME } from '@/lib/openAI/mealImage'
import { LinearGradient } from 'expo-linear-gradient'
import { FlipHorizontal, Images, Package, Tag, Utensils, Zap } from 'lucide-react-native'
import { useMemo } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

// Static, non-interactive stand-in for the live camera: same chrome (mode pills,
// scan frame, capture controls) over a dark gradient instead of a viewfinder.
// iOS renders no camera preview without granted permission, so every non-granted
// state (free teaser, permission prompt, permanently denied) shares this backdrop.
export default function ScanBackdrop() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])

    return (
        <View style={styles.container} pointerEvents="none">
            <LinearGradient colors={['#1A1A1A', '#0A0A0A', '#000000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />

            <View style={styles.topBar}>
                <View style={styles.spacer} />
                <View style={styles.modeToggle}>
                    <View style={[styles.modeButton, styles.modeButtonActive]}>
                        <Utensils size={14} color="#FFF" strokeWidth={2.5} />
                        <Text style={[styles.modeButtonText, styles.modeButtonTextActive]}>Meal</Text>
                    </View>
                    <View style={styles.modeButton}>
                        <Package size={14} color="#CCC" strokeWidth={2.5} />
                        <Text style={styles.modeButtonText}>Item</Text>
                    </View>
                    <View style={styles.modeButton}>
                        <Tag size={14} color="#CCC" strokeWidth={2.5} />
                        <Text style={styles.modeButtonText}>Label</Text>
                    </View>
                </View>
                <View style={styles.flashButton}>
                    <Zap size={24} color="#AAA" strokeWidth={2.5} />
                </View>
            </View>

            <View style={styles.frameContainer}>
                <View style={styles.frame}>
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
                <Text style={styles.frameHint}>Center your meal in frame</Text>
            </View>

            <View style={styles.controls}>
                <View style={styles.controlsInner}>
                    <View style={styles.sideButton}>
                        <Images size={26} color="#FFF" strokeWidth={2.5} />
                    </View>
                    <View style={styles.captureButton}>
                        <View style={styles.captureButtonInner} />
                    </View>
                    <View style={styles.sideButton}>
                        <FlipHorizontal size={28} color="#FFF" strokeWidth={2.5} />
                    </View>
                </View>
            </View>
        </View>
    )
}

// Mirrors the live-camera chrome styles in app/nutritionScreens/cameraScreen.tsx —
// keep in sync so the swap to the real CameraView doesn't visibly jump.
function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#000',
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
        flashButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
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
    })
}
