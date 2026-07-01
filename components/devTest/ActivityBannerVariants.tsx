import type { NutritionStreakState } from '@/context/NutritionContext/types'
import { fonts, radius, useColors, useColorScheme } from '@/context/ThemeContext'
import { Dumbbell, Flame } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'

/**
 * Dev-only ActivityBanner design explorations. Kept in components/devTest so Metro strips them
 * from production (never top-level-import these into shipped code). Once a direction wins, fold it
 * into components/GraphComponents/ActivityBanner.tsx and delete this file.
 */

export interface BannerData {
    mode: boolean
    trainedDays: boolean[]
    nutritionStreak: NutritionStreakState
}

const WEEK_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function bannerText({ mode, trainedDays, nutritionStreak }: BannerData): string {
    if (mode) {
        const n = trainedDays.filter(Boolean).length
        return n === 0 ? "No training yet this week. Let's go! 💪" : `You've trained ${n} day${n !== 1 ? 's' : ''} this week 🔥`
    }
    const { loggedToday, streakIncludingToday, streakThroughYesterday } = nutritionStreak
    if (loggedToday) return `You're on a ${streakIncludingToday} day streak! 🔥`
    if (streakThroughYesterday >= 1) return `Keep it up! You're on a ${streakThroughYesterday} day streak! 🔥`
    return 'Log a meal to start your streak 🍽️'
}

function bannerStat({ mode, trainedDays, nutritionStreak }: BannerData): { value: number; caption: string; hasValue: boolean } {
    if (mode) {
        const n = trainedDays.filter(Boolean).length
        return { value: n, caption: n === 0 ? "Let's get moving this week 💪" : 'days trained this week 🔥', hasValue: n > 0 }
    }
    const { loggedToday, streakIncludingToday, streakThroughYesterday } = nutritionStreak
    const streak = loggedToday ? streakIncludingToday : streakThroughYesterday
    return { value: streak, caption: streak === 0 ? 'Log a meal to start your streak 🍽️' : 'day streak — keep it up! 🔥', hasValue: streak > 0 }
}

// 1 — Minimal: icon + text only, no tile/fill/border
export function VariantMinimal(props: BannerData) {
    const colors = useColors()
    const accent = props.mode ? colors.workout : colors.nutrition
    const Icon = props.mode ? Dumbbell : Flame
    return (
        <View style={L.minimalRow}>
            <Icon size={18} color={accent} strokeWidth={2.6} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[L.text, { fontFamily: fonts.semibold, color: colors.text }]}>
                {bannerText(props)}
            </Text>
        </View>
    )
}

// 2 — Slim pill: small icon tile + text, subtle fill, no border
export function VariantSlim(props: BannerData) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const accent = props.mode ? colors.workout : colors.nutrition
    const Icon = props.mode ? Dumbbell : Flame
    return (
        <View style={[L.row, { backgroundColor: accent + (isDark ? '1A' : '29') }]}>
            <View style={[L.tile, { backgroundColor: accent + '33' }]}>
                <Icon size={18} color={accent} strokeWidth={2.4} />
            </View>
            <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85} style={[L.text, { fontFamily: fonts.bold, color: colors.text }]}>
                {bannerText(props)}
            </Text>
        </View>
    )
}

// 3 — Week dots: 7-day dot strip for workout, streak count for nutrition
export function VariantWeekDots(props: BannerData) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const accent = props.mode ? colors.workout : colors.nutrition
    const fill = accent + (isDark ? '1A' : '29')

    if (props.mode) {
        const n = props.trainedDays.filter(Boolean).length
        return (
            <View style={[L.row, { backgroundColor: fill }]}>
                <Dumbbell size={18} color={accent} strokeWidth={2.4} />
                <Text numberOfLines={1} style={[L.inlineCount, { color: colors.text }]}>
                    {n === 0 ? 'None yet' : `Trained ${n} day${n !== 1 ? 's' : ''}`}
                </Text>
                <View style={L.dotsWrap}>
                    {props.trainedDays.map((trained, i) => (
                        <View key={i} style={L.dotCol}>
                            <View style={[L.dot, { backgroundColor: trained ? accent : colors.ringTrack }]} />
                            <Text style={[L.dotLabel, { color: colors.labelMuted }]}>{WEEK_LETTERS[i]}</Text>
                        </View>
                    ))}
                </View>
            </View>
        )
    }

    const { loggedToday, streakIncludingToday, streakThroughYesterday } = props.nutritionStreak
    const streak = loggedToday ? streakIncludingToday : streakThroughYesterday
    return (
        <View style={[L.row, { backgroundColor: fill }]}>
            <Flame size={18} color={accent} strokeWidth={2.4} />
            {streak > 0 && <Text style={[L.inlineNumber, { color: accent }]}>{streak}</Text>}
            <Text numberOfLines={2} style={[L.text, { fontFamily: fonts.bold, color: colors.text }]}>
                {streak === 0 ? 'Log a meal to start your streak' : 'day streak — keep going!'}
            </Text>
        </View>
    )
}

// 4 — Big number: large count leads, caption beside it
export function VariantBigNumber(props: BannerData) {
    const colors = useColors()
    const isDark = useColorScheme() === 'dark'
    const accent = props.mode ? colors.workout : colors.nutrition
    const Icon = props.mode ? Dumbbell : Flame
    const stat = bannerStat(props)
    return (
        <View style={[L.bigRow, { backgroundColor: accent + (isDark ? '1A' : '29') }]}>
            <View style={[L.tile, { backgroundColor: accent + '33' }]}>
                <Icon size={18} color={accent} strokeWidth={2.4} />
            </View>
            {stat.hasValue && <Text style={[L.bigNumber, { color: accent }]}>{stat.value}</Text>}
            <Text numberOfLines={2} style={[L.bigCaption, { color: colors.text }]}>
                {stat.caption}
            </Text>
        </View>
    )
}

const L = StyleSheet.create({
    row: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: radius.card,
        paddingVertical: 9,
        paddingHorizontal: 11,
    },
    minimalRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingVertical: 6,
        paddingHorizontal: 2,
    },
    bigRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: radius.card,
        paddingVertical: 10,
        paddingHorizontal: 13,
    },
    tile: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        flex: 1,
        fontSize: 14,
        letterSpacing: -0.2,
    },
    inlineCount: {
        fontSize: 13.5,
        fontFamily: fonts.bold,
        letterSpacing: -0.2,
    },
    inlineNumber: {
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
    },
    bigNumber: {
        fontSize: 30,
        fontFamily: fonts.extrabold,
        letterSpacing: -1,
    },
    bigCaption: {
        flex: 1,
        fontSize: 13.5,
        fontFamily: fonts.bold,
        letterSpacing: -0.2,
    },
})
