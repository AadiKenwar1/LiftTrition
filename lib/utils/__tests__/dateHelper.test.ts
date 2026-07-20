import { calculateAge, daysBetween, getDateKey, parseDateKey } from '../dateHelper'

describe('parseDateKey', () => {
    it('should parse a date key into local calendar components at midnight', () => {
        const d = parseDateKey('2026-07-13')
        expect(d.getFullYear()).toBe(2026)
        expect(d.getMonth()).toBe(6)
        expect(d.getDate()).toBe(13)
        expect(d.getHours()).toBe(0)
    })

    it('should round-trip through getDateKey', () => {
        expect(getDateKey(parseDateKey('2026-07-13'))).toBe('2026-07-13')
    })

    it('should round-trip a known local Date through getDateKey', () => {
        const d = new Date(2026, 6, 13)
        const roundTripped = parseDateKey(getDateKey(d))
        expect(roundTripped.getFullYear()).toBe(d.getFullYear())
        expect(roundTripped.getMonth()).toBe(d.getMonth())
        expect(roundTripped.getDate()).toBe(d.getDate())
    })

    it('should handle single-digit month/day keys', () => {
        const d = parseDateKey('2026-01-05')
        expect(d.getMonth()).toBe(0)
        expect(d.getDate()).toBe(5)
        expect(getDateKey(d)).toBe('2026-01-05')
    })

    it('should not drift a day in negative-offset zones (regression)', () => {
        expect(parseDateKey('1990-06-22').getDate()).toBe(22)
    })
})

describe('getDateKey', () => {
    // Equivalence holds under Jest/Node ICU; supplemented by a required on-device (Hermes) check before merge, since the output is persisted/synced.
    it('matches toLocaleDateString("en-CA") for a spread of real dates', () => {
        const dates = [
            new Date(2024, 0, 1), // single-digit month & day
            new Date(2024, 8, 9), // single-digit month & day
            new Date(2024, 11, 31), // double-digit month & day
            new Date(2024, 1, 29), // leap day
            new Date(2026, 6, 20),
            new Date(1990, 5, 22),
        ]
        for (const d of dates) {
            expect(getDateKey(d)).toBe(d.toLocaleDateString('en-CA'))
        }
    })

    it('preserves lexicographic ordering across dates', () => {
        const earlier = getDateKey(new Date(2024, 1, 9))
        const later = getDateKey(new Date(2024, 1, 29))
        expect(earlier < later).toBe(true)

        const yearBoundaryEarlier = getDateKey(new Date(2023, 11, 31))
        const yearBoundaryLater = getDateKey(new Date(2024, 0, 1))
        expect(yearBoundaryEarlier < yearBoundaryLater).toBe(true)
    })

    it('returns the correct calendar day across a DST spring-forward boundary', () => {
        // 2024-03-10 is US spring-forward (2 AM -> 3 AM); local midnight must still read as Mar 10.
        expect(getDateKey(new Date(2024, 2, 10))).toBe('2024-03-10')
    })
})

describe('daysBetween', () => {
    test('spring-forward inside the window still counts calendar days', () => {
        // 2024-03-10 is US spring-forward: Mar 9 → Mar 11 spans a 23h day + a 24h day.
        expect(daysBetween(new Date(2024, 2, 9), new Date(2024, 2, 11))).toBe(2)
    })

    test('ignores time of day', () => {
        expect(daysBetween(new Date(2024, 0, 1, 23, 59), new Date(2024, 0, 2, 0, 1))).toBe(1)
        expect(daysBetween(new Date(2024, 5, 1, 1), new Date(2024, 5, 1, 23))).toBe(0)
    })

    test('is negative when b precedes a', () => {
        expect(daysBetween(new Date(2024, 0, 10), new Date(2024, 0, 7))).toBe(-3)
    })
})

describe('calculateAge', () => {
    const today = new Date(2026, 6, 15) // 2026-07-15
    test('birthday already passed this year', () => {
        expect(calculateAge(new Date(1998, 0, 1), today)).toBe(28)
    })
    test('birthday not yet reached this year', () => {
        expect(calculateAge(new Date(1998, 11, 31), today)).toBe(27)
    })
    test('birthday is today', () => {
        expect(calculateAge(new Date(1998, 6, 15), today)).toBe(28)
    })
})
