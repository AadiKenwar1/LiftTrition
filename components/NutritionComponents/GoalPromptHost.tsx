import GoalReachedPrompt from '@/components/NutritionComponents/GoalReachedPrompt'
import { useSettings } from '@/context/SettingsContext'
import { weightUnitLabel } from '@/lib/utils/unitConversions'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { InteractionManager } from 'react-native'

/**
 * App-level host for the goal prompt (issue 8). Mounted once in the root layout so the
 * card appears over whichever screen is active AFTER the weigh-in sheet has fully closed:
 * InteractionManager defers the open past the navigation dismiss animation, giving
 * "sheet closes, then prompt" without a tuned delay. The prompt deliberately persists
 * until answered (no AppState dismiss) — an undecided ask should wait for the user, and
 * the progress-screen banner is the durable fallback if the process dies.
 */
export default function GoalPromptHost() {
    const { settings, pendingGoalPrompt, dismissGoalPrompt, switchToMaintenance, acknowledgeGoalOvershoot } = useSettings()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!pendingGoalPrompt) {
            setVisible(false)
            return
        }
        const task = InteractionManager.runAfterInteractions(() => setVisible(true))
        return () => task.cancel()
    }, [pendingGoalPrompt])

    if (!pendingGoalPrompt || !visible || !settings.onboardingComplete) return null

    return (
        <GoalReachedPrompt
            visible={visible}
            goalWeight={settings.goalWeight}
            unitLabel={weightUnitLabel(settings.unitSystem)}
            onSwitchToMaintenance={() => {
                switchToMaintenance()
                dismissGoalPrompt()
            }}
            onSetNewGoal={() => {
                dismissGoalPrompt()
                router.push('/settingsScreens/adjustNutrition/adjustNutrition1')
            }}
            onKeepGoing={() => {
                acknowledgeGoalOvershoot()
                dismissGoalPrompt()
            }}
            onDismiss={dismissGoalPrompt}
        />
    )
}
