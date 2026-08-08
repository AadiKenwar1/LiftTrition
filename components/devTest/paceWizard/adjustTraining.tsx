import OptionCard from '@/components/NeutralComponents/OptionCard'
import { useSettings } from '@/context/SettingsContext'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useScreenBottomPad } from '@/lib/hooks/useScreenBottomPad'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Dev duplicate of app/settingsScreens/adjustTraining.tsx, opening the paceWizard flow — activity level is
 * the largest lever on maintenance after body size (1.2 sedentary → 1.9 gym rat swings the burn by half),
 * so setting it here and walking straight into the nutrition wizard shows the whole chain react: burn, then
 * the pace cap, then the calorie target, then the projected date.
 *
 * Hand-synced with the original; intended deltas: it continues the flow instead of ending it (Next writes
 * activityLevel and pushes step 1, forwarding the launcher's devPrefillTarget) rather than Save →
 * router.back(); the macrosCustomized "Keep custom / Recalculate" alert and withRegeneratedTargets call are
 * dropped, because the wizard it feeds recomputes and commits every target at step 4 — regenerating here
 * would be overwritten seconds later; and the option copy is the whole-day reword, backed by devMacroMath's
 * factor map, which matches the shipped one. The screen states no calorie number of its own: arriving here nobody
 * has met a target or a pace yet, so a burn figure has nothing to mean — step 2 is the first place a number
 * has context, and it shows one live. No StepProgress, same as the original — the nutrition steps keep
 * production's own numbering rather than renumbering around this screen.
 */
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'gymrat'

// Rows that describe daily movement rather than the gym, so one five-option list can carry two independent
// variables. "or" in the middle three lets the contributions substitute for each other — a desk-bound lifter
// and a warehouse worker who never trains land on the same honest number — which is what makes a sixth
// option unnecessary. "and" in the top tier gates the highest factor behind the combination: "Gym Rat" read
// as an identity to live up to, where being on your feet all day plus training is a description you either
// match or don't. Movement is named directly instead of through a job, because occupation is only the most
// common driver of it — students, parents at home and the retired have to find themselves here too. Stored
// ids are unchanged, so a seeded profile still selects the right row.
const FREQUENCIES = [
    { id: 'sedentary' as const, label: 'Sedentary', sub: 'Sitting most of the day, and little to no exercise' },
    { id: 'light' as const, label: 'Light', sub: 'A bit of walking most days, or you exercise 1-3 days a week' },
    { id: 'moderate' as const, label: 'Moderate', sub: 'Up and about a fair amount, or you exercise 3-5 days a week' },
    { id: 'active' as const, label: 'Active', sub: 'Moving most of the day, or you exercise 6-7 days a week' },
    { id: 'gymrat' as const, label: 'Extremely Active', sub: 'Moving all day and you exercise most days' },
]

export default function AdjustTrainingScreen() {
    const { settings, setSettings } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const bottomPad = useScreenBottomPad(6)
    const devParams = useLocalSearchParams<{ devPrefillTarget?: string }>()
    const [selectedFrequency, setSelectedFrequency] = useState<ActivityLevel>(settings.activityLevel)

    function handleNext() {
        setSettings({ ...settings, activityLevel: selectedFrequency })
        if (devParams.devPrefillTarget) router.push({ pathname: '/devTest/paceWizard/adjustNutrition1', params: { devPrefillTarget: devParams.devPrefillTarget } } as never)
        else router.push('/devTest/paceWizard/adjustNutrition1' as never)
    }

    return (
        <View style={[styles.container, { paddingBottom: bottomPad }]}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.titleText}>How active is your day?</Text>
                <Text style={styles.subtitleText}>On the daily how much physical activity do you do.</Text>

                <View style={styles.options}>
                    {FREQUENCIES.map((f, i) => (
                        <OptionCard key={f.id} index={i} label={f.label} sublabel={f.sub} accent={colors.workout} selected={selectedFrequency === f.id} onPress={() => setSelectedFrequency(f.id)} />
                    ))}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
        scroll: { flex: 1 },
        scrollContent: { paddingTop: 16, paddingBottom: 16 },
        titleText: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.text, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
        subtitleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, lineHeight: 22, letterSpacing: 0.1, marginBottom: 26 },
        options: { gap: 10 },
        footer: { paddingTop: 12 },
        nextButton: { width: '100%', height: 58, borderRadius: radius.cardLg, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center' },
        nextText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.background, letterSpacing: -0.3 },
    })
}
