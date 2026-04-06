import { Pencil } from 'lucide-react-native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface EntryProps {
    name: string
    calories: number
    protein: number
    carbs: number
    fats: number
    onEditPress?: () => void
}

export default function Entry({ name, calories, protein, carbs, fats, onEditPress }: EntryProps) {
    return (
        <View style={styles.outerwrapper}>
            <View style={styles.wrapper}>
                <View style={styles.accentBar} />
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.name} numberOfLines={1}>
                            {name}
                        </Text>
                        <View style={styles.macrosGrid}>
                            {/* Calories - Full Width */}
                            <View style={styles.caloriesRow}>
                                <Text style={styles.caloriesValue}>{calories}</Text>
                                <Text style={styles.caloriesLabel}>calories</Text>
                            </View>

                            {/* Macros Row */}
                            <View style={styles.macrosRow}>
                                <View style={styles.macroBox}>
                                    <Text style={styles.macroValue}>{protein}g</Text>
                                    <Text style={styles.macroLabel}>Protein</Text>
                                </View>
                                <View style={styles.macroDivider} />
                                <View style={styles.macroBox}>
                                    <Text style={styles.macroValue}>{carbs}g</Text>
                                    <Text style={styles.macroLabel}>Carbs</Text>
                                </View>
                                <View style={styles.macroDivider} />
                                <View style={styles.macroBox}>
                                    <Text style={styles.macroValue}>{fats}g</Text>
                                    <Text style={styles.macroLabel}>Fats</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.iconButton} onPress={onEditPress} activeOpacity={0.5}>
                        <View style={styles.iconCircle}>
                            <Pencil size={18} color="#22C922" strokeWidth={2.5} />
                        </View>
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
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },
    wrapper: {
        flexDirection: 'row',
        marginVertical: 6,
        marginHorizontal: 20,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#282A2C',
    },
    accentBar: {
        width: 4,
        backgroundColor: '#22C922',
        shadowColor: '#22C922',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    content: {
        flex: 1,
        marginRight: 10,
    },
    name: {
        fontSize: 16,
        color: '#FFF',
        letterSpacing: -0.5,
        marginBottom: 8,
        fontFamily: 'Poppins_600SemiBold',
    },
    macrosGrid: {
        gap: 6,
    },
    caloriesRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
        marginBottom: 6,
    },
    caloriesValue: {
        fontSize: 20,
        color: '#22C922',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    caloriesLabel: {
        fontSize: 12,
        color: '#888',
        letterSpacing: -0.5,
        fontFamily: 'Poppins_600SemiBold',
    },
    macrosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(18,18,18,0.5)',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    macroBox: {
        flex: 1,
        alignItems: 'center',
    },
    macroValue: {
        fontSize: 14,
        color: '#FFF',
        letterSpacing: -0.5,
        marginBottom: 2,
        fontFamily: 'Poppins_600SemiBold',
    },
    macroLabel: {
        fontSize: 10,
        color: '#666',
        letterSpacing: -0.5,
        textTransform: 'uppercase',
        fontFamily: 'Poppins_600SemiBold',
    },
    macroDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#2a2a2a',
        marginHorizontal: 3,
    },
    iconButton: {
        padding: 2,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(34, 201, 34, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(34, 201, 34, 0.25)',
    },
})
