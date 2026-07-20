import { parseNumericInput, sanitizeExactMacro, sanitizeInt, sanitizeMacro, sanitizeQuantity } from '../number'

describe('parseNumericInput', () => {
    it('should parse valid decimal strings', () => {
        expect(parseNumericInput('80.5')).toBe(80.5)
        expect(parseNumericInput('12.5')).toBe(12.5)
        expect(parseNumericInput('0')).toBe(0)
    })

    it('should convert comma to dot for decimal numbers', () => {
        expect(parseNumericInput('80,5')).toBe(80.5)
    })

    it('should handle whitespace by trimming', () => {
        expect(parseNumericInput(' 12.5 ')).toBe(12.5)
        expect(parseNumericInput(' 80,5 ')).toBe(80.5)
    })

    it('should return null for empty strings', () => {
        expect(parseNumericInput('')).toBeNull()
        expect(parseNumericInput('   ')).toBeNull()
    })

    it('should return null for invalid strings', () => {
        expect(parseNumericInput('.')).toBeNull()
        expect(parseNumericInput('12..5')).toBeNull()
        expect(parseNumericInput('abc')).toBeNull()
    })

    it('should return null for multiple commas', () => {
        expect(parseNumericInput('1,2,3')).toBeNull()
    })

    it('should handle negative numbers', () => {
        expect(parseNumericInput('-12.5')).toBe(-12.5)
        expect(parseNumericInput('-80,5')).toBe(-80.5)
    })

    it('should return null for Infinity', () => {
        expect(parseNumericInput('Infinity')).toBeNull()
        expect(parseNumericInput('-Infinity')).toBeNull()
    })
})

describe('sanitizeInt', () => {
    it('should round finite numbers to integers', () => {
        expect(sanitizeInt(12.4)).toBe(12)
        expect(sanitizeInt(12.5)).toBe(13)
        expect(sanitizeInt(12.6)).toBe(13)
    })

    it('should handle negative numbers', () => {
        expect(sanitizeInt(-12.4)).toBe(-12)
        expect(sanitizeInt(-12.5)).toBe(-12)
        expect(sanitizeInt(-12.6)).toBe(-13)
    })

    it('should return 0 for NaN', () => {
        expect(sanitizeInt(NaN)).toBe(0)
    })

    it('should return 0 for Infinity', () => {
        expect(sanitizeInt(Infinity)).toBe(0)
        expect(sanitizeInt(-Infinity)).toBe(0)
    })

    it('should handle zero', () => {
        expect(sanitizeInt(0)).toBe(0)
    })
})

describe('sanitizeMacro', () => {
    it('should round to 1 decimal place', () => {
        expect(sanitizeMacro(2.55)).toBe(2.6)
        expect(sanitizeMacro(391.50000000000006)).toBe(391.5)
    })

    it('should handle negative numbers', () => {
        expect(sanitizeMacro(-1.25)).toBe(Math.round(-1.25 * 10) / 10)
        expect(sanitizeMacro(-12.55)).toBe(Math.round(-12.55 * 10) / 10)
    })

    it('should return 0 for NaN', () => {
        expect(sanitizeMacro(NaN)).toBe(0)
    })

    it('should return 0 for Infinity', () => {
        expect(sanitizeMacro(Infinity)).toBe(0)
        expect(sanitizeMacro(-Infinity)).toBe(0)
    })

    it('should handle zero', () => {
        expect(sanitizeMacro(0)).toBe(0)
    })

    it('should handle numbers already rounded to 1 decimal', () => {
        expect(sanitizeMacro(12.5)).toBe(12.5)
        expect(sanitizeMacro(10.1)).toBe(10.1)
    })
})

describe('sanitizeQuantity', () => {
    it('preserves full precision instead of rounding to 1 decimal', () => {
        expect(sanitizeQuantity(0.25)).toBe(0.25)
        expect(sanitizeQuantity(0.333)).toBe(0.333)
    })

    it('preserves an explicit 0 (the excluded-item marker)', () => {
        expect(sanitizeQuantity(0)).toBe(0)
    })

    it('falls back to the neutral multiplier 1 for NaN', () => {
        expect(sanitizeQuantity(NaN)).toBe(1)
    })

    it('falls back to the neutral multiplier 1 for Infinity', () => {
        expect(sanitizeQuantity(Infinity)).toBe(1)
        expect(sanitizeQuantity(-Infinity)).toBe(1)
    })
})

describe('sanitizeExactMacro', () => {
    it('preserves full precision instead of rounding to 1 decimal', () => {
        expect(sanitizeExactMacro(29.55)).toBe(29.55)
    })

    it('preserves an explicit 0', () => {
        expect(sanitizeExactMacro(0)).toBe(0)
    })

    it('falls back to 0 for NaN', () => {
        expect(sanitizeExactMacro(NaN)).toBe(0)
    })

    it('falls back to 0 for Infinity', () => {
        expect(sanitizeExactMacro(Infinity)).toBe(0)
        expect(sanitizeExactMacro(-Infinity)).toBe(0)
    })
})
