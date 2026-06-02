import type { NutritionStreakState } from '@/context/NutritionContext/types'
import { StyleSheet, Text, View } from 'react-native'

interface ActivityBannerProps {
    mode: boolean
    workoutDaysThisWeek: number
    nutritionStreak: NutritionStreakState
}

function getNutritionBannerText(streak: NutritionStreakState): string {
    const { loggedToday, streakIncludingToday, streakThroughYesterday } = streak

    if (loggedToday) {
        if (streakIncludingToday === 1) return 'You logged today! Keep it up 💪'
        return `You've logged ${streakIncludingToday} days in a row! 🔥`
    }
    if (streakThroughYesterday >= 1) {
        const days = streakThroughYesterday
        return `You're on a ${days}-day streak. Log today to keep it going 🔥`
    }
    return 'Log a meal to start your streak 🍽️'
}

export default function ActivityBanner({ mode, workoutDaysThisWeek, nutritionStreak }: ActivityBannerProps) {
    const text =
        mode ?
            workoutDaysThisWeek === 0 ?
                "No training yet this week. Let's go! 💪"
            :   `You've trained ${workoutDaysThisWeek} day${workoutDaysThisWeek !== 1 ? 's' : ''} this week 🔥`
        :   getNutritionBannerText(nutritionStreak)

    return (
        <View style={styles.banner}>
            <Text style={styles.text} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
                {text}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    banner: {
        width: '100%',
        backgroundColor: '#1e1e1e',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 18,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    text: {
        fontSize: 14,
        color: '#fff',
        fontFamily: 'Poppins_500Medium',
        letterSpacing: -0.2,
        textAlign: 'center',
    },
})
