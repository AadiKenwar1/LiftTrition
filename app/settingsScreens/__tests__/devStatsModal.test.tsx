import React from 'react'
import { act, create } from 'react-test-renderer'

describe('devStatsModal route', () => {
    const realDev = (global as { __DEV__?: boolean }).__DEV__

    afterEach(() => {
        ;(global as { __DEV__?: boolean }).__DEV__ = realDev
        jest.resetModules()
    })

    it('renders nothing in a production build', () => {
        ;(global as { __DEV__?: boolean }).__DEV__ = false
        jest.resetModules()
        const DevStatsModalRoute = require('../devStatsModal').default
        let tree: unknown = 'not-rendered'
        act(() => {
            tree = create(<DevStatsModalRoute />).toJSON()
        })
        expect(tree).toBeNull()
    })
})
