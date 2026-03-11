import { useSettings } from '@/context/SettingsContext'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function Onboarding8Screen() {
    const { settings, setSettings, calculateMacros } = useSettings()

    const calculateAge = (birthDate: Date): number => {
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }

        return age
    }

    const formatActivityLevel = (level: string) => {
        const map: Record<string, string> = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', active: 'Active', gymrat: 'Gym Rat' }
        return map[level] || level
    }

    const formatGoalType = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1)
    }

    const handleNext = () => {
        const macros = calculateMacros(settings, settings.unitSystem === 'imperial')
        setSettings({
            ...settings,
            calorieGoal: macros.calResult,
            proteinGoal: macros.proteinGrams,
            carbsGoal: macros.carbGrams,
            fatsGoal: macros.fatGrams,
        })

        router.push('/onboardingScreens/onboarding9')
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="folder-information" size={72} color="#2f80ed" />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Review Your Information</Text>
                <Text style={styles.subtitleText}>Review your details before we calculate your personalized plan</Text>

                {/* Settings Summary */}
                <View style={styles.summaryContainer}>
                    {/* Age */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Age</Text>
                        <Text style={styles.summaryValue}>{calculateAge(settings.birthDate)} years old</Text>
                    </View>

                    {/* Gender */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Biological Sex</Text>
                        <Text style={styles.summaryValue}>{settings.gender === 'male' ? 'Male' : 'Female'}</Text>
                    </View>

                    {/* Height */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Height</Text>
                        <Text style={styles.summaryValue}>{settings.height} {settings.unitSystem === 'imperial' ? 'in' : 'cm'}</Text>
                    </View>

                    {/* Weight */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Weight</Text>
                        <Text style={styles.summaryValue}>{settings.bodyWeight} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                    </View>

                    {/* Activity Level */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Activity Level</Text>
                        <Text style={styles.summaryValue}>{formatActivityLevel(settings.activityLevel)}</Text>
                    </View>

                    {/* Goal Type */}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Goal</Text>
                        <Text style={styles.summaryValue}>{formatGoalType(settings.goalType)} Weight</Text>
                    </View>

                    {/* Goal Weight (if not maintaining) */}
                    {settings.goalType !== 'maintain' && (
                        <>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Target Weight</Text>
                                <Text style={styles.summaryValue}>{settings.goalWeight} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Goal Pace</Text>
                                <Text style={styles.summaryValue}>{settings.goalPace.toFixed(1)} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}/week</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Adjustable Settings Note */}
                <Text style={styles.noteText}>These settings can be adjusted at any time</Text>
            </View>

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
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
        marginBottom: 12,
    },
    titleText: {
        fontSize: 32,
        color: '#fff',
        letterSpacing: -0.5,
        lineHeight: 38,
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
    summaryContainer: {
        width: '100%',
        backgroundColor: '#242424',
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#242424',
        marginBottom: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 15,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    summaryValue: {
        fontSize: 15,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    noteText: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        letterSpacing: 0.2,
        marginBottom: 20,
        fontFamily: 'Poppins_500Medium',
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
        height: 56,
        backgroundColor: '#282A2C',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#242424',
    },
    backButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#aaa',
        letterSpacing: -0.3,
    },
    nextButton: {
        flex: 1,
        height: 56,
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
