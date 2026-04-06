import { useSettings } from '@/context/SettingsContext'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Activity } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const ACCENT = '#2f80ed'

export default function Onboarding5Screen() {
    const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null)
    const { settings, setSettings } = useSettings()

    const frequencies = [
        { id: 'sedentary', label: 'Sedentary', subtitle: 'Little to no exercise' },
        { id: 'light', label: 'Light', subtitle: 'Light exercise 1-3 days a week' },
        { id: 'moderate', label: 'Moderate', subtitle: 'Moderate exercise 4-5 days a week' },
        { id: 'active', label: 'Active', subtitle: 'Intensive exercise 3-4 days a week or Moderate exercise 6-7 days a week' },
        { id: 'gymrat', label: 'Gym Rat', subtitle: 'Intensive exercise 6-7 days a week' },
    ]

    function handleNext() {
        if (selectedFrequency === null) {
            Alert.alert('Training Frequency Required', 'Please select your training frequency.', [{ text: 'OK' }])
        } else {
            setSettings({ ...settings, activityLevel: selectedFrequency as 'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat' })
            router.push('/onboardingScreens/onboarding6')
        }
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(47, 128, 237, 0.3)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Icon */}
                <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                    <Activity size={72} color={ACCENT} strokeWidth={2} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>What's your Activity Level?</Text>
                <Text style={styles.subtitleText}>We use your activity level for BMR, nutrition, and fatigue calculations.</Text>

                {/* Frequency Options */}
                <View style={styles.optionsContainer}>
                    {frequencies.map((freq) => (
                        <TouchableOpacity key={freq.id} style={[styles.optionButton, selectedFrequency === freq.id && { borderColor: ACCENT }]} onPress={() => setSelectedFrequency(freq.id)} activeOpacity={0.5}>
                            <Text style={[styles.optionLabel, selectedFrequency === freq.id && styles.optionLabelSelected]}>{freq.label}</Text>
                            <Text style={[styles.optionSubtitle, selectedFrequency === freq.id && styles.optionSubtitleSelected]}>{freq.subtitle}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        router.back()
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 75,
        paddingBottom: 50,
        paddingHorizontal: 25,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 220,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        width: '100%',
        paddingBottom: 16,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#282A2C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        marginBottom: 12,
    },
    titleText: {
        fontSize: 24,
        color: '#FFF',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.2,
        lineHeight: 22,
        marginBottom: 12,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
    },
    optionsContainer: {
        width: '100%',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 16,
    },
    optionButton: {
        width: '100%',
        height: 65,
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#282A2C',
        gap: 12,
    },
    optionLabel: {
        fontSize: 15,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
        width: 80,
    },
    optionLabelSelected: {
        color: '#fff',
    },
    optionSubtitle: {
        flex: 1,
        fontSize: 14,
        color: '#aaa',
        letterSpacing: 0.1,
        lineHeight: 18,
        fontFamily: 'Poppins_400Regular',
    },
    optionSubtitleSelected: {
        color: '#aaa',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        gap: 12,
    },
    backButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#282A2C',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#242424',
    },
    backButtonText: {
        fontSize: 17,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    nextButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#D4E4FF',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#000',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
