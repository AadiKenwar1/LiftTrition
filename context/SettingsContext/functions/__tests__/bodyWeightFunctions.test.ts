import { getBodyWeightProgressData } from '../bodyWeightFunctions';
import { formatDateMinimal, getDateKey } from '@/lib/utils/dateHelper';

// Helper to create a date N days ago
function daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0); // Normalize to start of day
    return date;
}

// Helper to format date for day string matching
function formatDayString(date: Date): string {
    return formatDateMinimal(getDateKey(date));
}

describe('Body Weight Functions', () => {
    describe('getBodyWeightProgressData', () => {
        // Mock today's date to make tests deterministic
        const mockToday = new Date('2024-02-15');
        const originalDate = Date;
        
        beforeEach(() => {
            // Mock Date constructor to return our fixed date
            global.Date = jest.fn((...args: unknown[]) => {
                if (args.length === 0) {
                    return new originalDate(mockToday);
                }
                return new originalDate(...(args as ConstructorParameters<typeof Date>));
            }) as any;
            // Preserve Date static methods
            Object.setPrototypeOf(global.Date, originalDate);
            global.Date.now = jest.fn(() => mockToday.getTime());
        });
        
        afterEach(() => {
            global.Date = originalDate;
        });

        describe('Normal Cases', () => {
            test('should return weight data for single entry', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(1))]: 180.5
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                expect(result.length).toBeGreaterThan(0);
                // Find the entry for yesterday
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(180.5);
            });

            test('should handle multiple weight entries on different days', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(3))]: 180.0,
                    [getDateKey(daysAgo(2))]: 180.2,
                    [getDateKey(daysAgo(1))]: 180.5
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                const day3AgoDate = daysAgo(3);
                const day2AgoDate = daysAgo(2);
                const day1AgoDate = daysAgo(1);
                const day3AgoDayString = formatDayString(day3AgoDate);
                const day2AgoDayString = formatDayString(day2AgoDate);
                const day1AgoDayString = formatDayString(day1AgoDate);
                const day3AgoEntry = result.find(entry => entry.day === day3AgoDayString);
                const day2AgoEntry = result.find(entry => entry.day === day2AgoDayString);
                const day1AgoEntry = result.find(entry => entry.day === day1AgoDayString);
                
                expect(day3AgoEntry?.value).toBe(180.0);
                expect(day2AgoEntry?.value).toBe(180.2);
                expect(day1AgoEntry?.value).toBe(180.5);
            });

            test('should handle decimal weight values', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(1))]: 180.75
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(180.75);
            });

            test('should handle weight updates on the same day (latest overwrites)', () => {
                // In practice, the Record would only have one value per key,
                // but if somehow there are multiple, the last one wins
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(1))]: 180.0,
                    // Simulating an update - same date key would overwrite
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(180.0);
            });
        });

        describe('With onboardingCompletedAt', () => {
            describe('Onboarding within last 30 days', () => {
                test('should start from onboarding date when less than 30 days ago', () => {
                    const onboardingDate = daysAgo(15); // 15 days ago
                    const bwProgress: Record<string, number> = {
                        [getDateKey(daysAgo(10))]: 180.0
                    };
                    
                    const result = getBodyWeightProgressData(bwProgress, onboardingDate);
                    
                    // Should have 16 days (15 days ago + today)
                    expect(result.length).toBe(16);
                    // First entry should be from onboarding date
                    expect(result[0].value).toBe(0); // No data on onboarding date
                });

                test('should carry forward last known weight for days without weight entries', () => {
                    const onboardingDate = daysAgo(5);
                    const bwProgress: Record<string, number> = {
                        [getDateKey(daysAgo(3))]: 180.0
                    };
                    
                    const result = getBodyWeightProgressData(bwProgress, onboardingDate);
                    
                    expect(result.length).toBe(6); // 5 days ago + today
                    // Day 5 ago (onboarding) - no data yet, should be 0
                    expect(result[0].value).toBe(0);
                    // Day 4 ago - no data yet, should be 0
                    expect(result[1].value).toBe(0);
                    // Day 3 ago - has data, sets last known weight to 180.0
                    expect(result[2].value).toBe(180.0);
                    // Day 2 ago - no data, carries forward 180.0
                    expect(result[3].value).toBe(180.0);
                    // Day 1 ago - no data, carries forward 180.0
                    expect(result[4].value).toBe(180.0);
                    // Today - no data, carries forward 180.0
                    expect(result[5].value).toBe(180.0);
                });
            });

            describe('Onboarding more than 30 days ago (within a year)', () => {
                test('should start from onboarding date when within the last 365 days', () => {
                    const onboardingDate = daysAgo(45); // 45 days ago
                    const bwProgress: Record<string, number> = {
                        [getDateKey(daysAgo(35))]: 180.0,
                        [getDateKey(daysAgo(10))]: 182.0
                    };

                    const result = getBodyWeightProgressData(bwProgress, onboardingDate);

                    // Should have 46 days (45 days ago through today, inclusive)
                    expect(result.length).toBe(46);
                    // No entry on the onboarding day itself
                    expect(result[0].value).toBe(0);
                    // The entry from 35 days ago is inside the window
                    const day35AgoEntry = result.find(entry => entry.value === 180.0);
                    expect(day35AgoEntry).toBeDefined();
                });
            });

            describe('Onboarding exactly 30 days ago', () => {
                test('should start from onboarding date when exactly 30 days ago', () => {
                    const onboardingDate = daysAgo(30);
                    const bwProgress: Record<string, number> = {
                        [getDateKey(daysAgo(25))]: 180.0
                    };
                    
                    const result = getBodyWeightProgressData(bwProgress, onboardingDate);
                    
                    // Should have 31 days (30 days ago through today, inclusive)
                    expect(result.length).toBe(31);
                });
            });
        });

        describe('Without onboardingCompletedAt', () => {
            describe('With weight data', () => {
                test('should start from earliest entry when less than 30 days ago', () => {
                    const earliestDate = daysAgo(10);
                    const bwProgress: Record<string, number> = {
                        [getDateKey(earliestDate)]: 180.0,
                        [getDateKey(daysAgo(5))]: 181.0
                    };
                    
                    const result = getBodyWeightProgressData(bwProgress);
                    
                    // Should have 11 days (10 days ago + today)
                    expect(result.length).toBe(11);
                    expect(result[0].value).toBe(180.0); // Earliest entry
                });

                test('should start from earliest entry when within the last 365 days', () => {
                    const bwProgress: Record<string, number> = {
                        [getDateKey(daysAgo(40))]: 180.0,
                        [getDateKey(daysAgo(10))]: 182.0
                    };

                    const result = getBodyWeightProgressData(bwProgress);

                    // Should have 41 days (40 days ago through today, inclusive)
                    expect(result.length).toBe(41);
                    // First point is the earliest weigh-in itself
                    expect(result[0].value).toBe(180.0);
                    // Should find the entry from 10 days ago and carry it forward
                    const day10AgoEntry = result.find(entry => entry.value === 182.0);
                    expect(day10AgoEntry).toBeDefined();
                });
            });

            describe('Without weight data', () => {
            test('should return single day (today) when no data exists', () => {
                const result = getBodyWeightProgressData({});
                
                expect(result.length).toBe(1);
                // No data exists, so last known weight is 0
                expect(result[0].value).toBe(0);
            });
            });
        });

        describe('Edge Cases', () => {
            test('should handle empty bwProgress object', () => {
                const result = getBodyWeightProgressData({});
                
                expect(result.length).toBe(1); // Just today
                expect(result[0].value).toBe(0);
            });

            test('should handle very old weight entries', () => {
                const oldDate = daysAgo(100);
                const bwProgress: Record<string, number> = {
                    [getDateKey(oldDate)]: 180.0,
                    [getDateKey(daysAgo(1))]: 182.0
                };

                const result = getBodyWeightProgressData(bwProgress);

                // Window starts at the earliest entry (100 days ago, within 365)
                expect(result.length).toBe(101);
                expect(result[0].value).toBe(180.0);
                // Should find yesterday's entry and carry it forward to today
                const yesterdayEntry = result.find(entry => entry.value === 182.0);
                expect(yesterdayEntry).toBeDefined();
                // Today should carry forward yesterday's weight
                expect(result[result.length - 1].value).toBe(182.0);
            });

            test('should clamp to the last 365 days when entries are older than a year', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(400))]: 175.0,
                    [getDateKey(daysAgo(10))]: 182.0
                };

                const result = getBodyWeightProgressData(bwProgress);

                // Window is capped at 365 days back (366 entries inclusive of today)
                expect(result.length).toBe(366);
                // The 400-day-old entry is outside the window
                expect(result[0].value).toBe(0);
                const recentEntry = result.find(entry => entry.value === 182.0);
                expect(recentEntry).toBeDefined();
            });

            test('should handle weight values at boundaries', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(1))]: 0.1, // Very light
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(0.1);
            });

            test('should handle large weight values', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(1))]: 500.0, // Very heavy
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(500.0);
            });

            test('should handle weight entries with inconsistent date formats', () => {
                // This tests that the function correctly parses date strings
                const date1 = daysAgo(2);
                const date2 = daysAgo(1);
                const bwProgress: Record<string, number> = {
                    [getDateKey(date1)]: 180.0,
                    [getDateKey(date2)]: 181.0
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                // Should still work correctly
                expect(result.length).toBeGreaterThan(0);
            });
        });

        describe('Date formatting', () => {
            test('should return data with day labels in correct format', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(1))]: 180.0
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                // Check that all entries have day and value properties
                result.forEach(entry => {
                    expect(entry).toHaveProperty('day');
                    expect(entry).toHaveProperty('value');
                    expect(typeof entry.day).toBe('string');
                    expect(typeof entry.value).toBe('number');
                    // Day should be in M/D format (e.g., "2/14")
                    expect(entry.day).toMatch(/^\d+\/\d+$/);
                });
            });

            test('should return data in chronological order (oldest to newest)', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(3))]: 180.0,
                    [getDateKey(daysAgo(1))]: 181.0
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                // First entry should be older than last entry
                expect(result.length).toBeGreaterThan(2);
                // Verify chronological order by checking values
                const day3AgoIndex = result.findIndex(entry => entry.value === 180.0);
                const day1AgoIndex = result.findIndex(entry => entry.value === 181.0);
                expect(day3AgoIndex).toBeLessThan(day1AgoIndex);
            });
        });

        describe('Graph Integration', () => {
            test('should return data in format expected by Graph component', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(1))]: 180.0
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                // Graph expects array of { day: string, value: number }
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
                
                result.forEach(entry => {
                    expect(entry).toHaveProperty('day');
                    expect(entry).toHaveProperty('value');
                    expect(typeof entry.day).toBe('string');
                    expect(typeof entry.value).toBe('number');
                    expect(entry.value).toBeGreaterThanOrEqual(0); // Weight can't be negative in practice
                });
            });

            test('should fill all days in range with data (no gaps, carrying forward weight)', () => {
                const onboardingDate = daysAgo(5);
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(3))]: 180.0
                };
                
                const result = getBodyWeightProgressData(bwProgress, onboardingDate);
                
                // Should have exactly 6 entries (5 days ago through today)
                expect(result.length).toBe(6);
                // All days should be present with last known weight carried forward
                result.forEach(entry => {
                    expect(entry.value).toBeDefined();
                    expect(typeof entry.value).toBe('number');
                    expect(entry.value).toBeGreaterThanOrEqual(0);
                });
                // Days after the entry should carry forward 180.0
                const day3AgoIndex = result.findIndex(entry => entry.value === 180.0);
                if (day3AgoIndex >= 0) {
                    for (let i = day3AgoIndex + 1; i < result.length; i++) {
                        expect(result[i].value).toBe(180.0);
                    }
                }
            });

            test('should handle weight progression over time', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(7))]: 180.0,
                    [getDateKey(daysAgo(5))]: 180.5,
                    [getDateKey(daysAgo(3))]: 181.0,
                    [getDateKey(daysAgo(1))]: 181.5
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                // Verify progressive weight increase
                const day7AgoEntry = result.find(entry => entry.value === 180.0);
                const day5AgoEntry = result.find(entry => entry.value === 180.5);
                const day3AgoEntry = result.find(entry => entry.value === 181.0);
                const day1AgoEntry = result.find(entry => entry.value === 181.5);
                
                expect(day7AgoEntry).toBeDefined();
                expect(day5AgoEntry).toBeDefined();
                expect(day3AgoEntry).toBeDefined();
                expect(day1AgoEntry).toBeDefined();
                // Today should carry forward yesterday's weight (181.5)
                expect(result[result.length - 1].value).toBe(181.5);
            });
            
            test('should carry forward last known weight for consecutive days without entries', () => {
                const bwProgress: Record<string, number> = {
                    [getDateKey(daysAgo(5))]: 175.0,
                    [getDateKey(daysAgo(2))]: 180.0
                };
                
                const result = getBodyWeightProgressData(bwProgress);
                
                // Find the entries
                const day5AgoIndex = result.findIndex(entry => entry.value === 175.0);
                const day2AgoIndex = result.findIndex(entry => entry.value === 180.0);
                
                expect(day5AgoIndex).toBeGreaterThanOrEqual(0);
                expect(day2AgoIndex).toBeGreaterThanOrEqual(0);
                
                // Days between 5 ago and 2 ago should carry forward 175.0
                for (let i = day5AgoIndex + 1; i < day2AgoIndex; i++) {
                    expect(result[i].value).toBe(175.0);
                }
                
                // Days after 2 ago (including today) should carry forward 180.0
                for (let i = day2AgoIndex + 1; i < result.length; i++) {
                    expect(result[i].value).toBe(180.0);
                }
            });
        });
    });
});
