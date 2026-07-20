import { useAuth } from '@/context/AuthContext'
import { useNutrition } from '@/context/NutritionContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import type { ScanMode } from '@/lib/openAI/mealImage'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { Sparkles } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Animated, Image, StyleSheet, Text, View } from 'react-native'

export default function AnalyzingModal() {
    const { photoUri, mode, devFakeMs, devFakeOutcome } = useLocalSearchParams<{ photoUri: string; mode?: string; devFakeMs?: string; devFakeOutcome?: string }>()
    const { handleAnalyzeAndAddPhoto } = useNutrition()
    const { userID } = useAuth()
    const router = useRouter()
    const navigation = useNavigation()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [progress] = useState(new Animated.Value(0))
    const [pulseAnim] = useState(new Animated.Value(1))
    const canceledRef = useRef(false)
    // Owns the in-flight attempt's AbortController — recreated per analyzePhoto() call (a retry
    // needs a fresh one; an already-aborted signal can never un-abort).
    const abortControllerRef = useRef<AbortController | null>(null)

    // Normalize param (Expo Router can return string | string[] | undefined)
    const photoUriStr = typeof photoUri === 'string' ? photoUri : photoUri?.[0]
    const rawMode = typeof mode === 'string' ? mode : mode?.[0]
    const modeStr: ScanMode = rawMode === 'label' ? 'label' : rawMode === 'item' ? 'item' : 'meal'
    const devFakeMsStr = typeof devFakeMs === 'string' ? devFakeMs : devFakeMs?.[0]
    const devFakeOutcomeStr = typeof devFakeOutcome === 'string' ? devFakeOutcome : devFakeOutcome?.[0]

    // Swipe-dismiss / hardware back = cancel: drop the in-flight result AND abort the underlying
    // network call (M8) — previously this only set the flag, leaving the edge-function request
    // (and provider billing) running to completion with nothing left to read the response.
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', () => {
            canceledRef.current = true
            abortControllerRef.current?.abort()
        })
        return unsubscribe
    }, [navigation])

    useEffect(() => {
        if (!photoUriStr) {
            router.back()
            return
        }
        // Start animations
        startProgressAnimation()
        startPulseAnimation()

        // Start analysis
        analyzePhoto()
    }, [photoUriStr])

    function startProgressAnimation() {
        Animated.timing(progress, {
            toValue: 1,
            duration: 30000, // 30 seconds to match timeout
            useNativeDriver: false,
        }).start()
    }

    function startPulseAnimation() {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
        ).start()
    }

    async function analyzePhoto() {
        if (!photoUriStr) return
        // Fresh controller per attempt so a retry after a failed/timed-out analysis isn't stuck
        // wired to an already-aborted signal.
        const controller = new AbortController()
        abortControllerRef.current = controller
        try {
            // Dev Hub fake mode (stripped from production): simulate analysis without an API call.
            if (__DEV__ && devFakeMsStr) {
                await new Promise((resolve) => setTimeout(resolve, Number(devFakeMsStr)))
                if (devFakeOutcomeStr === 'fail') throw new Error('Dev-forced failure (no API call was made)')
            } else {
                await handleAnalyzeAndAddPhoto(photoUriStr, userID, modeStr, () => !canceledRef.current, controller.signal)
            }
            if (canceledRef.current) return
            // Success! Dismiss all modals and return to home
            router.dismissAll()
        } catch (error: any) {
            if (canceledRef.current) return
            const msg = typeof error?.message === 'string' && error.message.length > 0 ? error.message : "Sorry we weren't able to analyze your photo. Please try again."
            Alert.alert(
                'Analysis Failed',
                msg,
                [
                    {
                        text: 'Try Again',
                        onPress: () => {
                            // Reset animations and retry
                            progress.setValue(0)
                            startProgressAnimation()
                            analyzePhoto()
                        },
                    },
                    {
                        text: 'Cancel',
                        onPress: () => router.dismissAll(),
                        style: 'cancel',
                    },
                ],
                { cancelable: false },
            )
        }
    }

    const progressWidth = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    })

    return (
        <View style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* Photo Preview */}
                {photoUriStr && (
                    <View style={styles.photoContainer}>
                        <Image source={{ uri: photoUriStr }} style={styles.photo} resizeMode="cover" />
                        <View style={styles.photoOverlay} />
                    </View>
                )}

                {/* Animated Icon */}
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <LinearGradient colors={colors.nutritionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconCircle}>
                        <Sparkles size={48} color="#FFF" strokeWidth={2.0} />
                    </LinearGradient>
                </Animated.View>

                {/* Status Text */}
                <Text style={styles.title}>{modeStr === 'label' ? 'Reading Nutrition Label' : modeStr === 'item' ? 'Identifying Product' : 'Analyzing Your Meal'}</Text>
                <Text style={styles.subtitle}>{modeStr === 'label' ? 'Our AI is reading the label values...' : modeStr === 'item' ? 'Our AI is identifying the product and its nutrition...' : 'Our AI is identifying items and calculating nutrition...'}</Text>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                        <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
                    </View>
                </View>

                {/* Spinner */}
                <ActivityIndicator size="large" color={colors.nutrition} style={styles.spinner} />

                {/* Tips */}
                <View style={styles.tipsContainer}>
                    <View style={styles.tipDot} />
                    <Text style={styles.tipText}>This may take up to 30 seconds</Text>
                </View>
            </View>
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
        handleContainer: {
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 8,
        },
        handle: {
            width: 40,
            height: 5,
            backgroundColor: colors.border,
            borderRadius: 3,
        },
        content: {
            flex: 1,
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 32,
        },
        photoContainer: {
            width: '100%',
            height: 200,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 32,
            borderWidth: 2,
            borderColor: colors.hairline,
        },
        photo: {
            width: '100%',
            height: '100%',
        },
        photoOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.nutrition + '1A',
        },
        iconContainer: {
            alignItems: 'center',
            marginBottom: 16,
            marginTop: 12,
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
        },
        title: {
            fontSize: 24,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 6,
            fontFamily: fonts.semibold,
            letterSpacing: -0.5,
        },
        subtitle: {
            fontSize: 14,
            color: colors.labelMuted,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 32,
            paddingHorizontal: 16,
            fontFamily: fonts.regular,
            letterSpacing: 0.2,
        },
        progressContainer: {
            width: '100%',
            marginBottom: 24,
        },
        progressBarBackground: {
            width: '100%',
            height: 8,
            backgroundColor: colors.ringTrack,
            borderRadius: 4,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.hairline,
        },
        progressBarFill: {
            height: '100%',
            backgroundColor: colors.nutrition,
            borderRadius: 4,
        },
        spinner: {
            marginBottom: 32,
        },
        tipsContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 12,
            paddingHorizontal: 20,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.hairline,
        },
        tipDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.nutrition,
        },
        tipText: {
            fontSize: 13,
            color: colors.labelMuted,
            fontFamily: fonts.medium,
        },
    })
}
