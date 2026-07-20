import { formatDateMinimal, getDateKey } from '@/lib/utils/dateHelper';
import { buildDailySeries } from '@/lib/utils/graphSeries';

// Helper to create a date N days ago (normalized to start of day)
function daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
}

// Helper to format a date the same way buildDailySeries labels its points
function formatDayString(date: Date): string {
    return formatDateMinimal(getDateKey(date));
}

describe('buildDailySeries', () => {
    // Mock today's date to make the window deterministic
    const mockToday = new Date('2024-02-15');
    const originalDate = Date;

    beforeEach(() => {
        global.Date = jest.fn((...args: unknown[]) => {
            if (args.length === 0) {
                return new originalDate(mockToday);
            }
            return new originalDate(...(args as ConstructorParameters<typeof Date>));
        }) as any;
        Object.setPrototypeOf(global.Date, originalDate);
        global.Date.now = jest.fn(() => mockToday.getTime());
    });

    afterEach(() => {
        global.Date = originalDate;
    });

    describe('empty input', () => {
        test('returns a single today point (value 0) when there is no data', () => {
            const result = buildDailySeries(new Map(), { maxDays: 30, earliestDate: null, hasData: false });

            expect(result.length).toBe(1);
            expect(result[0].value).toBe(0);
            expect(result[0].day).toBe(formatDayString(daysAgo(0)));
        });

        test('carryForward with no data still returns a single today point using the seed', () => {
            const result = buildDailySeries(new Map(), {
                maxDays: 365,
                earliestDate: null,
                hasData: false,
                fill: 'carryForward',
                seed: 0,
            });

            expect(result.length).toBe(1);
            expect(result[0].value).toBe(0);
        });
    });

    describe("fill: 'zero'", () => {
        test('zero-fills days without data (default fill)', () => {
            const map = new Map<string, number>([[getDateKey(daysAgo(3)), 2000]]);

            const result = buildDailySeries(map, {
                maxDays: 30,
                onboardingCompletedAt: daysAgo(5),
                earliestDate: daysAgo(3),
                hasData: true,
            });

            expect(result.length).toBe(6); // 5 days ago through today
            expect(result[0].value).toBe(0); // day 5 ago - no data
            expect(result[1].value).toBe(0); // day 4 ago - no data
            expect(result[2].value).toBe(2000); // day 3 ago - data
            expect(result[3].value).toBe(0); // day 2 ago - gap stays 0, never carried
            expect(result[5].value).toBe(0); // today - no data
        });
    });

    describe("fill: 'carryForward'", () => {
        test('seeds leading gaps with a non-zero seed, then carries the last known value forward', () => {
            const map = new Map<string, number>([[getDateKey(daysAgo(3)), 180]]);

            const result = buildDailySeries(map, {
                maxDays: 365,
                onboardingCompletedAt: daysAgo(5),
                earliestDate: daysAgo(3),
                hasData: true,
                fill: 'carryForward',
                seed: 175,
            });

            expect(result.length).toBe(6);
            expect(result[0].value).toBe(175); // leading gap uses the seed, not 0
            expect(result[1].value).toBe(175); // still leading, still seed
            expect(result[2].value).toBe(180); // real datapoint advances the carry
            expect(result[3].value).toBe(180); // interior gap carries 180 forward
            expect(result[5].value).toBe(180); // today carries 180 forward
        });

        test('defaults the seed to 0 when none is provided', () => {
            const map = new Map<string, number>([[getDateKey(daysAgo(3)), 180]]);

            const result = buildDailySeries(map, {
                maxDays: 365,
                onboardingCompletedAt: daysAgo(5),
                earliestDate: daysAgo(3),
                hasData: true,
                fill: 'carryForward',
            });

            expect(result[0].value).toBe(0); // no seed => leading gap is 0
            expect(result[2].value).toBe(180);
        });

        test('a legitimate 0 datapoint advances the carry (uses !== undefined, not truthiness)', () => {
            const map = new Map<string, number>([
                [getDateKey(daysAgo(3)), 180],
                [getDateKey(daysAgo(1)), 0],
            ]);

            const result = buildDailySeries(map, {
                maxDays: 365,
                earliestDate: daysAgo(3),
                hasData: true,
                fill: 'carryForward',
                seed: 180,
            });

            const yesterday = result.find((e) => e.day === formatDayString(daysAgo(1)));
            const today = result.find((e) => e.day === formatDayString(daysAgo(0)));
            expect(yesterday?.value).toBe(0); // the real 0 is used
            expect(today?.value).toBe(0); // and carried forward, not reverted to 180
        });
    });

    describe('round', () => {
        test('round:true rounds each value; round:false preserves fractions', () => {
            const map = new Map<string, number>([[getDateKey(daysAgo(1)), 1035.15]]);

            const rounded = buildDailySeries(map, {
                maxDays: 30,
                earliestDate: daysAgo(1),
                hasData: true,
                round: true,
            });
            const rawSeries = buildDailySeries(map, {
                maxDays: 30,
                earliestDate: daysAgo(1),
                hasData: true,
            });

            const roundedYesterday = rounded.find((e) => e.day === formatDayString(daysAgo(1)));
            const rawYesterday = rawSeries.find((e) => e.day === formatDayString(daysAgo(1)));
            expect(roundedYesterday?.value).toBe(1035);
            expect(rawYesterday?.value).toBe(1035.15);
        });
    });

    describe('window / maxDays clamp (delegated to calculateStartDate)', () => {
        test('anchors the window to the onboarding date when provided', () => {
            const map = new Map<string, number>([[getDateKey(daysAgo(10)), 100]]);

            const result = buildDailySeries(map, {
                maxDays: 30,
                onboardingCompletedAt: daysAgo(20),
                earliestDate: daysAgo(10),
                hasData: true,
            });

            expect(result.length).toBe(21); // 20 days ago through today, inclusive
        });

        test('anchors the window to the earliest data date when no onboarding date', () => {
            const map = new Map<string, number>([[getDateKey(daysAgo(10)), 100]]);

            const result = buildDailySeries(map, {
                maxDays: 30,
                earliestDate: daysAgo(10),
                hasData: true,
            });

            expect(result.length).toBe(11); // 10 days ago through today, inclusive
        });

        test('clamps to maxDays (30) when the earliest data is older', () => {
            const map = new Map<string, number>([
                [getDateKey(daysAgo(40)), 5],
                [getDateKey(daysAgo(10)), 7],
            ]);

            const result = buildDailySeries(map, {
                maxDays: 30,
                earliestDate: daysAgo(40),
                hasData: true,
            });

            expect(result.length).toBe(31); // 30 days back + today
            expect(result[0].value).toBe(0); // the 40-day-old point is outside the 30-day window
        });

        test('clamps to maxDays (365) when the earliest data is older than a year', () => {
            const map = new Map<string, number>([
                [getDateKey(daysAgo(400)), 175],
                [getDateKey(daysAgo(10)), 182],
            ]);

            const result = buildDailySeries(map, {
                maxDays: 365,
                earliestDate: daysAgo(400),
                hasData: true,
                fill: 'carryForward',
                seed: 175,
            });

            expect(result.length).toBe(366); // 365 days back + today
            expect(result[0].value).toBe(175); // seeded even though the 400-day point is outside the window
            const recent = result.find((e) => e.value === 182);
            expect(recent).toBeDefined();
        });
    });
});
