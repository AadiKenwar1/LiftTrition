import { CALORIE_SCENARIOS, setCalorieScenario, type CalorieScenario } from '@/components/devTest/paceWizard/calorieScenario'
import { useSettings } from '@/context/SettingsContext'
import type { Settings } from '@/context/SettingsContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { calculateAge } from '@/lib/utils/dateHelper'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Pace-flow harness: pick a pace-audit persona and a goal scenario, seed the dev account's profile with them,
 * then walk the dev duplicate of the adjust flow (components/devTest/paceWizard/ — hand-synced copies of the
 * adjust-training screen and the four adjust-nutrition screens, where pace display work is prototyped before
 * it lands in the real flow). The walk opens on activity, the biggest lever on maintenance after body size,
 * so the whole chain can be moved from one screen and watched react. A seeder is needed because the wizard
 * reads gender/birthDate/activityLevel from settings (its params never carry them), so these bodies can't be
 * impersonated from inside the flow — the activity screen is the one seeded field the walk can then change
 * by hand. The rest of the pre-filling rides on the same seed: step 1 reads its goal tiles and current
 * weight from settings and the step-2 slider seeds from
 * settings.goalPace, so the copy fills itself in through the same code the production wizard runs — nothing
 * here fabricates mid-flow params or skips a screen. The step-1 target field is the exception — production
 * deliberately never seeds it — so the launcher passes it as devPrefillTarget, which the copy reads directly.
 * bodyWeight is part of the seed so walking straight through doesn't log a weigh-in (step 4 only stamps one
 * when the step-1 weight differs from settings.bodyWeight); deliberately editing the step-1 weight is
 * exactly how to exercise that path. The copy's Save commits settings for real, so the post-save checks
 * (profile row, projections, later weigh-in drift) still run against production surfaces. The calorie chip
 * is the one seed that isn't a body fact: step 4's projection states are defined by where the calorie
 * target sits against maintenance, so the chip places it there (see paceWizard/calorieScenario.ts) rather
 * than asking for maintenance to be worked out by hand and typed into step 3.
 */

// The body a persona overwrites; goalType/goalWeight/goalPace come from the goal chip at apply time, and age
// becomes birthDate then too, so the persona can't drift stale. goalOffset is the distance to the suggested
// target weight (kept above validateTargetWeight's 50 lb floor for the smallest body).
type PersonaBody = Pick<Settings, 'gender' | 'activityLevel' | 'height' | 'bodyWeight' | 'unitSystem'> & { age: number }

