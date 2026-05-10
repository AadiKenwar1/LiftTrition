import { formatDateMinimal, getDateKey } from '@/lib/utils/dateHelper';
import { Log } from '../../types';
import { getSetsData, getVolumeData } from '../volumeFunctions';

// Helper function to create mock log
function createMockLog(overrides: Partial<Log> = {}): Log {
    return {
        id: 'test-log-id',
        userID: 'user-1',
        workoutID: 'workout-1',
        exerciseID: 'exercise-1',
        date: new Date('2024-01-15'),
        time: 0,
        weight: 100,
        reps: 10,
        rpe: 8,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        ...overrides
    };
}

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

describe('Volume Functions', () => {
    describe('getVolumeData', () => {
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
            test('should calculate volume correctly (weight × reps) for single log', () => {
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(1),
                        weight: 100,
                        reps: 10
                    })
                ];
                
                const result = getVolumeData(logs);
                
                expect(result.length).toBeGreaterThan(0);
                // Find the entry for yesterday
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(1000); // 100 × 10
            });

            test('should sum volume for multiple logs on the same day', () => {
                const sameDate = daysAgo(1);
                const logs: Log[] = [
                    createMockLog({
                        date: sameDate,
                        time: 1,
                        weight: 100,
                        reps: 10 // Volume: 1000
                    }),
                    createMockLog({
                        date: sameDate,
                        time: 2,
                        weight: 80,
                        reps: 12 // Volume: 960
                    }),
                    createMockLog({
                        date: sameDate,
                        time: 3,
                        weight: 120,
                        reps: 8 // Volume: 960
                    })
                ];
                
                const result = getVolumeData(logs);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(2920); // 1000 + 960 + 960
            });

            test('should sum volume across different exercises on the same day', () => {
                const sameDate = daysAgo(1);
                const logs: Log[] = [
                    createMockLog({
                        date: sameDate,
                        exerciseID: 'exercise-1',
                        weight: 100,
                        reps: 10 // Volume: 1000
                    }),
                    createMockLog({
                        date: sameDate,
                        exerciseID: 'exercise-2',
                        weight: 200,
                        reps: 5 // Volume: 1000
                    })
                ];
                
                const result = getVolumeData(logs);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(2000); // 1000 + 1000
            });

            test('should handle logs on different days correctly', () => {
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(2),
                        weight: 100,
                        reps: 10 // Volume: 1000
                    }),
                    createMockLog({
                        date: daysAgo(1),
                        weight: 80,
                        reps: 12 // Volume: 960
                    })
                ];
                
                const result = getVolumeData(logs);
                
                const day2AgoDate = daysAgo(2);
                const day1AgoDate = daysAgo(1);
                const day2AgoDayString = formatDayString(day2AgoDate);
                const day1AgoDayString = formatDayString(day1AgoDate);
                const day2AgoEntry = result.find(entry => entry.day === day2AgoDayString);
                const day1AgoEntry = result.find(entry => entry.day === day1AgoDayString);
                
                expect(day2AgoEntry?.value).toBe(1000);
                expect(day1AgoEntry?.value).toBe(960);
            });

            test('should round volume values', () => {
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(1),
                        weight: 100.5,
                        reps: 10.3 // Volume: 1035.15, should round to 1035
                    })
                ];
                
                const result = getVolumeData(logs);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(1035); // Rounded
            });
        });

        describe('With onboardingCompletedAt', () => {
            describe('Onboarding within last 30 days', () => {
                test('should start from onboarding date when less than 30 days ago', () => {
                    const onboardingDate = daysAgo(15); // 15 days ago
                    const logs: Log[] = [
                        createMockLog({
                            date: daysAgo(10),
                            weight: 100,
                            reps: 10
                        })
                    ];
                    
                    const result = getVolumeData(logs, onboardingDate);
                    
                    // Should have 16 days (15 days ago + today)
                    expect(result.length).toBe(16);
                    // First entry should be from onboarding date
                    expect(result[0].value).toBe(0); // No data on onboarding date
                });

                test('should fill gaps with zeros for days without logs', () => {
                    const onboardingDate = daysAgo(5);
                    const logs: Log[] = [
                        createMockLog({
                            date: daysAgo(3),
                            weight: 100,
                            reps: 10
                        })
                    ];
                    
                    const result = getVolumeData(logs, onboardingDate);
                    
                    expect(result.length).toBe(6); // 5 days ago + today
                    // Day 5 ago (onboarding) - no data
                    expect(result[0].value).toBe(0);
                    // Day 4 ago - no data
                    expect(result[1].value).toBe(0);
                    // Day 3 ago - has data
                    expect(result[2].value).toBe(1000);
                    // Day 2 ago - no data
                    expect(result[3].value).toBe(0);
                    // Day 1 ago - no data
                    expect(result[4].value).toBe(0);
                    // Today - no data
                    expect(result[5].value).toBe(0);
                });
            });

            describe('Onboarding more than 30 days ago', () => {
                test('should show last 30 days when onboarding was more than 30 days ago', () => {
                    const onboardingDate = daysAgo(45); // 45 days ago
                    const logs: Log[] = [
                        createMockLog({
                            date: daysAgo(35),
                            weight: 100,
                            reps: 10
                        }),
                        createMockLog({
                            date: daysAgo(10),
                            weight: 80,
                            reps: 12
                        })
                    ];
                    
                    const result = getVolumeData(logs, onboardingDate);
                    
                    // Should have 31 days (30 days ago through today, inclusive)
                    expect(result.length).toBe(31);
                    // Should not include the entry from 35 days ago
                    expect(result[0].value).toBe(0);
                });
            });
        });

        describe('Without onboardingCompletedAt', () => {
            describe('With log data', () => {
                test('should start from earliest entry when less than 30 days ago', () => {
                    const earliestDate = daysAgo(10);
                    const logs: Log[] = [
                        createMockLog({
                            date: earliestDate,
                            weight: 100,
                            reps: 10
                        }),
                        createMockLog({
                            date: daysAgo(5),
                            weight: 80,
                            reps: 12
                        })
                    ];
                    
                    const result = getVolumeData(logs);
                    
                    // Should have 11 days (10 days ago + today)
                    expect(result.length).toBe(11);
                    expect(result[0].value).toBe(1000); // Earliest entry
                });

                test('should show last 30 days when earliest entry is more than 30 days ago', () => {
                    const logs: Log[] = [
                        createMockLog({
                            date: daysAgo(40),
                            weight: 100,
                            reps: 10
                        }),
                        createMockLog({
                            date: daysAgo(10),
                            weight: 80,
                            reps: 12
                        })
                    ];
                    
                    const result = getVolumeData(logs);
                    
                    // Should have 31 days (30 days ago through today, inclusive)
                    expect(result.length).toBe(31);
                    // Should not include the entry from 40 days ago
                    expect(result[0].value).toBe(0);
                });
            });

            describe('Without log data', () => {
                test('should return single day (today) when no data exists', () => {
                    const result = getVolumeData([]);
                    
                    expect(result.length).toBe(1);
                    expect(result[0].value).toBe(0);
                });
            });
        });

        describe('Edge Cases', () => {
            test('should ignore logs with zero or negative weight', () => {
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(1),
                        weight: 0,
                        reps: 10
                    }),
                    createMockLog({
                        date: daysAgo(1),
                        weight: -10,
                        reps: 10
                    }),
                    createMockLog({
                        date: daysAgo(1),
                        weight: 100,
                        reps: 10 // Valid log
                    })
                ];
                
                const result = getVolumeData(logs);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(1000); // Only valid log counted
            });

            test('should ignore logs with zero or negative reps', () => {
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(1),
                        weight: 100,
                        reps: 0
                    }),
                    createMockLog({
                        date: daysAgo(1),
                        weight: 100,
                        reps: -5
                    }),
                    createMockLog({
                        date: daysAgo(1),
                        weight: 100,
                        reps: 10 // Valid log
                    })
                ];
                
                const result = getVolumeData(logs);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(1000); // Only valid log counted
            });

            test('should handle very old entries', () => {
                const oldDate = daysAgo(100);
                const logs: Log[] = [
                    createMockLog({
                        date: oldDate,
                        weight: 100,
                        reps: 10
                    }),
                    createMockLog({
                        date: daysAgo(1),
                        weight: 80,
                        reps: 12
                    })
                ];
                
                const result = getVolumeData(logs);
                
                // Should show last 30 days (31 days inclusive), not include 100 days ago
                expect(result.length).toBe(31);
                expect(result[0].value).toBe(0); // Old entry not included
            });

            test('should handle large volume values', () => {
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(1),
                        weight: 500,
                        reps: 20 // Volume: 10000
                    })
                ];
                
                const result = getVolumeData(logs);
                
                const yesterdayDate = daysAgo(1);
                const yesterdayDayString = formatDayString(yesterdayDate);
                const yesterdayEntry = result.find(entry => entry.day === yesterdayDayString);
                expect(yesterdayEntry?.value).toBe(10000);
            });
        });

        describe('Date formatting', () => {
            test('should return data with day labels in correct format', () => {
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(1),
                        weight: 100,
                        reps: 10
                    })
                ];
                
                const result = getVolumeData(logs);
                
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
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(3),
                        weight: 100,
                        reps: 10
                    }),
                    createMockLog({
                        date: daysAgo(1),
                        weight: 80,
                        reps: 12
                    })
                ];
                
                const result = getVolumeData(logs);
                
                // First entry should be older than last entry
                expect(result.length).toBeGreaterThan(2);
                // Verify chronological order by checking values
                const day3AgoIndex = result.findIndex(entry => entry.value === 1000);
                const day1AgoIndex = result.findIndex(entry => entry.value === 960);
                expect(day3AgoIndex).toBeLessThan(day1AgoIndex);
            });
        });

        describe('Graph Integration', () => {
            test('should return data in format expected by Graph component', () => {
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(1),
                        weight: 100,
                        reps: 10
                    })
                ];
                
                const result = getVolumeData(logs);
                
                // Graph expects array of { day: string, value: number }
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
                
                result.forEach(entry => {
                    expect(entry).toHaveProperty('day');
                    expect(entry).toHaveProperty('value');
                    expect(typeof entry.day).toBe('string');
                    expect(typeof entry.value).toBe('number');
                    expect(entry.value).toBeGreaterThanOrEqual(0); // Volume can't be negative
                });
            });

            test('should fill all days in range with data (no gaps)', () => {
                const onboardingDate = daysAgo(5);
                const logs: Log[] = [
                    createMockLog({
                        date: daysAgo(3),
                        weight: 100,
                        reps: 10
                    })
                ];
                
                const result = getVolumeData(logs, onboardingDate);
                
                // Should have exactly 6 entries (5 days ago through today)
                expect(result.length).toBe(6);
                // All days should be present, even if value is 0
                result.forEach(entry => {
                    expect(entry.value).toBeDefined();
                    expect(typeof entry.value).toBe('number');
                });
            });
        });
    });

    describe('getSetsData', () => {
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

        test('counts bodyweight sets (weight 0, reps > 0)', () => {
            const logs: Log[] = [
                createMockLog({
                    date: daysAgo(1),
                    weight: 0,
                    reps: 12,
                }),
            ];
            const result = getSetsData(logs);
            const yesterdayDate = daysAgo(1);
            const yesterdayDayString = formatDayString(yesterdayDate);
            const yesterdayEntry = result.find((entry) => entry.day === yesterdayDayString);
            expect(yesterdayEntry?.value).toBe(1);
        });

        test('still skips zero or negative reps', () => {
            const sameDate = daysAgo(1);
            const logs: Log[] = [
                createMockLog({ date: sameDate, weight: 100, reps: 0 }),
                createMockLog({ date: sameDate, weight: 100, reps: -1 }),
                createMockLog({ date: sameDate, weight: 100, reps: 8 }),
            ];
            const result = getSetsData(logs);
            const dayString = formatDayString(sameDate);
            const entry = result.find((e) => e.day === dayString);
            expect(entry?.value).toBe(1);
        });

        test('still skips negative weight', () => {
            const sameDate = daysAgo(1);
            const logs: Log[] = [
                createMockLog({ date: sameDate, weight: -10, reps: 10 }),
                createMockLog({ date: sameDate, weight: 50, reps: 5 }),
            ];
            const result = getSetsData(logs);
            const dayString = formatDayString(sameDate);
            const entry = result.find((e) => e.day === dayString);
            expect(entry?.value).toBe(1);
        });
    });
});
