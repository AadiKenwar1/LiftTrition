import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface CustomHeaderProps {
    title: string
    showBack: boolean
}

export default function CustomHeader({ title, showBack }: CustomHeaderProps) {
    const router = useRouter()

    return (
        <View style={styles.container}>
            <View style={styles.headerContent}>
                {showBack && (
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
                        <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                )}
                {title && <Text style={styles.title}>{title}</Text>}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        height: 100,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        flexDirection: 'row',
        position: 'relative',
    },
    headerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: 20,
    },
    backButton: {
        left: 0,
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
        letterSpacing: 0.5,
        flex: 1,
        textAlign: 'center',
    },
})
