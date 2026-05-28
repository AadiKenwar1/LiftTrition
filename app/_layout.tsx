import { AppLoadingScreen } from '@/components/GuardComponents/AppLoadingScreen'
import { PowerSyncGuard } from '@/components/GuardComponents/PowerSyncGuard'
import { SyncWatchdog } from '@/components/GuardComponents/SyncWatchdog'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { BillingProvider, useBilling } from '@/context/BillingContext'
import { NutritionProvider, useNutrition } from '@/context/NutritionContext'
import { SettingsProvider, useSettings } from '@/context/SettingsContext'
import { ThemeProvider, useColorScheme } from '@/context/ThemeContext'
import { useWorkout, WorkoutProvider } from '@/context/WorkoutContext'
import {
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
} from '@expo-google-fonts/poppins'
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
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'

/** Largest common iPhone portrait width (~Pro Max); on iPad this centers a phone-width column with side gutters. */
const PHONE_MAX_WIDTH = 400

function AppColumn({ children }: PropsWithChildren) {
    return (
        <View style={styles.phoneChromeOuter}>
            <View style={styles.phoneChromeInner}>{children}</View>
        </View>
    )
}

// Catch any errors thrown by the Layout component.

export { ErrorBoundary } from 'expo-router'

// Ensure that reloading on `/modal` keeps a back button present.
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
        ...FontAwesome.font,
    })

    // Expo Router uses Error Boundaries to catch errors in the navigation tree.
    useEffect(() => {
        if (error) throw error
    }, [error])

    useEffect(() => {
        Promise.all([Asset.loadAsync(require('@/assets/images/LiftTritionAppIconV2.png')), Asset.loadAsync(require('@/assets/images/LTpng.png'))]).then(() => setLogoLoaded(true))
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
    return (
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 0 }}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
    )
}

function StackLayout() {
    const { session } = useAuth()
    const { settings, loaded: settingsLoaded } = useSettings()
    const { loaded: nutritionLoaded } = useNutrition()
    const { loaded: workoutLoaded } = useWorkout()
    const { loaded: billingLoaded } = useBilling()
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
                    headerLeft: ({ canGoBack }) => (canGoBack ? <HeaderBackButton /> : null),
                    headerShadowVisible: false,
                    headerTitleStyle: {
                        fontFamily: 'Poppins_600SemiBold',
                        fontSize: 22,
                        color: '#FFF',
                    },
                }}
            >
                <Stack.Protected guard={!session}>
                    <Stack.Screen name="authScreens/login" options={{ headerShown: false }} />
                </Stack.Protected>
                <Stack.Protected guard={!settings.onboardingComplete}>
                    <Stack.Screen name="onboardingScreens/introduction" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/preboard" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/onboarding2" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/onboarding3" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/onboarding4" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/onboarding5" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/onboarding6" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/onboarding7" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/onboarding8" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/onboarding9" options={{ headerShown: false }} />
                    <Stack.Screen name="onboardingScreens/onboarding10" options={{ headerShown: false }} />
                </Stack.Protected>

                <Stack.Protected guard={!!session && allContextsLoaded && settings.onboardingComplete}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="workoutScreens/addWorkoutModal" options={{ presentation: 'modal', title: 'Add Workout', headerShown: false }} />
                    <Stack.Screen name="workoutScreens/archiveModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="workoutScreens/exerciseScreen" options={{ title: 'Exercises', headerShown: true, headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="workoutScreens/addExerciseModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="workoutScreens/logsModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="workoutScreens/notesModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="workoutScreens/renameModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/addNutritionModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/savedNutritionModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/foodDBModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/cameraScreen" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/barcodeScreen" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/analyzingModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/updateBWModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/dateModal" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/editManualEntry" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="nutritionScreens/editPhotoEntry" options={{ presentation: 'modal', headerShown: false }} />
                    <Stack.Screen name="settingsScreens/profile" options={{ headerShown: true, title: 'Profile', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/subscription" options={{ headerShown: true, title: 'Subscription', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/adjustTraining" options={{ headerShown: true, title: 'Adjust Training', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/adjustNutrition/adjustNutrition1" options={{ headerShown: true, title: 'Step 1 of 3', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/adjustNutrition/adjustNutrition2" options={{ headerShown: true, title: 'Step 2 of 3', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/adjustNutrition/adjustNutrition3" options={{ headerShown: true, title: 'Step 3 of 3', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/createExercise/createExercise1" options={{ headerShown: true, title: 'My Exercises', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/createExercise/createExercise2" options={{ headerShown: true, title: 'Step 1 of 4', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/createExercise/createExercise3" options={{ headerShown: true, title: 'Step 2 of 4', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/createExercise/createExercise4" options={{ headerShown: true, title: 'Step 3 of 4', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/createExercise/createExercise5" options={{ headerShown: true, title: 'Step 3 of 4', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/createExercise/createExercise6" options={{ headerShown: true, title: 'Step 4 of 4', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/adjustMeasurements" options={{ headerShown: true, title: 'Adjust Measurements', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/termsAndPrivacy" options={{ headerShown: true, title: 'Terms & Privacy', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/support" options={{ headerShown: true, title: 'Support', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/howItWorks" options={{ headerShown: true, title: 'How It Works', headerTintColor: '#FFF', headerBackTitle: 'Back' }} />
                    <Stack.Screen name="settingsScreens/devStatsModal" options={{ presentation: 'modal', headerShown: false }} />
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
