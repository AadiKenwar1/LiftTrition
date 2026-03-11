import { useSettings } from '@/context/SettingsContext'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { router } from 'expo-router'
import { Beef, Droplet, Flame, Wheat } from 'lucide-react-native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function Onboarding9Screen() {
    const { settings, setSettings } = useSettings()

    const handleNext = () => {
        router.push('/onboardingScreens/onboarding10')
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <FontAwesome name="list-alt" size={72} color="#2f80ed" />
                </View>

                {/* Title */}
                <Text style={styles.titleText}>Your Personalized Plan</Text>
                <Text style={styles.subtitleText}>Here are your daily nutrition goals based on your profile</Text>

                {/* Macros Display */}
                <View style={styles.macrosContainer}>
                    {/* First Row */}
                    <View style={styles.macrosRow}>
                        {/* Calories */}
                        <View style={styles.macroCard}>
                            <Flame size={20} color="#FF6B6B" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Calories</Text>
                            <Text style={styles.macroValue}>{settings.calorieGoal}</Text>
                        </View>

                        {/* Protein */}
                        <View style={styles.macroCard}>
                            <Beef size={20} color="red" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Protein</Text>
                            <Text style={styles.macroValue}>{settings.proteinGoal}g</Text>
                        </View>
                    </View>

                    {/* Second Row */}
                    <View style={styles.macrosRow}>
                        {/* Carbs */}
                        <View style={styles.macroCard}>
                            <Wheat size={20} color="#FFD93D" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Carbs</Text>
                            <Text style={styles.macroValue}>{settings.carbsGoal}g</Text>
                        </View>

                        {/* Fats */}
                        <View style={styles.macroCard}>
                            <Droplet size={20} color="#22C922" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Fats</Text>
                            <Text style={styles.macroValue}>{settings.fatsGoal}g</Text>
                        </View>
                    </View>
                </View>

                {/* Note */}
                <Text style={styles.noteText}>You can adjust these goals anytime in your settings</Text>
            </View>

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.completeButton} onPress={handleNext} activeOpacity={0.8}>
                    <Text style={styles.completeButtonText}>Next</Text>
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
        marginBottom: 16,
        paddingHorizontal: 16,
        fontFamily: 'Poppins_400Regular',
    },
    macrosContainer: {
        width: '100%',
        gap: 10,
        marginBottom: 8,
    },
    macrosRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
    },
    macroCard: {
        flex: 1,
        backgroundColor: '#282A2C',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#242424',
        gap: 6,
    },
    macroLabel: {
        fontSize: 14,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    macroValue: {
        fontSize: 28,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    noteText: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        letterSpacing: 0.2,
        marginBottom: 24,
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
    completeButton: {
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
    completeButtonText: {
        fontSize: 17,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
})
