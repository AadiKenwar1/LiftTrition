import { askOpenAI, askOpenAIVision } from '@/lib/openAI/openAI'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Bot, Camera, Image as ImageIcon, Sparkles } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function OpenAiTestScreen() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [testType, setTestType] = useState<'text' | 'vision' | 'barcode' | null>(null)

    // Text test
    const [question, setQuestion] = useState('What is the capital of France?')

    // Vision test
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    // Results
    const [result, setResult] = useState<string>('')
    const [parsedResult, setParsedResult] = useState<any>(null)

    async function handleTextTest() {
        if (!question.trim()) {
            Alert.alert('Error', 'Please enter a question')
            return
        }

        setLoading(true)
        setResult('')
        setParsedResult(null)
        setTestType('text')

        try {
            const response = await askOpenAI(question)
            setResult(response)
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to get response')
            setResult(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    async function pickImage() {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photo library')
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        })

        if (!result.canceled && result.assets[0].base64) {
            setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`)
        }
    }

    async function takePhoto() {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync()

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow camera access')
            return
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        })

        if (!result.canceled && result.assets[0].base64) {
            setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`)
        }
    }

    async function handleVisionTest() {
        if (!selectedImage) {
            Alert.alert('Error', 'Please select an image first')
            return
        }

        setLoading(true)
        setResult('')
        setParsedResult(null)
        setTestType('vision')

        try {
            const response = await askOpenAIVision(selectedImage)
            setResult(response)

            // Try to parse JSON
            try {
                const parsed = JSON.parse(response)
                setParsedResult(parsed)
            } catch {
                // Not JSON, that's okay
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to analyze image')
            setResult(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    function clearResults() {
        setResult('')
        setParsedResult(null)
        setSelectedImage(null)
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Bot size={48} color="#22C922" strokeWidth={2.5} />
                    </View>
                </View>

                <Text style={styles.title}>OpenAI Test Screen</Text>
                <Text style={styles.subtitle}>Test your AI functions</Text>

                {/* Text Test Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Sparkles size={20} color="#22C922" strokeWidth={2.5} />
                        <Text style={styles.sectionTitle}>Text Chat Test</Text>
                    </View>

                    <TextInput style={styles.input} placeholder="Ask a question..." placeholderTextColor="#666" value={question} onChangeText={setQuestion} multiline />

                    <TouchableOpacity onPress={handleTextTest} disabled={loading} activeOpacity={0.8} style={styles.buttonTouchable}>
                        <LinearGradient colors={['#3CB855', '#22C922', '#5CE073']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
                            <Text style={styles.buttonText}>Test Text Chat</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Vision Test Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ImageIcon size={20} color="#22C922" strokeWidth={2.5} />
                        <Text style={styles.sectionTitle}>Vision Test (Food/Label)</Text>
                    </View>

                    <View style={styles.imagePickerRow}>
                        <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton} activeOpacity={0.5}>
                            <ImageIcon size={20} color="#22C922" strokeWidth={2.5} />
                            <Text style={styles.imagePickerText}>Pick Image</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={takePhoto} style={styles.imagePickerButton} activeOpacity={0.5}>
                            <Camera size={20} color="#22C922" strokeWidth={2.5} />
                            <Text style={styles.imagePickerText}>Take Photo</Text>
                        </TouchableOpacity>
                    </View>

                    {selectedImage && <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity onPress={handleVisionTest} disabled={loading || !selectedImage} activeOpacity={0.8} style={[styles.buttonTouchable, styles.halfButton]}>
                            <LinearGradient colors={!selectedImage ? ['#333', '#333'] : ['#3CB855', '#22C922', '#5CE073']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
                                <Text style={styles.buttonText}>Test Vision</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => alert('Coming Soon')} disabled={loading || !selectedImage} activeOpacity={0.8} style={[styles.buttonTouchable, styles.halfButton]}>
                            <LinearGradient colors={!selectedImage ? ['#333', '#333'] : ['#3CB855', '#22C922', '#5CE073']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
                                <Text style={styles.buttonText}>Test Barcode</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Loading Indicator */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#22C922" />
                        <Text style={styles.loadingText}>{testType === 'text' ? 'Thinking...' : 'Analyzing image...'}</Text>
                    </View>
                )}

                {/* Results Section */}
                {result && !loading && (
                    <View style={styles.resultsSection}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultTitle}>Result</Text>
                            <TouchableOpacity onPress={clearResults} activeOpacity={0.5}>
                                <Text style={styles.clearButton}>Clear</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Parsed JSON (if available) */}
                        {parsedResult && (
                            <View style={styles.parsedContainer}>
                                <Text style={styles.parsedTitle}>Parsed Data:</Text>
                                <View style={styles.parsedItem}>
                                    <Text style={styles.parsedLabel}>Name:</Text>
                                    <Text style={styles.parsedValue}>{parsedResult.name || 'N/A'}</Text>
                                </View>
                                <View style={styles.parsedItem}>
                                    <Text style={styles.parsedLabel}>Calories:</Text>
                                    <Text style={styles.parsedValue}>{parsedResult.calories || 0}</Text>
                                </View>
                                <View style={styles.parsedItem}>
                                    <Text style={styles.parsedLabel}>Protein:</Text>
                                    <Text style={styles.parsedValue}>{parsedResult.protein || 0}g</Text>
                                </View>
                                <View style={styles.parsedItem}>
                                    <Text style={styles.parsedLabel}>Carbs:</Text>
                                    <Text style={styles.parsedValue}>{parsedResult.carbs || 0}g</Text>
                                </View>
                                <View style={styles.parsedItem}>
                                    <Text style={styles.parsedLabel}>Fats:</Text>
                                    <Text style={styles.parsedValue}>{parsedResult.fats || 0}g</Text>
                                </View>
                                {parsedResult.ingredients && (
                                    <View style={styles.parsedItem}>
                                        <Text style={styles.parsedLabel}>Ingredients:</Text>
                                        <Text style={styles.parsedValue}>{parsedResult.ingredients.join(', ')}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Raw Response */}
                        <View style={styles.rawContainer}>
                            <Text style={styles.rawTitle}>Raw Response:</Text>
                            <Text style={styles.rawText} selectable>
                                {result}
                            </Text>
                        </View>
                    </View>
                )}
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
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 32,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
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
        marginBottom: 6,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitle: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'Poppins_400Regular',
        letterSpacing: 0.2,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    input: {
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 2,
        borderColor: '#333',
        marginBottom: 12,
        minHeight: 80,
        textAlignVertical: 'top',
        fontFamily: 'Poppins_400Regular',
    },
    buttonTouchable: {
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
    button: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 15,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    imagePickerRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    imagePickerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        paddingVertical: 14,
        borderWidth: 2,
        borderColor: '#333',
    },
    imagePickerText: {
        fontSize: 14,
        color: '#22C922',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 12,
        backgroundColor: '#1e1e1e',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    halfButton: {
        flex: 1,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#888',
        fontFamily: 'Poppins_500Medium',
    },
    resultsSection: {
        marginTop: 8,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    resultTitle: {
        fontSize: 18,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    clearButton: {
        fontSize: 14,
        color: '#22C922',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    parsedContainer: {
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#22C922',
    },
    parsedTitle: {
        fontSize: 14,
        color: '#22C922',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    parsedItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    parsedLabel: {
        fontSize: 14,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    parsedValue: {
        fontSize: 14,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    rawContainer: {
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#333',
    },
    rawTitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    rawText: {
        fontSize: 13,
        color: '#FFF',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        lineHeight: 20,
    },
})
