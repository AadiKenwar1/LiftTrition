import ScanBackdrop from '@/components/NutritionComponents/ScanBackdrop'
import ScanPromptCard from '@/components/NutritionComponents/ScanPromptCard'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { openAppSettings } from '@/lib/utils/permissions'
import { useRouter } from 'expo-router'
import { Camera, Settings, Sparkles } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'

type ScanState = 'upgrade' | 'grant' | 'settings' | 'loading' | 'live'

/**
 * Issue 15 / unified scan screen preview. The upgrade/grant/settings cards render the real
 * shippable components (ScanBackdrop + ScanPromptCard); CTA taps show stub alerts instead of
 * navigating — except "Open Settings", which exercises the real deep link, and "live", which
 * opens the actual (unchanged) camera screen.
 */
export default function ScanScreenTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const router = useRouter()
    const [state, setState] = useState<ScanState>('upgrade')

    const stub = (action: string) => Alert.alert('Dev stub', action)

    const showLibraryDeniedAlert = () =>
        Alert.alert('Photo Library Access', 'Enable photo access in Settings to choose a meal photo.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => openAppSettings() },
        ])

    return (
        <View style={styles.screen}>
            <View style={styles.controls}>
                <Field label="State">
                    <Segmented
                        value={state}
                        onChange={setState}
                        options={[
                            { label: 'Free (upgrade)', value: 'upgrade' },
                            { label: 'Grant', value: 'grant' },
                            { label: 'Open Settings', value: 'settings' },
                            { label: 'Loading', value: 'loading' },
                            { label: 'Live camera', value: 'live' },
                        ]}
                    />
                </Field>
                <TouchableOpacity style={styles.alertDemoButton} onPress={showLibraryDeniedAlert} activeOpacity={0.6}>
                    <Text style={styles.alertDemoText}>Show library-denied alert (real Open Settings link)</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.preview}>
                {state === 'live' ?
                    <View style={styles.livePlaceholder}>
                        <Text style={styles.livePlaceholderText}>Premium + granted renders the existing camera screen, unchanged.</Text>
                        <TouchableOpacity style={styles.openCameraButton} onPress={() => router.push('/nutritionScreens/cameraScreen')} activeOpacity={0.7}>
                            <Text style={styles.openCameraText}>Open real camera screen</Text>
                        </TouchableOpacity>
                    </View>
                :   <>
                        <ScanBackdrop />
                        {state === 'upgrade' && (
                            <ScanPromptCard
                                icon={Sparkles}
                                title="Scan Meals with AI"
                                message="Snap a photo of any meal, item, or nutrition label and let AI log the macros for you. Upgrade to unlock scanning."
                                ctaLabel="Upgrade to Scan"
                                onPress={() => stub('→ /settingsScreens/subscription')}
                                onGoBack={() => stub('router.back()')}
                            />
                        )}
                        {state === 'grant' && (
                            <ScanPromptCard
                                icon={Camera}
                                title="Camera Access Required"
                                message="We need access to your camera to take photos of your meals for nutrition tracking with AI analysis."
                                ctaLabel="Grant Permission"
                                onPress={() => stub('requestPermission() — would fire the one-time iOS prompt')}
                                onGoBack={() => stub('router.back()')}
                            />
                        )}
                        {state === 'settings' && (
                            <ScanPromptCard
                                icon={Settings}
                                title="Camera Access Denied"
                                message="Camera access is turned off for this app. Enable Camera in Settings to scan your meals."
                                ctaLabel="Open Settings"
                                onPress={() => openAppSettings()}
                                onGoBack={() => stub('router.back()')}
                            />
                        )}
                    </>
                }
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        controls: {
            padding: 16,
            paddingBottom: 8,
        },
        alertDemoButton: {
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        alertDemoText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.textSecondary,
        },
        preview: {
            flex: 1,
            margin: 16,
            marginTop: 8,
            borderRadius: radius.cardLg,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
        },
        livePlaceholder: {
            flex: 1,
            backgroundColor: '#000',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            gap: 16,
        },
        livePlaceholderText: {
            fontFamily: fonts.regular,
            fontSize: 14,
            color: '#AAA',
            textAlign: 'center',
            lineHeight: 21,
        },
        openCameraButton: {
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
            backgroundColor: colors.nutrition,
        },
        openCameraText: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: '#FFF',
        },
    })
}
