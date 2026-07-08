import { AppLoadingScreen } from '@/components/GuardComponents/AppLoadingScreen'
import { PowerSyncGuard } from '@/components/GuardComponents/PowerSyncGuard'
import { SyncWatchdog } from '@/components/GuardComponents/SyncWatchdog'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { BillingProvider, useBilling } from '@/context/BillingContext'
import { NutritionProvider, useNutrition } from '@/context/NutritionContext'
import { SettingsProvider, useSettings } from '@/context/SettingsContext'
import { brandAssets, ThemeProvider, useColorScheme, useColors } from '@/context/ThemeContext'
import { useWorkout, WorkoutProvider } from '@/context/WorkoutContext'
import { Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { Poppins_100Thin, Poppins_100Thin_Italic, Poppins_200ExtraLight, Poppins_200ExtraLight_Italic, Poppins_300Light, Poppins_300Light_Italic, Poppins_400Regular, Poppins_400Regular_Italic, Poppins_500Medium, Poppins_500Medium_Italic, Poppins_600SemiBold, Poppins_600SemiBold_Italic, Poppins_700Bold, Poppins_700Bold_Italic, Poppins_800ExtraBold, Poppins_800ExtraBold_Italic, Poppins_900Black, Poppins_900Black_Italic } from '@expo-google-fonts/poppins'
import { Ionicons } from '@expo/vector-icons'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native'
import * as Sentry from '@sentry/react-native'
import { Asset } from 'expo-asset'
import { useFonts } from 'expo-font'
import { Stack, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import React, { type PropsWithChildren, useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'

/** Largest common iPhone portrait width (~Pro Max); on iPad this centers a phone-width column with side gutters. */
const PHONE_MAX_WIDTH = 400

/** Modal routes keep swipe-to-dismiss; all other stack screens use header back only. */
const modalPresentation = {
    presentation: 'modal' as const,
    gestureEnabled: true,
}

function AppColumn({ children }: PropsWithChildren) {
    return (
        <View style={styles.phoneChromeOuter}>
            <View style={styles.phoneChromeInner}>{children}</View>
        </View>
    )
}

// Catch any errors thrown by the Layout component.

export { ErrorBoundary } from 'expo-router'

// Anchor the stack's initial route so deep-links/reloads keep a back button present.
export const unstable_settings = { initialRouteName: '(tabs)' }

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enableInExpoDevelopment: false,
})

export default Sentry.wrap(function RootLayout() {
    const [logoLoaded, setLogoLoaded] = useState(false)
    const [loaded, error] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        Poppins_100Thin,
        Poppins_100Thin_Italic,
        Poppins_200ExtraLight,
        Poppins_200ExtraLight_Italic,
        Poppins_300Light,
        Poppins_300Light_Italic,
        Poppins_400Regular,
        Poppins_400Regular_Italic,
        Poppins_500Medium,
        Poppins_500Medium_Italic,
        Poppins_600SemiBold,
        Poppins_600SemiBold_Italic,
        Poppins_700Bold,
        Poppins_700Bold_Italic,
        Poppins_800ExtraBold,
        Poppins_800ExtraBold_Italic,
        Poppins_900Black,
        Poppins_900Black_Italic,
        Archivo_400Regular,
        Archivo_500Medium,
        Archivo_600SemiBold,
        Archivo_700Bold,
        Archivo_800ExtraBold,
        ...FontAwesome.font,
    })

    // Expo Router uses Error Boundaries to catch errors in the navigation tree.
    useEffect(() => {
        if (error) throw error
    }, [error])

    useEffect(() => {
        Promise.all([Asset.loadAsync(brandAssets.logoLight), Asset.loadAsync(brandAssets.logoDark)]).then(() => setLogoLoaded(true))
    }, [])

    useEffect(() => {
        if (loaded && logoLoaded) {
            SplashScreen.hideAsync()
        }
    }, [loaded, logoLoaded])

    if (!loaded) return null
    return <RootLayoutNav />
})

function HeaderBackButton() {
    const router = useRouter()
    const colors = useColors()
    return (
        <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
    )
}

