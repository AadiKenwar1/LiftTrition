import { LinearGradient } from 'expo-linear-gradient'
import { Target } from 'lucide-react-native'
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

export type GoalType = 'lose' | 'gain' | 'maintain'

export interface GoalViewProps {
    value: GoalType | null
    onChange: (g: GoalType) => void
    targetWeight: string
    onTargetWeightChange: (s: string) => void
    unitSystem: 'imperial' | 'metric'
    onNext: () => void
    onBack: () => void
    stepIndex: number
}

const ACCENT = '#22C922'

export default function GoalView({ value, onChange, targetWeight, onTargetWeightChange, unitSystem, onNext, onBack, stepIndex }: GoalViewProps) {
    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.outerContainer}>
                <LinearGradient colors={['rgba(34, 201, 34, 0.14)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Step Indicator */}
                    <View style={styles.stepIndicator}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <View key={i} style={[styles.stepDot, i === stepIndex && styles.stepDotActive]} />
                        ))}
                    </View>

                    {/* Icon */}
                    <View style={[styles.iconCircle, { borderColor: ACCENT }]}>
                        <Target size={86} color={ACCENT} strokeWidth={2} />
                    </View>

                    {/* Title */}
                    <Text style={styles.titleText}>What's Your {'\n'}Body Weight Goal?</Text>
                    <Text style={styles.subtitleText}>We use your body weight goal to adjust your nutrition goals</Text>

                    {/* Goal Options */}
                    <View style={styles.goalContainer}>
                        <TouchableOpacity style={[styles.goalButton, value === 'lose' && { borderColor: ACCENT }]} onPress={() => onChange('lose')} activeOpacity={0.5}>
                            <Text style={[styles.goalText, value === 'lose' && styles.goalTextSelected]}>Lose</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.goalButton, value === 'maintain' && { borderColor: ACCENT }]} onPress={() => onChange('maintain')} activeOpacity={0.5}>
                            <Text style={[styles.goalText, value === 'maintain' && styles.goalTextSelected]}>Maintain</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.goalButton, value === 'gain' && { borderColor: ACCENT }]} onPress={() => onChange('gain')} activeOpacity={0.5}>
                            <Text style={[styles.goalText, value === 'gain' && styles.goalTextSelected]}>Gain</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Target Weight Input or Maintain Message */}
                    {value && value !== 'maintain' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Target Weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput style={styles.input} placeholder={unitSystem === 'imperial' ? '150' : '68'} placeholderTextColor="#555" keyboardType="numeric" value={targetWeight} onChangeText={onTargetWeightChange} />
                                <Text style={styles.unitText}>{unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                            </View>
                        </View>
                    )}

                    {value === 'maintain' && (
                        <View style={styles.maintainMessageContainer}>
                            <Text style={styles.maintainMessageText}>Maintaining body weight, so no target weight needed</Text>
                        </View>
                    )}
                </ScrollView>
                {/* Navigation Buttons */}
                <View style={styles.navFooter}>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.8}>
                            <Text style={styles.nextButtonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#121212',
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
        paddingHorizontal: 25,
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 24,
    },
    stepIndicator: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 28,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#333',
    },
    stepDotActive: {
        width: 24,
        backgroundColor: '#22C922',
        borderRadius: 4,
    },
    navFooter: {
        paddingHorizontal: 25,
        paddingBottom: 50,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#1e1e1e',
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
        marginBottom: 24,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 22,
    },
    goalContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
        marginBottom: 24,
    },
    goalButton: {
        flex: 1,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#242424',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#242424',
    },
    goalText: {
        fontSize: 16,
        color: '#aaa',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_500Medium',
    },
    goalTextSelected: {
        color: '#fff',
    },
    inputGroup: {
        width: '100%',
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        color: '#aaa',
        marginBottom: 8,
        paddingLeft: 4,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#242424',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#242424',
        paddingHorizontal: 16,
        height: 60,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    unitText: {
        fontSize: 16,
        color: '#aaa',
        marginLeft: 12,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    maintainMessageContainer: {
        width: '100%',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 24,
        backgroundColor: '#1e1e1e',
        borderColor: '#1e1e1e',
    },
    maintainMessageText: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
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
        backgroundColor: '#1e1e1e',
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
