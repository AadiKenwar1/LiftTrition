import { Image } from 'expo-image'
import { Menu } from 'lucide-react-native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface LogProps {
    text: string
    subtitle?: string
    imgSource?: number
    onPress: () => void
    onEditPress: () => void
    onMenuPress: () => void
}

export default function Log({ text, subtitle, imgSource, onPress, onEditPress, onMenuPress }: LogProps) {
    return (
        <TouchableOpacity onPress={onPress}>
            <View style={styles.outerwrapper}>
                <View style={styles.wrapper}>
                    <View style={styles.accentBar} />
                    <View style={styles.container}>
                        {imgSource && (
                            <View style={styles.imageGlowRing}>
                                <View style={styles.imageCircle}>
                                    <Image source={imgSource} style={styles.exerciseImage} contentFit="contain" />
                                </View>
                            </View>
                        )}

                        <View style={styles.content}>
                            <Text style={styles.text} numberOfLines={2}>
                                {text}
                            </Text>
                            {subtitle && (
                                <Text style={styles.subtitle} numberOfLines={1}>
                                    {subtitle}
                                </Text>
                            )}
                        </View>

                        <View style={styles.icons}>
                            <TouchableOpacity style={styles.iconButton} onPress={onEditPress} onLongPress={onMenuPress} delayLongPress={200} hitSlop={5} activeOpacity={0.5}>
                                <View style={styles.iconCircle}>
                                    <Menu size={20} color="#2f80ed" strokeWidth={2.5} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    outerwrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    wrapper: {
        flexDirection: 'row',
        height: 84,
        marginVertical: 6,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
    },
    accentBar: {
        width: 4,
        backgroundColor: '#2f80ed',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    content: {
        flex: 1,
        marginRight: 12,
        marginLeft: 4,
    },
    imageGlowRing: {
        width: 52,
        height: 52,
        borderRadius: 26,
        marginRight: 10,
        flexShrink: 0,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2f80ed',
        shadowColor: '#2f80ed',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 10,
    },
    imageCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    exerciseImage: {
        width: 36,
        height: 36,
        tintColor: '#ffffff',
    },
    icons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        padding: 2,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(47, 128, 237, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(47, 128, 237, 0.5)',
    },
    text: {
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    subtitle: {
        fontSize: 13,
        color: '#aaa',
        marginTop: 4,
        letterSpacing: 0.2,
        fontFamily: 'Poppins_400Regular',
    },
})
