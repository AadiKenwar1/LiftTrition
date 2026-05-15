import DatePicker from '@/components/NeutralComponents/DatePicker'
import { useNutrition } from '@/context/NutritionContext'
import { isDateAfterToday } from '@/lib/utils/dateHelper'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Calendar } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function DateModal() {
    const { selectedDate, setSelectedDate } = useNutrition()
    const router = useRouter()
    const [tempDate, setTempDate] = useState(selectedDate)
    const insets = useSafeAreaInsets()
    const scrollBottomPad = Math.max(insets.bottom, 20) + 140

    const showInvalidDateAlert = () => {
        Keyboard.dismiss()
        Alert.alert('Invalid Date', "You can't view nutrition for future dates. Please select today or an earlier date.")
    }

    const handleConfirm = () => {
        if (isDateAfterToday(tempDate)) {
            showInvalidDateAlert()
            return
        }
        setSelectedDate(tempDate)
        router.back()
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces>
                {/* Icon Section */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Calendar size={40} color="#22C922" strokeWidth={2.5} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Change Date</Text>
                <Text style={styles.subtitle}>Choose a date to view nutrition logs {'\n'}Logs will be added for the set date. </Text>

                {/* Date Picker */}
                <DatePicker selectedDate={tempDate} onDateChange={setTempDate} color="#22C922" />

                {/* Confirm Button */}
                <TouchableOpacity onPress={handleConfirm} activeOpacity={0.8} style={styles.confirmButtonTouchable}>
                    <LinearGradient colors={['#32CD32', '#22C922']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmButton}>
                        <Text style={styles.confirmButtonText}>Confirm</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
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
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 12,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
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
        marginBottom: 4,
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    confirmButtonTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 16,
        shadowColor: '#22C922',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    confirmButton: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        fontSize: 17,
        color: '#FFF',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.5,
    },
})