// The audit bodies plus a young cohort, ordered youngest first — age leads each label so the ordering is
// visible in the list. Age is the strongest lever on maintenance after size (Mifflin-St Jeor subtracts
// 5 kcal a year), so walking the list top to bottom walks the cap from the ceiling down to the worst case.
// facts carry the hand-computed maintenance and the honest Cut slider max at the nutrition floor
// ((maintenance − protein·4 − fat·9) / 500, floored to the 0.1 step, 2.0 ceiling — the point past which
// carbs would go negative) — the numbers the copy's step-2 slider cap and kcal readout should visibly
// agree with (they call devMaxPace/devCalorieTarget). The burn matches production exactly (the factor
// maps agree); the cap is the dev prototype's own rule — shipped has no per-body cap, only PACE_CEILING
// on purpose.
const PERSONAS: { key: string; label: string; facts: string; goalOffset: number; body: PersonaBody }[] = [
    { key: 'activeM150', label: `18 · M · 5'9" · 150 lb · active`, facts: 'burns ≈ 2,917 kcal · honest max 2.0 (ceiling)', goalOffset: 20, body: { gender: 'male', age: 18, activityLevel: 'active', height: 69, bodyWeight: 150, unitSystem: 'imperial' } },
    { key: 'sedentaryF140', label: `18 · F · 5'4" · 140 lb · sedentary`, facts: 'burns ≈ 1,680 kcal · honest max 1.3 lb/wk — young and still capped', goalOffset: 20, body: { gender: 'female', age: 18, activityLevel: 'sedentary', height: 64, bodyWeight: 140, unitSystem: 'imperial' } },
    { key: 'moderateM170', label: `20 · M · 5'11" · 170 lb · moderate`, facts: 'burns ≈ 2,795 kcal · honest max 2.0 (ceiling)', goalOffset: 20, body: { gender: 'male', age: 20, activityLevel: 'moderate', height: 71, bodyWeight: 170, unitSystem: 'imperial' } },
    { key: 'sedentaryM190', label: `22 · M · 5'11" · 190 lb · sedentary`, facts: 'burns ≈ 2,261 kcal · honest max 1.8 lb/wk', goalOffset: 20, body: { gender: 'male', age: 22, activityLevel: 'sedentary', height: 71, bodyWeight: 190, unitSystem: 'imperial' } },
    { key: 'gymRatM230', label: `25 · M · 6'2" · 230 lb · gym rat`, facts: 'burns ≈ 3,986 kcal · honest max 2.0 (ceiling)', goalOffset: 20, body: { gender: 'male', age: 25, activityLevel: 'gymrat', height: 74, bodyWeight: 230, unitSystem: 'imperial' } },
    { key: 'lightF120', label: `25 · F · 5'2" · 120 lb · light`, facts: 'burns ≈ 1,709 kcal · honest max 1.7 lb/wk — 859 kcal at the cap, 2 g carbs', goalOffset: 20, body: { gender: 'female', age: 25, activityLevel: 'light', height: 62, bodyWeight: 120, unitSystem: 'imperial' } },
    { key: 'lightF170', label: `30 · F · 5'6" · 170 lb · light`, facts: 'burns ≈ 2,073 kcal · honest max 1.7 lb/wk', goalOffset: 20, body: { gender: 'female', age: 30, activityLevel: 'light', height: 66, bodyWeight: 170, unitSystem: 'imperial' } },
    { key: 'sedentaryF150', label: `30 · F · 5'4" · 150 lb · sedentary`, facts: 'burns ≈ 1,662 kcal · honest max 1.1 lb/wk', goalOffset: 20, body: { gender: 'female', age: 30, activityLevel: 'sedentary', height: 64, bodyWeight: 150, unitSystem: 'imperial' } },
    { key: 'moderateM200', label: `40 · M · 5'10" · 200 lb · moderate`, facts: 'burns ≈ 2,826 kcal · honest max 2.0 (ceiling)', goalOffset: 20, body: { gender: 'male', age: 40, activityLevel: 'moderate', height: 70, bodyWeight: 200, unitSystem: 'imperial' } },
    { key: 'sedentaryM200', label: `40 · M · 5'10" · 200 lb · sedentary`, facts: 'burns ≈ 2,188 kcal · honest max 1.5 lb/wk', goalOffset: 20, body: { gender: 'male', age: 40, activityLevel: 'sedentary', height: 70, bodyWeight: 200, unitSystem: 'imperial' } },
    { key: 'sedentaryF115', label: `45 · F · 5'0" · 115 lb · sedentary`, facts: 'burns ≈ 1,306 kcal · honest max 0.9 lb/wk — the long-timeline case', goalOffset: 20, body: { gender: 'female', age: 45, activityLevel: 'sedentary', height: 60, bodyWeight: 115, unitSystem: 'imperial' } },
    { key: 'sedentaryM170', label: `55 · M · 5'8" · 170 lb · sedentary`, facts: 'burns ≈ 1,897 kcal · honest max 1.3 lb/wk', goalOffset: 20, body: { gender: 'male', age: 55, activityLevel: 'sedentary', height: 68, bodyWeight: 170, unitSystem: 'imperial' } },
    { key: 'sedentaryF90', label: `70 · F · 4'10" · 90 lb · sedentary`, facts: 'burns ≈ 982 kcal · honest max 0.6 lb/wk — 682 kcal at the cap, the red-card case', goalOffset: 10, body: { gender: 'female', age: 70, activityLevel: 'sedentary', height: 58, bodyWeight: 90, unitSystem: 'imperial' } },
]

