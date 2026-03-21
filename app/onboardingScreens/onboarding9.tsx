import { useSettings } from '@/context/SettingsContext'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Beef, Droplet, Flame, Wheat } from 'lucide-react-native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const ACCENT = '#22C922'

export default function Onboarding9Screen() {
    const { settings } = useSettings()

    const handleNext = () => {
        router.push('/onboardingScreens/onboarding10')
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(34, 201, 34, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <View style={styles.content}>
                {/* Icon */}
                <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                    <FontAwesome name="list-alt" size={72} color={ACCENT} strokeWidth={2} />
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
                            <Flame size={18} color="#FF6B6B" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Calories</Text>
                            <Text style={styles.macroValue}>{settings.calorieGoal}</Text>
                        </View>

                        {/* Protein */}
                        <View style={styles.macroCard}>
                            <Beef size={18} color="red" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Protein</Text>
                            <Text style={styles.macroValue}>{settings.proteinGoal}g</Text>
                        </View>
                    </View>

                    {/* Second Row */}
                    <View style={styles.macrosRow}>
                        {/* Carbs */}
                        <View style={styles.macroCard}>
                            <Wheat size={18} color="#FFD93D" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Carbs</Text>
                            <Text style={styles.macroValue}>{settings.carbsGoal}g</Text>
                        </View>

                        {/* Fats */}
                        <View style={styles.macroCard}>
                            <Droplet size={18} color="#22C922" strokeWidth={2} />
                            <Text style={styles.macroLabel}>Fats</Text>
                            <Text style={styles.macroValue}>{settings.fatsGoal}g</Text>
                        </View>
                    </View>
                </View>

                {/* Note */}
                <Text style={styles.noteText}>You can adjust these goals anytime in settings {'\n'} *Note that updating body weight will automatically update nutrition goals</Text>

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
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 25,
        paddingTop: 90,
        paddingBottom: 50,
        alignItems: 'center',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 220,
    },
    content: {
        alignItems: 'center',
        width: '100%',
        flex: 1,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#282A2C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 12,
    },
    titleText: {
        fontSize: 28,
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
        letterSpacing: 0.2,
        marginBottom: 12,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 22,
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
        backgroundColor: '#242424',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#242424',
        gap: 6,
    },
    macroLabel: {
        fontSize: 13,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    macroValue: {
        fontSize: 24,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    noteText: {
        fontSize: 12,
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
        backgroundColor: '#242424',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#242424',
    },
    backButtonText: {
        fontSize: 16,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    nextButton: {
        flex: 1,
        height: 60,
        backgroundColor: '#D4F5D4',
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
