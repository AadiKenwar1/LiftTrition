import { getDateKey, parseDateKey } from '../dateHelper'

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
