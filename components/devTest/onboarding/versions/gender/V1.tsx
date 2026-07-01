import Octicons from '@expo/vector-icons/Octicons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Dev-only Version 1 preview of the Gender onboarding screen (app/onboardingScreens/onboarding3.tsx).
 * Self-contained: local selection, Back returns to the versions list, Next is inert.
 */
export default function GenderV1() {
    const router = useRouter()
    const [selectedSex, setSelectedSex] = useState<'male' | 'female' | null>(null)

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(34, 201, 34, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.stepIndicator}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <View key={i} style={[styles.stepDot, i === 1 && styles.stepDotActive]} />
                    ))}
                </View>

                <View style={styles.iconCircle}>
                    <Octicons name="person-fill" size={65} color="#22C922" />
                </View>

                <Text style={styles.titleText}>What is your {'\n'}Biological Sex?</Text>
                <Text style={styles.subtitleText}>We use your biological sex for BMR and nutrition goal calculations.</Text>

                <View style={styles.genderContainer}>
                    <TouchableOpacity style={[styles.genderButton, selectedSex === 'male' && styles.genderButtonSelected]} onPress={() => setSelectedSex('male')} activeOpacity={0.5}>
                        <View style={[styles.genderIconCircle, selectedSex === 'male' && styles.genderIconCircleSelected]}>
                            <Text style={styles.genderIcon}>♂</Text>
                        </View>
                        <Text style={[styles.genderText, selectedSex === 'male' && styles.genderTextSelected]}>Male</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.genderButton, selectedSex === 'female' && styles.genderButtonSelected]} onPress={() => setSelectedSex('female')} activeOpacity={0.5}>
                        <View style={[styles.genderIconCircle, selectedSex === 'female' && styles.genderIconCircleSelected]}>
                            <Text style={styles.genderIcon}>♀</Text>
                        </View>
                        <Text style={[styles.genderText, selectedSex === 'female' && styles.genderTextSelected]}>Female</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => {}} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 25, paddingTop: 50, paddingBottom: 50 },
    topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
    scroll: { flex: 1 },
    scrollContent: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
    stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 28 },
    stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
    stepDotActive: { width: 24, backgroundColor: '#22C922', borderRadius: 4 },
    iconCircle: { width: 144, height: 144, borderRadius: 72, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#22C922', marginBottom: 16 },
    titleText: { fontSize: 25, color: '#fff', letterSpacing: -0.5, marginBottom: 4, textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
    subtitleText: { fontSize: 16, color: '#aaa', textAlign: 'center', lineHeight: 22, letterSpacing: 0.2, marginBottom: 16, paddingHorizontal: 16, fontFamily: 'Poppins_400Regular' },
    genderContainer: { flexDirection: 'row', width: '100%', gap: 16, marginBottom: 24 },
    genderButton: { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 20, paddingVertical: '25%', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2a2a2a', gap: 12 },
    genderButtonSelected: { borderColor: '#22C922' },
    genderIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#222426', justifyContent: 'center', alignItems: 'center' },
    genderIconCircleSelected: { backgroundColor: 'rgba(34, 201, 34, 0.25)' },
    genderIcon: { fontSize: 35, color: '#888', fontFamily: 'Poppins_600SemiBold' },
    genderText: { fontSize: 22, color: '#888', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    genderTextSelected: { color: '#22C922' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 },
    backButton: { flex: 1, height: 60, backgroundColor: '#1e1e1e', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#242424' },
    backButtonText: { fontSize: 17, color: '#aaa', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
    nextButton: { flex: 1, height: 60, backgroundColor: '#D4F5D4', borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#22C922', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
    nextButtonText: { fontSize: 17, color: 'black', letterSpacing: -0.5, fontFamily: 'Poppins_600SemiBold' },
})
