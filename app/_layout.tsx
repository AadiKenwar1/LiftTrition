import { AppLoadingScreen } from '@/components/GuardComponents/AppLoadingScreen'
import { PowerSyncGuard } from '@/components/GuardComponents/PowerSyncGuard'
import { SyncWatchdog } from '@/components/GuardComponents/SyncWatchdog'
import GoalPromptHost from '@/components/NutritionComponents/GoalPromptHost'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { BillingProvider, useBilling } from '@/context/BillingContext'
import { NutritionProvider, useNutrition } from '@/context/NutritionContext'
import { SettingsProvider, useSettings } from '@/context/SettingsContext'
import { brandAssets, fonts, ThemeProvider, useColors, useColorScheme } from '@/context/ThemeContext'
import { useWorkout, WorkoutProvider } from '@/context/WorkoutContext'
import { assertRequiredEnv, ENV } from '@/lib/env'
import { useNotificationScheduler } from '@/lib/hooks/useNotificationScheduler'
import { Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo'
import { Poppins_100Thin, Poppins_100Thin_Italic, Poppins_200ExtraLight, Poppins_200ExtraLight_Italic, Poppins_300Light, Poppins_300Light_Italic, Poppins_400Regular, Poppins_400Regular_Italic, Poppins_500Medium, Poppins_500Medium_Italic, Poppins_600SemiBold, Poppins_600SemiBold_Italic, Poppins_700Bold, Poppins_700Bold_Italic, Poppins_800ExtraBold, Poppins_800ExtraBold_Italic, Poppins_900Black, Poppins_900Black_Italic } from '@expo-google-fonts/poppins'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native'
import * as Sentry from '@sentry/react-native'
import { Asset } from 'expo-asset'
import { useFonts } from 'expo-font'
import { ErrorBoundary as ExpoErrorBoundary, Stack, type ErrorBoundaryProps } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'

/** Largest common iPhone portrait width (~Pro Max); on iPad this centers a phone-width column with side gutters. */
const PHONE_MAX_WIDTH = 1000

/** Flip to false to disable the phone-width clamp — the app then fills the full window width. */
const CLAMP_PHONE_WIDTH = true

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

// Catch any errors thrown by the Layout component: report once to Sentry via a one-shot effect
// keyed on the error reference (never in the render body, which would re-fire on every re-render),
// then defer to expo-router's own default error UI with the same {error, retry} props.
function CapturedErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    useEffect(() => {
        Sentry.captureException(error, { tags: { area: 'route-crash' } })
    }, [error])
    return <ExpoErrorBoundary error={error} retry={retry} />
}

export { CapturedErrorBoundary as ErrorBoundary }

// Anchor the stack's initial route so deep-links/reloads keep a back button present.
export const unstable_settings = { initialRouteName: '(tabs)' }

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

assertRequiredEnv()

Sentry.init({
    dsn: ENV.SENTRY_DSN,
    environment: ENV.APP_ENV ?? (__DEV__ ? 'development' : 'production'),
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

function StackLayout() {
    const { session } = useAuth()
    const { settings, loaded: settingsLoaded, loadFailed: settingsFailed, retryLoad: retrySettings } = useSettings()
    const { loaded: nutritionLoaded, loadFailed: nutritionFailed, retryLoad: retryNutrition } = useNutrition()
    const { loaded: workoutLoaded, loadFailed: workoutFailed, retryLoad: retryWorkout } = useWorkout()
    const { loaded: billingLoaded } = useBilling()
    const colors = useColors()
    useNotificationScheduler()
    const allContextsLoaded = settingsLoaded && nutritionLoaded && workoutLoaded && billingLoaded
    const anyLoadFailed = settingsFailed || nutritionFailed || workoutFailed

    const retryAll = useCallback(() => {
        if (settingsFailed) retrySettings()
        if (nutritionFailed) retryNutrition()
        if (workoutFailed) retryWorkout()
    }, [settingsFailed, nutritionFailed, workoutFailed, retrySettings, retryNutrition, retryWorkout])

    if (!allContextsLoaded) {
        return (
            <AppColumn>
                <AppLoadingScreen loadFailed={anyLoadFailed} onRetry={retryAll} />
            </AppColumn>
        )
    }
    return (
        <AppColumn>
            <Stack
                screenOptions={{
                    gestureEnabled: false,
                    // Native back button (no custom headerLeft): iOS 26 wraps custom JS views in a
                    // mis-centered Liquid Glass capsule; the OS-rendered chevron is always correct.
                    // 'minimal' keeps it icon-only, matching the old custom arrow.
                    headerBackButtonDisplayMode: 'minimal',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerTitleStyle: {
                        fontFamily: fonts.semibold,
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
                    <Stack.Screen name="nutritionScreens/editEntry" options={{ ...modalPresentation, headerShown: false }} />
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
                    <Stack.Screen name="settingsScreens/notifications" options={{ headerShown: true, title: 'Notifications', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/devStatsModal" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="devTest/index" options={{ headerShown: true, title: 'Dev Hub', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/lineChart" options={{ headerShown: true, title: 'Line Chart', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/scanScreen" options={{ headerShown: true, title: 'Scan Screen', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/foodDB" options={{ headerShown: true, title: 'Food DB (Teaser)', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/foodDBVariant" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="devTest/addNutritionTeaser" options={{ headerShown: true, title: 'Add Nutrition (Teaser)', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/addNutritionTeaserVariant" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="devTest/barChart" options={{ headerShown: true, title: 'Bar Chart', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/aiTest" options={{ headerShown: true, title: 'AI Test', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/scanCancel" options={{ headerShown: true, title: 'Scan Cancel', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/activityBanner" options={{ headerShown: true, title: 'Activity Banner', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/colorHue" options={{ headerShown: true, title: 'Color Hue Review', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/numberParsing" options={{ headerShown: true, title: 'Number Parsing', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/editEntry" options={{ headerShown: true, title: 'Edit Entry — Test', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/suggestSet" options={{ headerShown: true, title: 'Suggest Set', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/addNutrition" options={{ headerShown: true, title: 'Add Nutrition', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/addNutritionVariant" options={{ ...modalPresentation, headerShown: false }} />
                    <Stack.Screen name="devTest/onboardingPage" options={{ headerShown: true, title: 'Onboarding', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/onboardingPreview" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/onboardingFlow" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/loadingScreen" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/loadingRetry" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/spinnerLab" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/calendar" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/dateSheet" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/mockup" options={{ headerShown: false, gestureEnabled: true }} />
                    <Stack.Screen name="devTest/goalReached" options={{ headerShown: true, title: 'Goal Reached — UI', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/goalReachedSim" options={{ headerShown: true, title: 'Goal Reached — Logic', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/logHistory" options={{ headerShown: true, title: 'Log History', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/nutritionEntryMenu" options={{ headerShown: true, title: 'Nutrition Entry — Delete', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/combine" options={{ headerShown: true, title: 'Combine', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/foodRow" options={{ headerShown: true, title: 'Food Row', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/entryRow" options={{ headerShown: true, title: 'Entry Rows', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="devTest/notifications" options={{ headerShown: true, title: 'Notifications', headerBackTitle: 'Back' }} />
                </Stack.Protected>
            </Stack>
            <GoalPromptHost />
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
        maxWidth: CLAMP_PHONE_WIDTH ? PHONE_MAX_WIDTH : undefined,
        alignSelf: 'center',
        backgroundColor: '#121212',
    },
})
