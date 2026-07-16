import { GOAL_REACHED_PATHS } from '../goalReachedPaths'

describe('goalReachedPaths (Dev Hub guided paths run the real logic)', () => {
    test.each(GOAL_REACHED_PATHS.map((p) => [p.label, p.run]))('%s — all assertions pass', (_label, run) => {
        const result = (run as (typeof GOAL_REACHED_PATHS)[number]['run'])()
        const failed = result.lines.filter((l) => l.startsWith('✗'))
        expect(failed).toEqual([])
        expect(result.pass).toBe(true)
    })
})
