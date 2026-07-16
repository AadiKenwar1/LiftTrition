import { formatDateMinimal, getDateKey, calculateStartDate, addDays, daysBetween, WEEKDAY_INITIALS, type WeekDayPoint } from "@/lib/utils/dateHelper";
import { Log } from "../types";

/**
 * Get volume data for graph (last 30 days or since onboarding completion)
 * Volume = weight × reps, summed per day across all exercises
 * Fills gaps with 0s for days without logs
 */
export function getVolumeData(logs: Log[], onboardingCompletedAt?: Date): Array<{ day: string; value: number }> {
    const maxDays = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group logs by date and calculate total volume (weight × reps) per day
    const volumeByDate = new Map<string, number>();
    let earliestDate: Date | null = null;
    let hasData = false;

    for (const log of logs) {
        if (log.weight <= 0 || log.reps <= 0) continue;
        
        hasData = true;
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        const dateKey = getDateKey(logDate);
        const volume = log.weight * log.reps;
        volumeByDate.set(dateKey, (volumeByDate.get(dateKey) || 0) + volume);

        if (!earliestDate || logDate < earliestDate) {
            earliestDate = logDate;
        }
    }

    // Determine start date
    const startDate = calculateStartDate(today, maxDays, onboardingCompletedAt, earliestDate, hasData);
    startDate.setHours(0, 0, 0, 0);

    // Calculate days to show
    const daysToShow = daysBetween(startDate, today) + 1;

    // Build result array (oldest to newest, filling gaps with 0)
    const result: Array<{ day: string; value: number }> = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = getDateKey(date);
        const volume = volumeByDate.get(dateKey) || 0;

        result.push({
            day: formatDateMinimal(dateKey),
            value: Math.round(volume),
        });
    }
    
    return result;
}

/**
 * Get set-count data for graph (last 30 days or since onboarding completion)
 * One set = one log with reps > 0 and non-negative weight (weight 0 = bodyweight), per calendar day
 * Fills gaps with 0s for days without logs
 */
export function getSetsData(logs: Log[], onboardingCompletedAt?: Date): Array<{ day: string; value: number }> {
    const maxDays = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const setsByDate = new Map<string, number>();
    let earliestDate: Date | null = null;
    let hasData = false;

    for (const log of logs) {
        if (log.reps <= 0 || log.weight < 0) continue

        hasData = true;
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        const dateKey = getDateKey(logDate);
        setsByDate.set(dateKey, (setsByDate.get(dateKey) || 0) + 1);

        if (!earliestDate || logDate < earliestDate) {
            earliestDate = logDate;
        }
    }

    const startDate = calculateStartDate(today, maxDays, onboardingCompletedAt, earliestDate, hasData);
    startDate.setHours(0, 0, 0, 0);

    const daysToShow = daysBetween(startDate, today) + 1;

    const result: Array<{ day: string; value: number }> = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = getDateKey(date);
        const count = setsByDate.get(dateKey) || 0;

        result.push({
            day: formatDateMinimal(dateKey),
            value: count,
        });
    }

    return result;
}

/**
 * Get set-count data for a single calendar week (7 days from `weekStart`).
 * One set = one log with reps > 0 and non-negative weight, per calendar day.
 * Days with no logs are 0; days after today are flagged isFuture.
 * Labels are weekday initials (S M T W Th F S).
 */
export function getSetsForWeek(logs: Log[], weekStart: Date): WeekDayPoint[] {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const todayKey = getDateKey(new Date());

    const setsByDate = new Map<string, number>();
    for (const log of logs) {
        if (log.reps <= 0 || log.weight < 0) continue;
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        const dateKey = getDateKey(logDate);
        setsByDate.set(dateKey, (setsByDate.get(dateKey) || 0) + 1);
    }

    const result: WeekDayPoint[] = [];
    for (let i = 0; i < 7; i++) {
        const date = addDays(start, i);
        const dateKey = getDateKey(date);
        result.push({
            day: WEEKDAY_INITIALS[date.getDay()],
            value: setsByDate.get(dateKey) || 0,
            dateKey,
            isFuture: dateKey > todayKey,
        });
    }

    return result;
}
