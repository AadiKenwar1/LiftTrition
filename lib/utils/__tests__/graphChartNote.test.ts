import { getGraphChartNote } from '../graphChartNote'

describe('getGraphChartNote', () => {
    it('returns undefined for range 7', () => {
        expect(getGraphChartNote('strength', 7)).toBeUndefined()
        expect(getGraphChartNote('sets', 7)).toBeUndefined()
    })

    it('returns two-line strength note at 14 and 21', () => {
        const expected = {
            lines: ['Endpoints: oldest & latest estimated 1RM', 'Middle: best 1RM per created'],
        }
        expect(getGraphChartNote('strength', 14)).toEqual(expected)
        expect(getGraphChartNote('strength', 21)).toEqual(expected)
    })

    it('returns macro, sets, and bodyweight notes', () => {
        expect(getGraphChartNote('macro', 14)).toEqual({ lines: ['Average every 2 days'] })
        expect(getGraphChartNote('sets', 21)).toEqual({ lines: ['Sum of sets every 3 days'] })
        expect(getGraphChartNote('bodyweight', 14)).toEqual({ lines: ['Average weight every 2 days'] })
    })
})