function StackLayout() {
    const { session } = useAuth()
    const { settings, loaded: settingsLoaded } = useSettings()
    const { loaded: nutritionLoaded } = useNutrition()
    const { loaded: workoutLoaded } = useWorkout()
    const { loaded: billingLoaded } = useBilling()
    const colors = useColors()
    const allContextsLoaded = settingsLoaded && nutritionLoaded && workoutLoaded && billingLoaded

    if (!allContextsLoaded) {
        return (
            <AppColumn>
                <AppLoadingScreen />
            </AppColumn>
        )
    }
    return (
        <AppColumn>
            <Stack
                screenOptions={{
                    gestureEnabled: false,
                    headerLeft: ({ canGoBack }) => (canGoBack ? <HeaderBackButton /> : null),
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerTitleStyle: {
                        fontFamily: 'Poppins_600SemiBold',
                        fontSize: 22,
                        color: colors.text,
                    },
                }}
            >
                <Stack.Protected guard={!session}>
                    <Stack.Screen name="authScreens/login" options={{ headerShown: false }} />
                </Stack.Protected>
                <Stack.Protected guard={!settings.onboardingComplete}>
                    <Stack.Screen name="onboardingScreens/goals" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/obstacles" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/aboutYou" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/activity" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/goal" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/pace" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/timeline" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/plan" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/projection" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/paywall" options={{ headerShown: false }} />
                </Stack.Protected>

                <Stack.Protected guard={!!session && allContextsLoaded && settings.onboardingComplete}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="workoutScreens/addWorkoutModal" options={{ ...modalPresentation, title: 'Add Workout', headerShown: false }} />
                    <Stack.Screen name="workoutScreens/archiveModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="workoutScreens/exerciseScreen" options={{ title: 'Exercises', headerShown: true, headerBackTitle: 'Back' }} />
                    <Stack.Screen name="workoutScreens/addExerciseModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="workoutScreens/logsModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="workoutScreens/notesModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="workoutScreens/renameModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/addNutritionModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/savedNutritionModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/foodDBModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/cameraScreen" options={{ ...modalPresentation, headerShown: false, contentStyle: { backgroundColor: '#000' } }} />
                    <Stack.Screen name="nutritionScreens/analyzingModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/updateBWModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/dateModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/editManualEntry" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/editPhotoEntry" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="settingsScreens/profile" options={{ headerShown: true, title: 'Profile', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/subscription" options={{ headerShown: true, title: '', headerBackTitle: 'Back', headerShadowVisible: false }} />
                    <Stack.Screen name="settingsScreens/adjustTraining" options={{ headerShown: true, title: '', headerBackTitle: 'Back', headerShadowVisible: false }} />
                    <Stack.Screen name="settingsScreens/adjustNutrition/adjustNutrition1" options={{ headerShown: true, title: '', headerBackTitle: 'Back', headerShadowVisible: false }} />
                    <Stack.Screen name="settingsScreens/adjustNutrition/adjustNutrition2" options={{ headerShown: true, title: '', headerBackTitle: 'Back', headerShadowVisible: false }} />
                    <Stack.Screen name="settingsScreens/adjustNutrition/adjustNutrition3" options={{ headerShown: true, title: '', headerBackTitle: 'Back', headerShadowVisible: false }} />
                    <Stack.Screen name="settingsScreens/adjustNutrition/adjustNutrition4" options={{ headerShown: true, title: '', headerBackTitle: 'Back', headerShadowVisible: false }} />
                    <Stack.Screen name="settingsScreens/termsAndPrivacy" options={{ headerShown: true, title: 'Terms & Privacy', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/support" options={{ headerShown: true, title: 'Support', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/howItWorks" options={{ headerShown: true, title: 'How It Works', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/devStatsModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="devTest/index" options={{ headerShown: true, title: 'Dev Hub', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/lineChart" options={{ headerShown: true, title: 'Line Chart', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/barChart" options={{ headerShown: true, title: 'Bar Chart', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/aiTest" options={{ headerShown: true, title: 'AI Test', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/activityBanner" options={{ headerShown: true, title: 'Activity Banner', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/onboardingPage" options={{ headerShown: true, title: 'Onboarding', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/onboardingPreview" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/onboardingFlow" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/loadingScreen" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/spinnerLab" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/mockup" options={{ headerShown: false, gestureEnabled: true }} />
                </Stack.Protected>
            </Stack>
        </AppColumn>
    )
}

function NavigationTheme({ children }: PropsWithChildren) {
    const colorScheme = useColorScheme()
    return <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>{children}</NavigationThemeProvider>
}

function RootLayoutNav() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
                <SafeAreaProvider>
                    <ThemeProvider>
                        <NavigationTheme>
                            <AuthProvider>
                                <PowerSyncGuard>
                                    <SyncWatchdog />
                                    <SettingsProvider>
                                        <BillingProvider>
                                            <WorkoutProvider>
                                                <NutritionProvider>
                                                    <StackLayout />
                                                </NutritionProvider>
                                            </WorkoutProvider>
                                        </BillingProvider>
                                    </SettingsProvider>
                                </PowerSyncGuard>
                            </AuthProvider>
                        </NavigationTheme>
                    </ThemeProvider>
                </SafeAreaProvider>
            </KeyboardProvider>
        </GestureHandlerRootView>
    )
}

const styles = StyleSheet.create({
    phoneChromeOuter: {
        flex: 1,
        backgroundColor: '#000',
    },
    phoneChromeInner: {
        flex: 1,
        width: '100%',
        maxWidth: PHONE_MAX_WIDTH,
        alignSelf: 'center',
        backgroundColor: '#121212',
    },
})
