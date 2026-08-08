import { withAlpha } from '../colors'

describe('withAlpha', () => {
    // 6-digit hex is the only form the palette accents use, so it is the only form that converts
    it('splits a 6-digit hex into rgba channels', () => {
        // #2C63AD — the light-scheme workout blue: 2C=44, 63=99, AD=173
        expect(withAlpha('#2C63AD', 0.13)).toBe('rgba(44,99,173,0.13)')
        // #0D7331 — the light-scheme nutrition green: 0D=13, 73=115, 31=49
        expect(withAlpha('#0D7331', 0.1)).toBe('rgba(13,115,49,0.1)')
    })

    it('accepts lowercase hex digits', () => {
        // #4290fb — the dark-scheme workout blue: 42=66, 90=144, fb=251
        expect(withAlpha('#4290fb', 0.16)).toBe('rgba(66,144,251,0.16)')
    })

    it('passes the alpha through verbatim at both extremes', () => {
        expect(withAlpha('#FFFFFF', 1)).toBe('rgba(255,255,255,1)')
        expect(withAlpha('#000000', 0)).toBe('rgba(0,0,0,0)')
    })

    // Guards the case that would actually corrupt a style: colors.hairline is already rgba() in the
    // dark palette, and wrapping it a second time would produce an unparseable color string
    it('returns an already-translucent color untouched', () => {
        expect(withAlpha('rgba(255,255,255,0.06)', 0.5)).toBe('rgba(255,255,255,0.06)')
    })

    it('returns shorthand and 8-digit hex untouched', () => {
        expect(withAlpha('#FFF', 0.5)).toBe('#FFF')
        expect(withAlpha('#FFFFFFAA', 0.5)).toBe('#FFFFFFAA')
    })
})
