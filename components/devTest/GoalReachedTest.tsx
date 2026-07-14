import GoalReachedBanner from '@/components/NutritionComponents/GoalReachedBanner'
import GoalReachedPrompt, { type GoalReachedPromptVariant } from '@/components/NutritionComponents/GoalReachedPrompt'
import { fonts, radius, useColors, useColorScheme, useSetColorScheme, type Colors } from '@/context/ThemeContext'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Field, Segmented } from './DevControls'

/**
 * Issue 8 — UI preview for the goal-reached pieces: the persistent banner and the
 * crossing/auto-maintain prompt card. Pure presentation; the decision rules live in
 * GoalReachedSimTest.
 */
export default function GoalReachedTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const isDark = useColorScheme() === 'dark'
    const setColorScheme = useSetColorScheme()
    const [variant, setVariant] = useState<GoalReachedPromptVariant>('goalReached')
    const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs')
    const [promptVisible, setPromptVisible] = useState(false)
    const [lastAction, setLastAction] = useState('—')

    const goalWeight = unit === 'lbs' ? 170 : 77
    const act = (label: string) => {
        setPromptVisible(false)
        setLastAction(label)
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Field label="Theme">
                <Segmented value={isDark ? 'dark' : 'light'} onChange={(v) => setColorScheme(v as 'light' | 'dark')} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
            </Field>
            <Field label="Prompt variant">
                <Segmented
                    value={variant}
                    onChange={setVariant}
                    options={[
                        { label: 'Goal reached (crossing)', value: 'goalReached' },
                        { label: 'Auto-maintain (safety net)', value: 'autoMaintain' },
                    ]}
                />
            </Field>
            <Field label="Units">
                <Segmented value={unit} onChange={setUnit} options={[{ label: 'lbs (170)', value: 'lbs' }, { label: 'kg (77)', value: 'kg' }]} />
            </Field>

            <View style={styles.slot}>
                <Text style={styles.slotLabel}>Persistent banner (progress screen · nutrition mode, under ActivityBanner)</Text>
                <GoalReachedBanner onPress={() => setLastAction('Banner tapped → routes to adjustNutrition wizard')} />
            </View>

            <View style={styles.slot}>
                <Text style={styles.slotLabel}>Prompt card</Text>
                <TouchableOpacity style={styles.showBtn} onPress={() => setPromptVisible(true)} activeOpacity={0.7}>
                    <Text style={styles.showBtnText}>Show prompt</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.slot}>
                <Text style={styles.slotLabel}>Last action</Text>
                <Text style={styles.lastAction}>{lastAction}</Text>
            </View>

            <GoalReachedPrompt
                visible={promptVisible}
                variant={variant}
                goalWeight={goalWeight}
                unitLabel={unit}
                onSwitchToMaintenance={() => act('Switch to Maintenance → goalType=maintain immediately, with consent')}
                onSetNewGoal={() => act('Set a New Goal → routes to adjustNutrition wizard')}
                onKeepGoing={() => act('Keep Going → auto-switch disarmed; banner stays')}
                onDismiss={() => act(variant === 'goalReached' ? 'Dismissed → nothing changes; banner stays; safety net armed' : 'Got It → dismissed (already maintaining)')}
            />
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
            paddingBottom: 80,
        },
        slot: {
            marginTop: 20,
        },
        slotLabel: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.labelMuted,
            marginBottom: 8,
            marginLeft: 2,
        },
        showBtn: {
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            alignItems: 'center',
        },
        showBtnText: {
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.text,
        },
        lastAction: {
            fontFamily: fonts.medium,
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 19,
        },
    })
}
