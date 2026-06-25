import { useAuth } from '@/context/AuthContext'
import { useNutrition } from '@/context/NutritionContext'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Sparkles } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Animated, Image, StyleSheet, Text, View } from 'react-native'

export default function AnalyzingModal() {
    const { photoUri } = useLocalSearchParams<{ photoUri: string }>()
    const { handleAnalyzeAndAddPhoto } = useNutrition()
    const { userID } = useAuth()
    const router = useRouter()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [progress] = useState(new Animated.Value(0))
    const [pulseAnim] = useState(new Animated.Value(1))

    // Normalize param (Expo Router can return string | string[] | undefined)
    const photoUriStr = typeof photoUri === 'string' ? photoUri : photoUri?.[0]

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
        try {
            await handleAnalyzeAndAddPhoto(photoUriStr, userID)
            // Success! Dismiss all modals and return to home
            router.dismissAll()
        } catch (error: any) {
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
                <Text style={styles.title}>Analyzing Your Meal</Text>
                <Text style={styles.subtitle}>Our AI is identifying ingredients and calculating nutrition...</Text>

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
            backgroundColor: '#121212',
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
            backgroundColor: '#333',
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
            borderColor: '#1e1e1e',
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
            backgroundColor: '#1e1e1e',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.nutrition,
        },
        title: {
            fontSize: 24,
            color: '#FFF',
            textAlign: 'center',
            marginBottom: 6,
            fontFamily: fonts.semibold,
            letterSpacing: -0.5,
        },
        subtitle: {
            fontSize: 14,
            color: '#aaa',
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
            backgroundColor: '#1e1e1e',
            borderRadius: 4,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#2a2a2a',
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
            backgroundColor: '#1e1e1e',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#2a2a2a',
        },
        tipDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.nutrition,
        },
        tipText: {
            fontSize: 13,
            color: '#888',
            fontFamily: fonts.medium,
        },
    })
}
