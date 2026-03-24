import { useSettings } from '@/context/SettingsContext'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Scale } from 'lucide-react-native'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function UpdateBWModal() {
    const { settings, handleUpdateBw } = useSettings()
    const [weight, setWeight] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    const currentWeight = settings.bodyWeight > 0 ? settings.bodyWeight.toFixed(1) : '--'

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <View style={styles.content}>
                {/* Icon Section */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Scale size={72} color="#22C922" strokeWidth={2.5} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Update Body Weight</Text>
                <Text style={styles.subtitle}>
                    Current: {currentWeight} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'} {'\n'}Nutrition goals will be updated automatically
                </Text>

                {/* Input Field */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, isFocused && styles.inputFocused]}
                        placeholder="Enter new weight"
                        placeholderTextColor="#666"
                        value={weight}
                        onChangeText={setWeight}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        keyboardType="decimal-pad"
                        autoFocus
                    />
                </View>

                {/* Update Button */}
                <TouchableOpacity
                    onPress={() => {
                        handleUpdateBw(Number(weight))
                        router.back()
                    }}
                    disabled={!weight.trim()}
                    activeOpacity={0.8}
                    style={styles.updateButtonTouchable}
                >
                    <LinearGradient colors={!weight.trim() ? ['#333', '#333'] : ['#32CD32', '#22C922']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.updateButton}>
                        <Text style={styles.updateButtonText}>Update Weight</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#333',
        borderRadius: 3,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 32,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 12,
    },
    iconCircle: {
        width: 144,
        height: 144,
        borderRadius: 72,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#22C922',
    },
    title: {
        fontSize: 24,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 6,
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    inputContainer: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#282A2C',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#282A2C',
        fontFamily: 'Poppins_400Regular',
    },
    inputFocused: {
        borderColor: '#22C922',
    },
    updateButtonTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#22C922',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    updateButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    updateButtonText: {
        fontSize: 17,
        color: '#FFF',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
})
