import { weightUnitLabel } from '../unitConversions'

describe('weightUnitLabel', () => {
    test('imperial → lbs (plural, the app-wide standard)', () => {
        expect(weightUnitLabel('imperial')).toBe('lbs')
    })
    test('metric → kg', () => {
        expect(weightUnitLabel('metric')).toBe('kg')
    })
})