// One scenario per goal type. pace lands in settings.goalPace so the real step-2 slider pre-fills itself:
// Cut seeds 2.0 — the ceiling, so every persona whose cap sits under it arrives clamped AT the cap; Bulk
// seeds the 1.0 default (a surplus has no floor). Maintain has no pace — step 1 routes 1 → 3.
const GOALS = [
    { value: 'lose', label: 'Cut', pace: 2 },
    { value: 'gain', label: 'Bulk', pace: 1 },
    { value: 'maintain', label: 'Maintain', pace: null },
] as const

// The manual pass, one line per wizard surface.
const CHECKS = [
    'Activity — rows describe the whole day, not just the gym; the seeded level is pre-selected, and changing it moves the burn and the Cut cap from step 2 onward — but never the grams of protein.',
    'Step 2 — the slider max and live kcal readout should match the facts line above; only Cut is capped, and both directions stop at 2.0. Near the cap the amber low-carb line appears — carbs run keto-low (2-15 g) there by design, never negative — and the smallest body\'s cap lands under 800, where the card goes red instead of the target moving.',
    'Step 3 — protein is 1.1 g per lb of basis weight on a Cut, 0.9 otherwise; fat 0.30 / 0.35 / 0.40 by goal. Basis is the scale weight ceilinged at what BMI 30 weighs at that height, so the two heavy personas prescribe less per raw pound than the rest. Cut and Bulk scale off the current weight, Maintain off the goal weight — editing the step-1 target moves protein on Maintain only. Grams hold steady as the pace moves and still sum back to the calorie target.',
    'Step 3 — hand-edit calories: the amber warnings react (the floor line names this body\'s own number), protein holds its ground, carbs absorb the change, and the edit must ride into step 4.',
    'Step 4 — quoted weeks follow the calorie number that left step 3, not the slider: with the same persona, moving only the calorie chip must move the date. Maintain holds 12 weeks whatever the calories say.',
    'Step 4 — on the two no-deficit chips the estimate reads — with the wrong-direction line, and the chart\'s end label reads — too; check it doesn\'t look broken there. Barely moving is the long-timeline layout test: a four-digit week count still has to fit the stat card.',
    'Step 1 — editing the weight stamps a weigh-in on save; that plus a later real weigh-in is the drift test.',
    'After save — profile shows the pace you set. Production keeps the shipped factors and percentage macros until this lands in the real screens, so its numbers will differ.',
]

// Birthday pinned mid-month, ~6 months back, then the age subtracted — keeps calculateAge off the
// birthday-today boundary no matter when Apply is tapped.
function birthDateForAge(age: number): Date {
    const d = new Date()
    d.setDate(15)
    d.setMonth(d.getMonth() - 6)
    d.setFullYear(d.getFullYear() - age)
    return d
}

// The run sheet for the current selection: what each seeded screen should arrive showing.
function scriptFor(persona: (typeof PERSONAS)[number], goal: (typeof GOALS)[number]): string {
    const w = persona.body.bodyWeight
    const opening = `Activity opens on ${persona.body.activityLevel}.`
    if (goal.value === 'lose') return `${opening} Step 1 pre-fills Cut at ${w} lb, goal ${w - persona.goalOffset}. Step 2 seeds at 2.0 lb/wk; check the slider max and kcal readout against that same line.`
    if (goal.value === 'gain') return `${opening} Step 1 pre-fills Bulk at ${w} lb, goal ${w + persona.goalOffset}. Step 2 seeds at 1.0 lb/wk; a surplus has no floor, so the full 0.1–2.0 range stays.`
    return `Step 1 pre-fills Maintain at ${w} lb — no target field, no slider (routes 1 → 3). Step 3 should show raw maintenance (≈ the burns number), not a floored one.`
}

