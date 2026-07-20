// lib/utils/graphSeries.ts

import { calculateStartDate, daysBetween, formatDateMinimal, getDateKey } from "@/lib/utils/dateHelper";

/**
 * Options for the shared daily-series walk.
 * `maxDays` / `onboardingCompletedAt` / `earliestDate` / `hasData` are threaded straight into
 * calculateStartDate to derive the window. `fill` picks the gap strategy: 'zero' (default) emits
 * 0 for days without data; 'carryForward' repeats the last known value. `seed` is the
 * carry-forward's starting value, used for LEADING gaps before the first datapoint (default 0).
 * `round` rounds each emitted value with Math.round.
 */
export interface BuildDailySeriesOptions {
    maxDays: number;
    onboardingCompletedAt?: Date;
    earliestDate: Date | null;
    hasData: boolean;
    fill?: 'zero' | 'carryForward';
    seed?: number;
    round?: boolean;
}

// Builds the shared oldest→newest daily graph series once (extracted from the 4 graph builders):
// normalizes today, derives the window via calculateStartDate, walks each day gap-filling per
// `fill` (zero, or carry-forward from `seed`), optionally rounds, and labels via formatDateMinimal.
export function buildDailySeries(
    valuesByDate: Map<string, number>,
    opts: BuildDailySeriesOptions,
): Array<{ day: string; value: number }> {
    const { maxDays, onboardingCompletedAt, earliestDate, hasData, fill = 'zero', seed = 0, round = false } = opts;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Same window derivation the 4 builders shared: onboarding/earliest-anchored, capped at maxDays.
    const startDate = calculateStartDate(today, maxDays, onboardingCompletedAt, earliestDate, hasData);
    startDate.setHours(0, 0, 0, 0);

    const daysToShow = daysBetween(startDate, today) + 1;

    // Walk oldest→newest, gap-filling each calendar day.
    const result: Array<{ day: string; value: number }> = [];
    let lastKnown = seed; // carry-forward accumulator, seeded so leading gaps aren't a fake 0
    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = getDateKey(date);
        const found = valuesByDate.get(dateKey);

        let value: number;
        if (fill === 'carryForward') {
            // A real datapoint (including a legitimate 0) advances the carried value.
            if (found !== undefined) lastKnown = found;
            value = lastKnown;
        } else {
            value = found ?? 0;
        }

        result.push({
            day: formatDateMinimal(dateKey),
            value: round ? Math.round(value) : value,
        });
    }

    return result;
}
