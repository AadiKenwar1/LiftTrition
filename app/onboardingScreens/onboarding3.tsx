import { useSettings } from '@/context/SettingsContext'
import Octicons from '@expo/vector-icons/Octicons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function Onboarding3Screen() {
    const { settings, setSettings } = useSettings()
    const [selectedSex, setSelectedSex] = useState<'male' | 'female' | null>(null)

    function handleNext() {
        if (selectedSex === null) {
            Alert.alert('Gender Selection Required', 'Please select your biological sex.', [{ text: 'OK' }])
        } else {
            setSettings({ ...settings, gender: selectedSex as 'male' | 'female' })
            router.push('/onboardingScreens/onboarding4')
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Octicons name="person-fill" size={65} color="#2f80ed" />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>What is your {'\n'}Biological Sex?</Text>
                <Text style={styles.subtitleText}>We need this to calculate your BMR to adjust your nutrition goals.</Text>

                {/* Gender Selection Buttons */}
                <View style={styles.genderContainer}>
                    <TouchableOpacity style={[styles.genderButton, selectedSex === 'male' && styles.genderButtonSelected]} onPress={() => setSelectedSex('male')} activeOpacity={0.7}>
                        <View style={[styles.genderIconCircle, selectedSex === 'male' && styles.genderIconCircleSelected]}>
                            <Text style={styles.genderIcon}>♂</Text>
                        </View>
                        <Text style={[styles.genderText, selectedSex === 'male' && styles.genderTextSelected]}>Male</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.genderButton, selectedSex === 'female' && styles.genderButtonSelected]} onPress={() => setSelectedSex('female')} activeOpacity={0.7}>
                        <View style={[styles.genderIconCircle, selectedSex === 'female' && styles.genderIconCircleSelected]}>
                            <Text style={styles.genderIcon}>♀</Text>
                        </View>
                        <Text style={[styles.genderText, selectedSex === 'female' && styles.genderTextSelected]}>Female</Text>
                    </TouchableOpacity>
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
        paddingTop: 50,
        paddingBottom: 50,
    },
    content: {
        alignItems: 'center',
        paddingTop: 40,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#242424',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2f80ed',
        marginBottom: 16,
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
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.2,
        marginBottom: 16,
        paddingHorizontal: 16,
        fontFamily: 'Poppins_400Regular',
    },
    genderContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 16,
        marginBottom: 24,
    },
    genderButton: {
        flex: 1,
        backgroundColor: '#282A2C',
        borderRadius: 20,
        paddingVertical: 48,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#2a2a2a',
        gap: 12,
    },
    genderButtonSelected: {
        backgroundColor: 'rgba(45, 156, 255, 0.15)',
        borderColor: '#2f80ed',
    },
    genderIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#222426',
        justifyContent: 'center',
        alignItems: 'center',
    },
    genderIconCircleSelected: {
        backgroundColor: 'rgba(45, 156, 255, 0.25)',
    },
    genderIcon: {
        fontSize: 35,
        color: '#888',
        fontFamily: 'Poppins_600SemiBold',
    },
    genderText: {
        fontSize: 22,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    genderTextSelected: {
        color: '#2f80ed',
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
