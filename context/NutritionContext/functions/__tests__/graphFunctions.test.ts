import { getWeekStart } from '@/lib/utils/dateHelper'
import { NutritionEntry } from '../../types'
import { getMacroDataForGraph, getMacroForWeek, getMacrosForDate, getNutritionStreakState } from '../graphFunctions'

// Helper function to create mock nutrition entry
function createMockNutritionEntry(overrides: Partial<NutritionEntry> = {}): NutritionEntry {
    return {
        id: 'test-id',
        userId: 'user-1',
        name: 'Test Food',
        date: new Date('2024-01-15'),
        time: 1234567890,
        protein: 20,
        carbs: 30,
        fats: 10,
        calories: 300,
        isPhoto: false,
        items: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        ...overrides,
    }
}

// Helper to create a date N days ago
function daysAgo(days: number): Date {
    const date = new Date()
    date.setDate(date.getDate() - days)
    date.setHours(0, 0, 0, 0) // Normalize to start of day
    return date
}

// Helper to create a date N days from a base date
function daysFromDate(baseDate: Date, days: number): Date {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + days)
    date.setHours(0, 0, 0, 0)
    return date
}

describe('Graph Functions', () => {
    describe('getMacrosForDate', () => {
        describe('Normal Cases', () => {
            test('should sum macros for entries on the same date', () => {
                const date = new Date('2024-01-15')
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: new Date('2024-01-15'),
                        protein: 20,
                        carbs: 30,
                        fats: 10,
                        calories: 300,
                    }),
                    createMockNutritionEntry({
                        date: new Date('2024-01-15'),
                        protein: 15,
                        carbs: 25,
                        fats: 5,
                        calories: 200,
                    }),
                ]

                const result = getMacrosForDate(nutritionData, date)

                expect(result.totalProtein).toBe(35)
                expect(result.totalCarbs).toBe(55)
                expect(result.totalFats).toBe(15)
                expect(result.totalCalories).toBe(500)
            })

            test('should ignore entries on different dates', () => {
                const date = new Date('2024-01-15')
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: new Date('2024-01-15'),
                        protein: 20,
                        carbs: 30,
                        fats: 10,
                        calories: 300,
                    }),
                    createMockNutritionEntry({
                        date: new Date('2024-01-16'),
                        protein: 15,
                        carbs: 25,
                        fats: 5,
                        calories: 200,
                    }),
                ]

                const result = getMacrosForDate(nutritionData, date)

                expect(result.totalProtein).toBe(20)
                expect(result.totalCarbs).toBe(30)
                expect(result.totalFats).toBe(10)
                expect(result.totalCalories).toBe(300)
            })

            test('should return zeros when no entries exist for date', () => {
                const date = new Date('2024-01-15')
                const nutritionData: NutritionEntry[] = [createMockNutritionEntry({ date: new Date('2024-01-16') })]

                const result = getMacrosForDate(nutritionData, date)

                expect(result.totalProtein).toBe(0)
                expect(result.totalCarbs).toBe(0)
                expect(result.totalFats).toBe(0)
                expect(result.totalCalories).toBe(0)
            })
        })

        describe('Edge Cases', () => {
            test('should handle empty array', () => {
                const date = new Date('2024-01-15')
                const result = getMacrosForDate([], date)

                expect(result.totalProtein).toBe(0)
                expect(result.totalCarbs).toBe(0)
                expect(result.totalFats).toBe(0)
                expect(result.totalCalories).toBe(0)
            })

            test('should handle entries with zero values', () => {
                const date = new Date('2024-01-15')
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: new Date('2024-01-15'),
                        protein: 0,
                        carbs: 0,
                        fats: 0,
                        calories: 0,
                    }),
                ]

                const result = getMacrosForDate(nutritionData, date)

                expect(result.totalProtein).toBe(0)
                expect(result.totalCarbs).toBe(0)
                expect(result.totalFats).toBe(0)
                expect(result.totalCalories).toBe(0)
            })
        })
    })

    describe('getMacroDataForGraph', () => {
        // Mock today's date to make tests deterministic
        const mockToday = new Date('2024-02-15')
        const originalDate = Date

        beforeEach(() => {
            // Mock Date constructor to return our fixed date
            global.Date = jest.fn((...args: unknown[]) => {
                if (args.length === 0) {
                    return new originalDate(mockToday)
                }
                return new originalDate(...(args as ConstructorParameters<typeof Date>))
            }) as any
            // Preserve Date static methods
            Object.setPrototypeOf(global.Date, originalDate)
            global.Date.now = jest.fn(() => mockToday.getTime())
        })

        afterEach(() => {
            global.Date = originalDate
        })

        describe('With onboardingCompletedAt', () => {
            describe('Onboarding within last 30 days', () => {
                test('should start from onboarding date when less than 30 days ago', () => {
                    const onboardingDate = daysAgo(15) // 15 days ago
                    const nutritionData: NutritionEntry[] = [
                        createMockNutritionEntry({
                            date: daysAgo(10),
                            calories: 2000,
                            protein: 150,
                        }),
                        createMockNutritionEntry({
                            date: daysAgo(5),
                            calories: 1800,
                            protein: 130,
                        }),
                    ]

                    const result = getMacroDataForGraph('calories', nutritionData, onboardingDate)

                    // Should have 16 days (15 days ago + today)
                    expect(result.length).toBe(16)
                    // First entry should be from onboarding date
                    expect(result[0].value).toBe(0) // No data on onboarding date
                    // Should include today
                    expect(result[result.length - 1].value).toBe(0) // No data today
                })

                test('should fill gaps with zeros for days without entries', () => {
                    const onboardingDate = daysAgo(5)
                    const nutritionData: NutritionEntry[] = [
                        createMockNutritionEntry({
                            date: daysAgo(3),
                            calories: 2000,
                        }),
                    ]

                    const result = getMacroDataForGraph('calories', nutritionData, onboardingDate)

                    expect(result.length).toBe(6) // 5 days ago + today
                    // Day 5 ago (onboarding) - no data
                    expect(result[0].value).toBe(0)
                    // Day 4 ago - no data
                    expect(result[1].value).toBe(0)
                    // Day 3 ago - has data
                    expect(result[2].value).toBe(2000)
                    // Day 2 ago - no data
                    expect(result[3].value).toBe(0)
                    // Day 1 ago - no data
                    expect(result[4].value).toBe(0)
                    // Today - no data
                    expect(result[5].value).toBe(0)
                })
            })

            describe('Onboarding more than 30 days ago', () => {
                test('should show last 30 days when onboarding was more than 30 days ago', () => {
                    const onboardingDate = daysAgo(45) // 45 days ago
                    const nutritionData: NutritionEntry[] = [
                        createMockNutritionEntry({
                            date: daysAgo(35),
                            calories: 2000,
                        }),
                        createMockNutritionEntry({
                            date: daysAgo(10),
                            calories: 1800,
                        }),
                    ]

                    const result = getMacroDataForGraph('calories', nutritionData, onboardingDate)

                    // Should have 31 days (30 days ago through today, inclusive)
                    expect(result.length).toBe(31)
                    // Should not include the entry from 35 days ago
                    expect(result[0].value).toBe(0)
                })
            })

            describe('Onboarding exactly 30 days ago', () => {
                test('should show last 30 days when onboarding was exactly 30 days ago', () => {
                    const onboardingDate = daysAgo(30)
                    const nutritionData: NutritionEntry[] = [
                        createMockNutritionEntry({
                            date: daysAgo(25),
                            calories: 2000,
                        }),
                    ]

                    const result = getMacroDataForGraph('calories', nutritionData, onboardingDate)

                    // Should have 31 days (30 days ago through today, inclusive)
                    expect(result.length).toBe(31)
                })
            })
        })

        describe('Without onboardingCompletedAt', () => {
            describe('With nutrition data', () => {
                test('should start from earliest entry when less than 30 days ago', () => {
                    const earliestDate = daysAgo(10)
                    const nutritionData: NutritionEntry[] = [
                        createMockNutritionEntry({
                            date: earliestDate,
                            calories: 2000,
                        }),
                        createMockNutritionEntry({
                            date: daysAgo(5),
                            calories: 1800,
                        }),
                    ]

                    const result = getMacroDataForGraph('calories', nutritionData)

                    // Should have 11 days (10 days ago + today)
                    expect(result.length).toBe(11)
                    expect(result[0].value).toBe(2000) // Earliest entry
                })

                test('should show last 30 days when earliest entry is more than 30 days ago', () => {
                    const nutritionData: NutritionEntry[] = [
                        createMockNutritionEntry({
                            date: daysAgo(40),
                            calories: 2000,
                        }),
                        createMockNutritionEntry({
                            date: daysAgo(10),
                            calories: 1800,
                        }),
                    ]

                    const result = getMacroDataForGraph('calories', nutritionData)

                    // Should have 31 days (30 days ago through today, inclusive)
                    expect(result.length).toBe(31)
                    // Should not include the entry from 40 days ago
                    expect(result[0].value).toBe(0)
                })
            })

            describe('Without nutrition data', () => {
                test('should return single day (today) when no data exists', () => {
                    const result = getMacroDataForGraph('calories', [])

                    expect(result.length).toBe(1)
                    expect(result[0].value).toBe(0)
                })
            })
        })

        describe('Macro Types', () => {
            test('should return calories correctly', () => {
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: daysAgo(1),
                        calories: 2000,
                        protein: 150,
                        carbs: 200,
                        fats: 50,
                    }),
                ]

                const result = getMacroDataForGraph('calories', nutritionData)

                expect(result[result.length - 2].value).toBe(2000) // Yesterday
            })

            test('should return protein correctly', () => {
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: daysAgo(1),
                        calories: 2000,
                        protein: 150,
                        carbs: 200,
                        fats: 50,
                    }),
                ]

                const result = getMacroDataForGraph('protein', nutritionData)

                expect(result[result.length - 2].value).toBe(150) // Yesterday
            })

            test('should return carbs correctly', () => {
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: daysAgo(1),
                        calories: 2000,
                        protein: 150,
                        carbs: 200,
                        fats: 50,
                    }),
                ]

                const result = getMacroDataForGraph('carbs', nutritionData)

                expect(result[result.length - 2].value).toBe(200) // Yesterday
            })

            test('should return fats correctly', () => {
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: daysAgo(1),
                        calories: 2000,
                        protein: 150,
                        carbs: 200,
                        fats: 50,
                    }),
                ]

                const result = getMacroDataForGraph('fats', nutritionData)

                expect(result[result.length - 2].value).toBe(50) // Yesterday
            })
        })

        describe('Multiple entries per day', () => {
            test('should sum multiple entries on the same day', () => {
                const sameDate = daysAgo(1)
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: sameDate,
                        calories: 500,
                        protein: 30,
                    }),
                    createMockNutritionEntry({
                        date: sameDate,
                        calories: 800,
                        protein: 50,
                    }),
                    createMockNutritionEntry({
                        date: sameDate,
                        calories: 700,
                        protein: 40,
                    }),
                ]

                const caloriesResult = getMacroDataForGraph('calories', nutritionData)
                const proteinResult = getMacroDataForGraph('protein', nutritionData)

                expect(caloriesResult[caloriesResult.length - 2].value).toBe(2000) // Sum of all
                expect(proteinResult[proteinResult.length - 2].value).toBe(120) // Sum of all
            })
        })

        describe('Edge Cases', () => {
            test('should handle entries with future dates', () => {
                const futureDate = daysFromDate(mockToday, 5)
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: futureDate,
                        calories: 2000,
                    }),
                    createMockNutritionEntry({
                        date: daysAgo(1),
                        calories: 1800,
                    }),
                ]

                const result = getMacroDataForGraph('calories', nutritionData)

                // Should only include past dates, not future
                expect(result.length).toBeGreaterThan(0)
            })

            test('should handle very old entries', () => {
                const oldDate = daysAgo(100)
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: oldDate,
                        calories: 2000,
                    }),
                    createMockNutritionEntry({
                        date: daysAgo(1),
                        calories: 1800,
                    }),
                ]

                const result = getMacroDataForGraph('calories', nutritionData)

                // Should show last 30 days (31 days inclusive), not include 100 days ago
                expect(result.length).toBe(31)
                expect(result[0].value).toBe(0) // Old entry not included
            })

            test('should handle onboarding date in the future', () => {
                const futureOnboarding = daysFromDate(mockToday, 5)
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: daysAgo(1),
                        calories: 2000,
                    }),
                ]

                const result = getMacroDataForGraph('calories', nutritionData, futureOnboarding)

                // calculateStartDate clamps a future onboarding date to today, so the
                // graph shows just today (1 day) rather than reaching back before onboarding.
                // This is an edge case - in practice, onboarding should never be in the future
                expect(result.length).toBe(1)
                expect(result[0].value).toBe(0) // yesterday's entry falls outside the 1-day window
            })
        })

        describe('Date formatting', () => {
            test('should return data with day labels in correct format', () => {
                const nutritionData: NutritionEntry[] = [
                    createMockNutritionEntry({
                        date: daysAgo(1),
                        calories: 2000,
                    }),
                ]

                const result = getMacroDataForGraph('calories', nutritionData)

                // Check that all entries have day and value properties
                result.forEach((entry) => {
                    expect(entry).toHaveProperty('day')
                    expect(entry).toHaveProperty('value')
                    expect(typeof entry.day).toBe('string')
                    expect(typeof entry.value).toBe('number')
                    // Day should be in M/D format (e.g., "2/14")
                    expect(entry.day).toMatch(/^\d+\/\d+$/)
                })
            })
        })
    })

    describe('getNutritionStreakState', () => {
        const now = new Date('2026-06-01T12:00:00')

        test('returns zeros when no entries', () => {
            expect(getNutritionStreakState([], now)).toEqual({
                loggedToday: false,
                streakIncludingToday: 0,
                streakThroughYesterday: 0,
            })
        })

        test('active streak when logged today and prior days', () => {
            const data = [
                createMockNutritionEntry({ date: daysFromDate(now, 0) }),
                createMockNutritionEntry({ date: daysFromDate(now, -1) }),
                createMockNutritionEntry({ date: daysFromDate(now, -2) }),
            ]
            expect(getNutritionStreakState(data, now)).toEqual({
                loggedToday: true,
                streakIncludingToday: 3,
                streakThroughYesterday: 2,
            })
        })

        test('at-risk streak when logged yesterday but not today', () => {
            const data = [
                createMockNutritionEntry({ date: daysFromDate(now, -1) }),
                createMockNutritionEntry({ date: daysFromDate(now, -2) }),
            ]
            expect(getNutritionStreakState(data, now)).toEqual({
                loggedToday: false,
                streakIncludingToday: 0,
                streakThroughYesterday: 2,
            })
        })

        test('broken streak when yesterday was missed', () => {
            const data = [createMockNutritionEntry({ date: daysFromDate(now, -2) })]
            expect(getNutritionStreakState(data, now)).toEqual({
                loggedToday: false,
                streakIncludingToday: 0,
                streakThroughYesterday: 0,
            })
        })
    })

    describe('getMacroForWeek', () => {
        // Local-time constructors (month is 0-indexed): Thu Feb 15 2024; week is Sun 2/11 .. Sat 2/17
        const mockToday = new Date(2024, 1, 15)
        const tue = () => new Date(2024, 1, 13)
        const thu = () => new Date(2024, 1, 15)
        const prevWeek = () => new Date(2024, 1, 4)
        const originalDate = Date

        beforeEach(() => {
            global.Date = jest.fn((...args: unknown[]) => {
                if (args.length === 0) return new originalDate(mockToday)
                return new originalDate(...(args as ConstructorParameters<typeof Date>))
            }) as any
            Object.setPrototypeOf(global.Date, originalDate)
            global.Date.now = jest.fn(() => mockToday.getTime())
        })

        afterEach(() => {
            global.Date = originalDate
        })

        test('returns 7 days labeled Sun..Sat', () => {
            const result = getMacroForWeek('calories', [], getWeekStart(new Date()))
            expect(result).toHaveLength(7)
            expect(result.map((d) => d.day)).toEqual(['S', 'M', 'T', 'W', 'Th', 'F', 'S'])
        })

        test('sums the chosen macro per day and zero-fills the rest', () => {
            const data: NutritionEntry[] = [
                createMockNutritionEntry({ date: tue(), calories: 300, protein: 20 }),
                createMockNutritionEntry({ date: tue(), calories: 250, protein: 15 }),
                createMockNutritionEntry({ date: thu(), calories: 500, protein: 40 }),
            ]
            const cal = getMacroForWeek('calories', data, getWeekStart(new Date()))
            expect(cal[2].value).toBe(550) // Tuesday
            expect(cal[4].value).toBe(500) // Thursday
            expect(cal[0].value).toBe(0) // Sunday

            const protein = getMacroForWeek('protein', data, getWeekStart(new Date()))
            expect(protein[2].value).toBe(35) // Tuesday
        })

        test('excludes entries outside the week', () => {
            const data: NutritionEntry[] = [
                createMockNutritionEntry({ date: prevWeek(), calories: 999 }),
                createMockNutritionEntry({ date: tue(), calories: 300 }),
            ]
            const result = getMacroForWeek('calories', data, getWeekStart(new Date()))
            expect(result.reduce((s, d) => s + d.value, 0)).toBe(300)
        })

        test('flags days after today as future', () => {
            const result = getMacroForWeek('calories', [], getWeekStart(new Date()))
            expect(result[4].isFuture).toBe(false) // Thursday (today)
            expect(result[5].isFuture).toBe(true) // Friday
            expect(result[6].isFuture).toBe(true) // Saturday
        })
    })
})
