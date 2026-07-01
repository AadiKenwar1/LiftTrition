import type { NutritionStreakState } from '@/context/NutritionContext/types'
import { fonts, radius, useColorScheme, useColors, type Colors } from '@/context/ThemeContext'
import { Dumbbell, Flame } from 'lucide-react-native'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface ActivityBannerProps {
    mode: boolean
    /** Per-day training flags for the current Sunday-start week (index 0 = Sun … 6 = Sat). */
    trainedDays: boolean[]
    nutritionStreak: NutritionStreakState
}

const WEEK_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function ActivityBanner({ mode, trainedDays, nutritionStreak }: ActivityBannerProps) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const styles = useMemo(() => makeStyles(colors), [colors])
    const accent = mode ? colors.workout : colors.nutrition
    const fill = accent + (isDark ? '1A' : '29')

    if (mode) {
        const trainedCount = trainedDays.filter(Boolean).length
        return (
            <View style={[styles.banner, { backgroundColor: fill }]}>
                <Dumbbell size={18} color={accent} strokeWidth={2.4} />
                <Text numberOfLines={1} style={styles.countLabel}>
                    {trainedCount === 0 ? 'No training yet' : `Trained ${trainedCount} day${trainedCount !== 1 ? 's' : ''}`}
                </Text>
                <View style={styles.dotsWrap}>
                    {trainedDays.map((trained, i) => (
                        <View key={i} style={styles.dotCol}>
                            <View style={[styles.dot, { backgroundColor: trained ? accent : colors.ringTrack }]} />
                            <Text style={styles.dotLabel}>{WEEK_LETTERS[i]}</Text>
                        </View>
                    ))}
                </View>
            </View>
        )
    }

    const { loggedToday, streakIncludingToday, streakThroughYesterday } = nutritionStreak
    const streak = loggedToday ? streakIncludingToday : streakThroughYesterday
    return (
        <View style={[styles.banner, { backgroundColor: fill }]}>
            <Flame size={18} color={accent} strokeWidth={2.4} />
            <View style={styles.streakRow}>
                {streak > 0 && <Text style={[styles.streakNumber, { color: accent }]}>{streak}</Text>}
                <Text numberOfLines={2} style={styles.streakLabel}>
                    {streak === 0 ? 'Log a meal to start your streak' : 'day streak — keep going!'}
                </Text>
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
            gap: 10,
            borderRadius: radius.card,
            paddingVertical: 9,
            paddingHorizontal: 12,
            marginBottom: 12,
        },
        countLabel: {
            fontSize: 13.5,
            fontFamily: fonts.bold,
            color: colors.text,
            letterSpacing: -0.2,
        },
        streakRow: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 5,
        },
        streakLabel: {
            flex: 1,
            fontSize: 14,
            fontFamily: fonts.bold,
            color: colors.text,
            letterSpacing: -0.2,
        },
        streakNumber: {
            fontSize: 17,
            fontFamily: fonts.extrabold,
            letterSpacing: -0.5,
        },
        dotsWrap: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 7,
        },
        dotCol: {
            alignItems: 'center',
            gap: 3,
        },
        dot: {
            width: 9,
            height: 9,
            borderRadius: 5,
        },
        dotLabel: {
            fontSize: 9,
            fontFamily: fonts.semibold,
            color: colors.labelMuted,
        },
    })
}
