import type { NutritionStreakState } from '@/context/NutritionContext/types'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { Dumbbell, Flame } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface ActivityBannerProps {
    mode: boolean
    /** Per-day training flags for the current Sunday-start week (index 0 = Sun … 6 = Sat). */
    trainedDays: boolean[]
    nutritionStreak: NutritionStreakState
}

function getNutritionBannerText(streak: NutritionStreakState): string {
    const { loggedToday, streakIncludingToday, streakThroughYesterday } = streak

    if (loggedToday) {
        if (streakIncludingToday === 1) return 'Your on a 1 day streak! 🔥'
        return `Your on a ${streakIncludingToday} day streak! 🔥`
    }
    if (streakThroughYesterday >= 1) {
        const days = streakThroughYesterday
        return `Keep it up! Your on a ${days} day streak! 🔥`
    }
    return 'Log a meal to start your streak 🍽️'
}

export default function ActivityBanner({ mode, trainedDays, nutritionStreak }: ActivityBannerProps) {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = mode ? colors.workout : colors.nutrition

    const trainedCount = trainedDays.filter(Boolean).length

    const text =
        mode ?
            trainedCount === 0 ?
                "No training yet this week. Let's go! 💪"
            :   `You've trained ${trainedCount} day${trainedCount !== 1 ? 's' : ''} this week 🔥`
        :   getNutritionBannerText(nutritionStreak)

    return (
        <View style={[styles.banner, { backgroundColor: accent + '1A', borderColor: accent + '80' }]}>
            <View style={[styles.iconTile, { backgroundColor: accent + '33' }]}>
                {mode ?
                    <Dumbbell size={22} color={accent} strokeWidth={2.4} />
                :   <Flame size={22} color={accent} strokeWidth={2.4} />}
            </View>
            <View style={styles.textCol}>
                <Text style={styles.text} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
                    {text}
                </Text>
                {mode && (
                    <View style={styles.dotRow}>
                        {Array.from({ length: 7 }).map((_, i) => (
                            <View key={i} style={[styles.dot, { backgroundColor: trainedDays[i] ? colors.workout : colors.ringTrack }]} />
                        ))}
                    </View>
                )}
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        banner: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 13,
            borderWidth: 0,
            borderRadius: radius.cardLg,
            padding: 14,
            marginBottom: 12,
        },
        iconTile: {
            width: 40,
            height: 40,
            borderRadius: radius.cardLg,
            justifyContent: 'center',
            alignItems: 'center',
        },
        textCol: {
            flex: 1,
        },
        text: {
            fontSize: 14,
            color: colors.text,
            fontFamily: fonts.bold,
            letterSpacing: -0.2,
        },
        dotRow: {
            flexDirection: 'row',
            gap: 5,
            marginTop: 7,
        },
        dot: {
            width: 14,
            height: 6,
            borderRadius: 3,
        },
    })
}
