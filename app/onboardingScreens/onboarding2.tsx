import DatePicker from '@/components/NeutralComponents/DatePicker'
import { useSettings } from '@/context/SettingsContext'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function Onboarding2Screen() {
    const { settings, setSettings } = useSettings()
    const [birthDate, setBirthDate] = useState(new Date())

    const calculateAge = (date: Date): number => {
        const today = new Date()
        let age = today.getFullYear() - date.getFullYear()
        const monthDiff = today.getMonth() - date.getMonth()

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
            age--
        }

        return age
    }

    function handleNext() {
        const age = calculateAge(birthDate)
        if (age < 13) {
            Alert.alert('Age Requirement', 'You must be at least 13 years old to use this app.', [{ text: 'OK' }])
        } else {
            setSettings({ ...settings, birthDate: birthDate })
            router.push('/onboardingScreens/onboarding3')
        }
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(47, 128, 237, 0.3)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <FontAwesome name="birthday-cake" size={72} color="#2f80ed" />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>When's Your {'\n'}Birthday?</Text>
                <Text style={styles.subtitleText}>We use your age for BMR and nutrition goal calculations.</Text>

                {/* Date Picker */}
                <View style={styles.datePickerContainer}>
                    <DatePicker selectedDate={birthDate} onDateChange={setBirthDate} color="#2f80ed" />
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
        padding: 25,
        paddingTop: 35,
        paddingBottom: 50,
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
        paddingTop: 40,
        paddingBottom: 16,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#282A2C',
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
    datePickerContainer: {
        width: '100%',
        paddingHorizontal: 4,
        marginBottom: 32,
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
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonText: {
        fontSize: 17,
        color: 'black',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
