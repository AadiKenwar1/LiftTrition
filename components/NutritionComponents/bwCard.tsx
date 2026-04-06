import { useSettings } from '@/context/SettingsContext'
import { useRouter } from 'expo-router'
import { Pencil } from 'lucide-react-native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface CardProps {
    height?: number
}

export default function BwCard({ height = 120 }: CardProps) {
    const { settings } = useSettings()
    const router = useRouter()

    // Format weight to 1 decimal place
    const formatWeight = (weight: number) => {
        return weight > 0 ? weight.toFixed(1) : '--'
    }

    const handleEditPress = () => {
        router.push('/nutritionScreens/updateBWModal')
    }

    return (
        <View style={styles.outerwrapper}>
            <View style={[styles.wrapper, { height }]}>
                <View style={[styles.accentBar, { backgroundColor: '#22C922', shadowColor: '#22C922' }]} />
                <View style={styles.content}>
                    <View style={styles.innerContainer}>
                        {/* Current Weight Display */}
                        <View style={styles.mainSection}>
                            <View style={styles.valueRow}>
                                <Text style={styles.mainValue}>{formatWeight(settings.bodyWeight)}</Text>
                                <Text style={styles.mainUnit}>{settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}</Text>
                            </View>
                            <Text style={styles.goalText}>
                                Goal: {formatWeight(settings.goalWeight)} {settings.unitSystem === 'imperial' ? 'lbs' : 'kg'}
                            </Text>
                            <Text style={styles.hintText}>(Tap pencil to update)</Text>
                        </View>
                    </View>

                    {/* Edit Button - Positioned Absolute */}
                    <TouchableOpacity style={styles.editButton} onPress={handleEditPress} activeOpacity={0.5}>
                        <Pencil size={18} color="#22C922" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
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
        marginVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#282A2C',
    },
    accentBar: {
        height: 3,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },

    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    headerRow: {
        marginBottom: 0,
    },
    headerTitle: {
        fontSize: 14,
        color: '#22C922',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    hintText: {
        fontSize: 12,
        color: '#888',
        letterSpacing: 0.2,
        marginTop: 2,
        fontFamily: 'Poppins_500Medium',
    },
    mainSection: {
        gap: 4,
        marginTop: 2,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    mainValue: {
        fontSize: 32,
        color: '#fff',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    mainUnit: {
        fontSize: 16,
        color: '#888',
        marginBottom: 2,
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    goalText: {
        fontSize: 13,
        color: '#888',
        letterSpacing: 0.2,
        fontFamily: 'Poppins_500Medium',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(34, 201, 34, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(34, 201, 34, 0.5)',
        marginLeft: 12,
    },
})
