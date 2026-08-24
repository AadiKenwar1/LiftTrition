import HowNutritionIsCalculatedScreen from '@/app/settingsScreens/howNutritionIsCalculated'
import PressableScale from '@/components/NeutralComponents/PressableScale'
import { fonts, macroColors, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { Beef, Droplet, Flame, Wheat } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Prototype: a "how is this calculated?" popup on the onboarding plan screen. During onboarding the
 * settingsScreens routes are guarded behind onboardingComplete, so the popup can't router.push to
 * howNutritionIsCalculated — instead it embeds that screen's component inside a pageSheet Modal.
 * Three trigger placements to compare; all open the same sheet. Mock plan cards, no contexts.
 */
const MOCK_CARDS = [
    { Icon: Flame, colorKey: 'calories' as const, label: 'Calories', value: '2,263' },
    { Icon: Beef, colorKey: 'protein' as const, label: 'Protein', value: '170g' },
    { Icon: Wheat, colorKey: 'carbs' as const, label: 'Carbs', value: '226g' },
    { Icon: Droplet, colorKey: 'fats' as const, label: 'Fats', value: '75g' },
]

export default function PlanInfoPopupTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [sheetOpen, setSheetOpen] = useState(false)

    return (
        <View style={styles.screen}>
            <TouchableOpacity onPress={() => setColorScheme(isDark ? 'light' : 'dark')} activeOpacity={0.6}>
                <Text style={styles.themeToggle}>Theme: {isDark ? 'Dark' : 'Light'} (tap to flip)</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Your plan is ready</Text>
            <Text style={styles.subtitle}>Here are your daily targets. Tap any one to change it.</Text>

            <View style={styles.grid}>
                {MOCK_CARDS.map(({ Icon, colorKey, label, value }) => (
                    <View key={label} style={styles.cell}>
                        <View style={styles.card}>
                            <Icon size={18} color={colorKey === 'fats' ? colors.nutrition : macroColors[colorKey]} strokeWidth={2.2} />
                            <Text style={styles.cardLabel}>{label}</Text>
                            <Text style={styles.cardValue}>{value}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Text-link trigger, spaced evenly between the cards above and the footnote below. */}
            <PressableScale onPress={() => setSheetOpen(true)}>
                <Text style={styles.link}>How are these calculated?</Text>
            </PressableScale>

            <Text style={styles.note}>You can change these anytime in settings.</Text>

            <Modal visible={sheetOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheetOpen(false)}>
                <View style={styles.sheet}>
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>
                    <HowNutritionIsCalculatedScreen />
                </View>
            </Modal>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 16 },
        themeToggle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, marginBottom: 18 },
        title: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
        subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginTop: 6, marginBottom: 18 },
        grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        cell: { width: '47.5%' },
        card: { backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 16, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
        cardLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, letterSpacing: -0.2, marginTop: 2 },
        cardValue: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
        link: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.nutrition, textAlign: 'center', marginTop: 18 },
        note: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2, marginTop: 18, lineHeight: 18 },
        sheet: { flex: 1, backgroundColor: colors.background },
        handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
        handle: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3 },
    })
}
