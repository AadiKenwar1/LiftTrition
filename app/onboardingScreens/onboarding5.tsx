import { useSettings } from '@/context/SettingsContext'
import { router } from 'expo-router'
import { Dumbbell } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function Onboarding5Screen() {
    const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null)
    const { settings, setSettings } = useSettings()

    const frequencies = [
        { id: 'sedentary', label: 'Sedentary', subtitle: 'Little to no exercise' },
        { id: 'light', label: 'Light', subtitle: 'Light exercise 1-3 days a week' },
        { id: 'moderate', label: 'Moderate', subtitle: 'Moderate exercise 4-5 days a week' },
        { id: 'active', label: 'Active', subtitle: 'Daily intensive exercise 3-4 days a week' },
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
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Dumbbell size={60} color="#2f80ed" strokeWidth={2} />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>What's your Activity Level?</Text>
                <Text style={styles.subtitleText}>We need this to adjust Nutrition Goals and Fatigue calculations</Text>

                {/* Frequency Options */}
                <View style={styles.optionsContainer}>
                    {frequencies.map((freq) => (
                        <TouchableOpacity key={freq.id} style={[styles.optionButton, selectedFrequency === freq.id && styles.optionButtonSelected]} onPress={() => setSelectedFrequency(freq.id)} activeOpacity={0.7}>
                            <Text style={[styles.optionLabel, selectedFrequency === freq.id && styles.optionLabelSelected]}>{freq.label}</Text>
                            <Text style={[styles.optionSubtitle, selectedFrequency === freq.id && styles.optionSubtitleSelected]}>{freq.subtitle}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

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
        padding: 25,
        paddingTop: 30,
        paddingBottom: 50,
    },
    content: {
        alignItems: 'center',
        paddingTop: 40,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#242424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2f80ed',
        marginBottom: 12,
    },
    titleText: {
        fontSize: 25,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.2,
        marginBottom: 12,
        paddingHorizontal: 16,
        fontFamily: 'Poppins_400Regular',
    },
    optionsContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 16,
    },
    optionButton: {
        width: '100%',
        backgroundColor: '#282A2C',
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#242424',
        gap: 6,
    },
    optionButtonSelected: {
        backgroundColor: 'rgba(45, 156, 255, 0.15)',
        borderColor: '#2f80ed',
    },
    optionLabel: {
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    optionLabelSelected: {
        color: '#2f80ed',
    },
    optionSubtitle: {
        fontSize: 13,
        color: '#aaa',
        letterSpacing: 0.2,
        textAlign: 'center',
        fontFamily: 'Poppins_500Medium',
    },
    optionSubtitleSelected: {
        color: '#888',
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
        backgroundColor: '#2f80ed',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonText: {
        fontSize: 17,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
