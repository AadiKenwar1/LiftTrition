import type { NutritionStreakState } from '@/context/NutritionContext/types'
import { addDays, formatDateMinimal, getDateKey, WEEKDAY_INITIALS } from '@/lib/utils/dateHelper'

/**
 * Idealized datasets for the App Store mockup scenes (components/devTest/mockups/*).
 * Dates are generated relative to today so screenshots always look current.
 * Shapes match the real graph-function outputs: line charts use M/D day labels,
 * week bars use Sunday-indexed WEEKDAY_INITIALS.
 */

const dayLabel = (daysAgo: number) => formatDateMinimal(getDateKey(addDays(new Date(), -daysAgo)))

const STRENGTH_SESSIONS: [number, number][] = [
    [34, 185],
    [32, 190],
    [29, 188],
    [27, 195],
    [24, 199],
    [22, 197],
    [19, 204],
    [16, 208],
    [14, 207],
    [11, 213],
    [9, 218],
    [6, 223],
    [3, 222],
    [0, 228],
]

export const STRENGTH_TREND: { day: string; value: number }[] = STRENGTH_SESSIONS.map(([daysAgo, value]) => ({ day: dayLabel(daysAgo), value }))

export const BW_START = 172.4
export const BW_END = 165.8
export const BW_GOAL = 160

export const BODYWEIGHT_TREND: { day: string; value: number }[] = Array.from({ length: 90 }, (_, i) => {
    const t = i / 89
    const trend = BW_START - (BW_START - BW_END) * t
    const wiggle = Math.sin(i / 4.1) * 0.35 + Math.sin(i / 9.7) * 0.25
    return { day: dayLabel(89 - i), value: i === 89 ? BW_END : Math.round((trend + wiggle) * 10) / 10 }
})

export const SETS_WEEK: { day: string; value: number }[] = [0, 16, 18, 0, 20, 15, 0].map((value, i) => ({ day: WEEKDAY_INITIALS[i], value }))

export const CALORIE_GOAL = 2200

export const CALORIES_WEEK: { day: string; value: number }[] = [1980, 2210, 2150, 2320, 2050, 2190, 0].map((value, i) => ({ day: WEEKDAY_INITIALS[i], value }))

export const BAR_HIGHLIGHT_INDEX = 5

export const TRAINED_DAYS: boolean[] = SETS_WEEK.map((d) => d.value > 0)

export const NUTRITION_STREAK: NutritionStreakState = {
    loggedToday: true,
    streakIncludingToday: 12,
    streakThroughYesterday: 11,
}
