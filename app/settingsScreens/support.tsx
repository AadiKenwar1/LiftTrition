import { supabase } from '@/lib/supabase/client'
import { HelpCircle } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type SubjectType = 'support' | 'feature_request'

const ACCENT = '#fff'
const ACCENT_MUTED = 'rgba(255, 255, 255, 0.12)'

export default function SupportScreen() {
    const [subjectType, setSubjectType] = useState<SubjectType>('support')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const insets = useSafeAreaInsets()
    const scrollBottomPad = Math.max(insets.bottom, 20) + 32

    async function handleSend() {
        const trimmedSubject = subject.trim()
        const trimmedMessage = message.trim()

        if (!trimmedSubject) {
            Alert.alert('Missing subject', 'Please enter a subject for your message.')
            return
        }
        if (!trimmedMessage) {
            Alert.alert('Missing message', 'Please describe your issue or question.')
            return
        }

        setLoading(true)
        try {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession()
            if (sessionError || !session?.user) {
                Alert.alert('Error', 'You must be signed in to send a support request.')
                return
            }

            const { error } = await supabase.from('support_requests').insert({
                user_id: session.user.id,
                subject_type: subjectType,
                subject: trimmedSubject,
                message: trimmedMessage,
            })

            if (error) {
                Alert.alert('Error', error.message || 'Failed to send. Please try again.')
                return
            }

            Alert.alert('Sent', 'Your message has been sent. We will get back to you soon.', [{ text: 'OK', onPress: () => (setSubject(''), setMessage(''), setSubjectType('support')) }])
        } catch {
            Alert.alert('Error', 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.flex}>
                    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces>
                        <View style={styles.iconCircle}>
                            <HelpCircle size={40} color={ACCENT} strokeWidth={2} />
                        </View>

                        <Text style={styles.titleText} adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={2}>
                            Support & Feature Requests
                        </Text>
                        <Text style={styles.subtitleText} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={4}>
                            Describe your issue, question, or feature idea. We will respond as soon as possible.
                        </Text>

                        <View style={styles.typeToggleContainer}>
                            <TouchableOpacity style={[styles.typeButton, subjectType === 'support' && { backgroundColor: ACCENT_MUTED, borderColor: ACCENT }]} onPress={() => setSubjectType('support')} activeOpacity={0.5} disabled={loading}>
                                <Text style={[styles.typeButtonText, subjectType === 'support' && styles.typeButtonTextActive]} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}>
                                    LiftTrition Support
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeButton, subjectType === 'feature_request' && { backgroundColor: ACCENT_MUTED, borderColor: ACCENT }]}
                                onPress={() => setSubjectType('feature_request')}
                                activeOpacity={0.5}
                                disabled={loading}
                            >
                                <Text style={[styles.typeButtonText, subjectType === 'feature_request' && styles.typeButtonTextActive]} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2}>
                                    Request a Feature
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>
                                    Subject
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={subjectType === 'support' ? 'e.g. Billing question, Bug report' : 'e.g. Add dark mode, Export data'}
                                    placeholderTextColor="#aaa"
                                    value={subject}
                                    onChangeText={setSubject}
                                    editable={!loading}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>
                                    Message
                                </Text>
                                <TextInput
                                    style={[styles.input, styles.messageInput]}
                                    placeholder={subjectType === 'support' ? 'Describe your issue or question...' : 'Describe the feature you would like to see...'}
                                    placeholderTextColor="#aaa"
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    numberOfLines={5}
                                    textAlignVertical="top"
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.sendButton, loading && styles.sendButtonDisabled]} onPress={handleSend} disabled={loading} activeOpacity={0.8}>
                            <Text style={styles.sendButtonText} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>
                                {loading ? 'Sending...' : 'Send'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 25,
        paddingTop: 20,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        alignSelf: 'center',
        marginBottom: 12,
    },
    titleText: {
        width: '100%',
        fontSize: 22,
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 4,
        textAlign: 'center',
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitleText: {
        width: '100%',
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
        letterSpacing: 0.2,
        marginBottom: 24,
        paddingHorizontal: 8,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 22,
    },
    typeToggleContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginBottom: 20,
    },
    typeButton: {
        flex: 1,
        minHeight: 48,
        paddingVertical: 10,
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#242424',
    },
    typeButtonText: {
        width: '100%',
        fontSize: 14,
        color: '#aaa',
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
    typeButtonTextActive: {
        color: '#fff',
    },
    inputContainer: {
        width: '100%',
        gap: 20,
        marginBottom: 28,
    },
    inputGroup: { width: '100%' },
    inputLabel: {
        width: '100%',
        fontSize: 14,
        color: '#aaa',
        marginBottom: 8,
        paddingLeft: 4,
        fontFamily: 'Poppins_600SemiBold',
    },
    input: {
        backgroundColor: '#1e1e1e',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#242424',
        paddingHorizontal: 16,
        height: 52,
        fontSize: 16,
        color: '#fff',
        fontFamily: 'Poppins_400Regular',
    },
    messageInput: {
        height: 140,
        paddingTop: 14,
        paddingBottom: 14,
    },
    sendButton: {
        width: '100%',
        minHeight: 56,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendButtonText: {
        maxWidth: '100%',
        fontSize: 16,
        color: '#121212',
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
})