export default function PaceFlowLauncher() {
    const { settings, setSettings } = useSettings()
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const [goal, setGoal] = useState<(typeof GOALS)[number]>(GOALS[0])
    const [scenario, setScenario] = useState<CalorieScenario>('plan')

    const unit = weightUnitLabel(settings.unitSystem)
    const heightUnit = settings.unitSystem === 'imperial' ? 'in' : 'cm'
    const selected = PERSONAS.find((p) => p.key === selectedKey)

    // Writes persona + goal scenario over the dev account's real profile (it syncs like any settings write),
    // then opens the wizard at step 1. Same-tick setSettings + push is the adjustNutrition4 save pattern.
    const applyAndLaunch = () => {
        if (!selected) return
        const { age, ...body } = selected.body
        const goalWeight = goal.value === 'lose' ? body.bodyWeight - selected.goalOffset : goal.value === 'gain' ? body.bodyWeight + selected.goalOffset : body.bodyWeight
        setSettings({
            ...settings,
            ...body,
            birthDate: birthDateForAge(age),
            goalType: goal.value,
            goalWeight,
            goalPace: goal.pace ?? settings.goalPace,
        })
        setCalorieScenario(scenario)
        // Into the activity screen, which forwards the prefill on to step 1. Maintain has no target field,
        // so only cut/bulk carry one.
        if (goal.value === 'maintain') router.push('/devTest/paceWizard/adjustTraining' as never)
        else router.push({ pathname: '/devTest/paceWizard/adjustTraining', params: { devPrefillTarget: String(goalWeight) } } as never)
    }

    // The unseeded walk: the profile is left alone, but the calorie scenario still applies so the
    // projection states are reachable against a real body.
    const launchUnseeded = () => {
        setCalorieScenario(scenario)
        router.push('/devTest/paceWizard/adjustTraining' as never)
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Text style={styles.hint}>
                Seed the dev account with an audit persona, then walk the dev copy of the adjust-nutrition wizard — hand-synced duplicates of the four production screens, safe to experiment on. This screen fills in what the wizard reads from settings (gender, birth date, activity) and cannot collect itself; Save at the end commits for real.
            </Text>

            <Text style={styles.sectionLabel}>Current dev profile</Text>
            <View style={styles.card}>
                <Text style={styles.cardLine}>
                    {settings.gender === 'male' ? 'M' : 'F'} · {settings.height} {heightUnit} · {settings.bodyWeight} {unit} · {calculateAge(settings.birthDate)} · {settings.activityLevel}
                </Text>
                <Text style={styles.cardSub}>
                    {settings.goalType} → {settings.goalWeight} {unit} @ {settings.goalPace} lb/wk · {settings.calorieGoal} kcal
                </Text>
            </View>

            <Text style={styles.sectionLabel}>Goal scenario</Text>
            <View style={styles.goalRow}>
                {GOALS.map((g) => {
                    const on = g.value === goal.value
                    return (
                        <TouchableOpacity key={g.value} style={[styles.goalChip, on && { borderColor: colors.nutrition, backgroundColor: colors.nutrition + '12' }]} onPress={() => setGoal(g)} activeOpacity={0.7}>
                            <Text style={[styles.goalChipText, on && { color: colors.text }]}>{g.label}{g.pace != null ? ` @ ${g.pace.toFixed(1)}` : ''}</Text>
                        </TouchableOpacity>
                    )
                })}
            </View>

            <Text style={styles.sectionLabel}>Step 3 calories</Text>
            <View style={styles.scenarioRow}>
                {CALORIE_SCENARIOS.map((s) => {
                    const on = s.key === scenario
                    return (
                        <TouchableOpacity key={s.key} style={[styles.scenarioChip, on && { borderColor: colors.nutrition, backgroundColor: colors.nutrition + '12' }]} onPress={() => setScenario(s.key)} activeOpacity={0.7}>
                            <Text style={[styles.goalChipText, on && { color: colors.text }]}>{s.label}</Text>
                        </TouchableOpacity>
                    )
                })}
            </View>
            <Text style={styles.hint}>{CALORIE_SCENARIOS.find((s) => s.key === scenario)?.expect}</Text>

            <Text style={styles.sectionLabel}>Personas (tap to select)</Text>
            {PERSONAS.map((p) => {
                const on = p.key === selectedKey
                return (
                    <TouchableOpacity key={p.key} style={[styles.personaRow, on && { borderColor: colors.nutrition, backgroundColor: colors.nutrition + '12' }]} onPress={() => setSelectedKey(p.key)} activeOpacity={0.7}>
                        <Text style={styles.personaLabel}>{p.label}</Text>
                        <Text style={styles.personaFacts}>{p.facts}</Text>
                    </TouchableOpacity>
                )
            })}

            {selected && (
                <View style={styles.runSheet}>
                    <Text style={styles.runSheetText}>{scriptFor(selected, goal)}</Text>
                </View>
            )}

            <TouchableOpacity style={[styles.applyBtn, !selected && styles.applyBtnDisabled]} disabled={!selected} onPress={applyAndLaunch} activeOpacity={0.85}>
                <Text style={styles.applyText}>Seed profile & open wizard</Text>
            </TouchableOpacity>
            <Text style={styles.warn}>
                Overwrites the dev account's profile — gender, birth date, activity, height, weight, unit system, and goal — and syncs like any settings write. Saving inside the wizard then commits that persona's targets.
            </Text>

            <TouchableOpacity style={styles.secondaryBtn} onPress={launchUnseeded} activeOpacity={0.7}>
                <Text style={styles.secondaryText}>Open wizard with my current profile</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>What to check</Text>
            {CHECKS.map((line) => (
                <Text key={line} style={styles.checkLine}>· {line}</Text>
            ))}
        </ScrollView>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 16,
            paddingBottom: 100,
        },
        hint: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.labelMuted,
            lineHeight: 17,
            marginTop: 4,
            marginBottom: 4,
        },
        sectionLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginTop: 20,
            marginBottom: 8,
            marginLeft: 2,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 14,
        },
        cardLine: {
            fontFamily: fonts.bold,
            fontSize: 14,
            color: colors.text,
        },
        cardSub: {
            fontFamily: fonts.medium,
            fontSize: 12.5,
            color: colors.textSecondary,
            marginTop: 3,
        },
        personaRow: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: 2,
            borderColor: colors.border,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 8,
        },
        personaLabel: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: colors.text,
        },
        personaFacts: {
            fontFamily: fonts.medium,
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 2,
        },
        goalRow: {
            flexDirection: 'row',
            gap: 8,
        },
        scenarioRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        scenarioChip: {
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: 2,
            borderColor: colors.border,
        },
        goalChip: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: 2,
            borderColor: colors.border,
        },
        goalChipText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.textSecondary,
        },
        runSheet: {
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            padding: 12,
            marginTop: 4,
        },
        runSheetText: {
            fontFamily: fonts.medium,
            fontSize: 12.5,
            color: colors.textSecondary,
            lineHeight: 19,
        },
        applyBtn: {
            marginTop: 8,
            height: 50,
            borderRadius: radius.card,
            backgroundColor: colors.text,
            justifyContent: 'center',
            alignItems: 'center',
        },
        applyBtnDisabled: {
            opacity: 0.4,
        },
        applyText: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.background,
        },
        warn: {
            fontFamily: fonts.regular,
            fontSize: 11.5,
            color: colors.textMuted,
            lineHeight: 16,
            marginTop: 8,
        },
        secondaryBtn: {
            marginTop: 14,
            paddingVertical: 12,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
            alignItems: 'center',
        },
        secondaryText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.text,
        },
        checkLine: {
            fontFamily: fonts.medium,
            fontSize: 12.5,
            color: colors.textSecondary,
            lineHeight: 19,
            marginBottom: 4,
        },
    })
}
