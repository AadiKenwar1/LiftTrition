import { resolveColorScheme } from '../colors'

describe('resolveColorScheme', () => {
    // Explicit preferences always win over the OS appearance
    it('returns light when preference is light regardless of OS scheme', () => {
        expect(resolveColorScheme('light', 'dark')).toBe('light')
        expect(resolveColorScheme('light', 'light')).toBe('light')
        expect(resolveColorScheme('light', null)).toBe('light')
        expect(resolveColorScheme('light', undefined)).toBe('light')
    })

    it('returns dark when preference is dark regardless of OS scheme', () => {
        expect(resolveColorScheme('dark', 'light')).toBe('dark')
        expect(resolveColorScheme('dark', 'dark')).toBe('dark')
        expect(resolveColorScheme('dark', null)).toBe('dark')
        expect(resolveColorScheme('dark', undefined)).toBe('dark')
    })

    // 'system' mirrors the OS appearance
    it('follows the OS scheme when preference is system', () => {
        expect(resolveColorScheme('system', 'light')).toBe('light')
        expect(resolveColorScheme('system', 'dark')).toBe('dark')
    })

    // 'system' with no OS signal falls back to dark
    it('falls back to dark when preference is system and OS scheme is null or undefined', () => {
        expect(resolveColorScheme('system', null)).toBe('dark')
        expect(resolveColorScheme('system', undefined)).toBe('dark')
    })
})
