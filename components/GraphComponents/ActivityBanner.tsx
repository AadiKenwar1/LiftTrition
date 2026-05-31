import { StyleSheet, Text, View } from 'react-native'

interface ActivityBannerProps {
    mode: boolean
    workoutDaysThisWeek: number
    nutritionStreak: number
}

export default function ActivityBanner({ mode, workoutDaysThisWeek, nutritionStreak }: ActivityBannerProps) {
    const text =
        mode ?
            workoutDaysThisWeek === 0 ?
                "You haven't trained yet this week. Let's go! 💪"
            :   `You've trained ${workoutDaysThisWeek} day${workoutDaysThisWeek !== 1 ? 's' : ''} this week 🔥`
        : nutritionStreak === 0 ? 'Log a meal to start your streak 🍽️'
        : nutritionStreak === 1 ? 'You logged today! Keep it up 💪'
        : `You've logged ${nutritionStreak} days in a row! 🔥`

    return (
        <View style={styles.banner}>
            <Text style={styles.text}>{text}</Text>
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
