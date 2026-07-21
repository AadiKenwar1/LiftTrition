import * as fs from 'fs'
import * as path from 'path'

// Structural guard test for app/_layout.tsx (M22): pins that every dev-only preview/diagnostics
// route — devTest/* and settingsScreens/devStatsModal — is registered only inside a __DEV__-gated
// Stack.Protected group, never inside the plain session-gated production group. The guarded-require
// pattern inside each screen already strips the component from a production bundle; this test pins
// the route *registration* itself, since Expo Router auto-registers any file under app/ as a route
// regardless of what the component body does at runtime.
const layoutSource = fs.readFileSync(path.join(__dirname, '..', '_layout.tsx'), 'utf8')

type ProtectedGroup = { guard: string; body: string }

// Parses the top-level (non-nested) <Stack.Protected guard={...}>...</Stack.Protected> blocks out of
// the _layout.tsx source, pairing each block's guard expression with the screens registered inside it.
function extractProtectedGroups(source: string): ProtectedGroup[] {
    const groups: ProtectedGroup[] = []
    const openTagPattern = /<Stack\.Protected guard=\{([^}]*)\}>/g
    let match: RegExpExecArray | null
    while ((match = openTagPattern.exec(source)) !== null) {
        const guard = match[1]
        const bodyStart = openTagPattern.lastIndex
        const closeIndex = source.indexOf('</Stack.Protected>', bodyStart)
        if (closeIndex === -1) throw new Error('Unclosed <Stack.Protected> found while parsing app/_layout.tsx')
        groups.push({ guard, body: source.slice(bodyStart, closeIndex) })
    }
    return groups
}

describe('_layout.tsx dev-only route guarding (M22)', () => {
    const groups = extractProtectedGroups(layoutSource)
    const devTestScreenNames = [...layoutSource.matchAll(/name="(devTest\/[^"]+)"/g)].map((m) => m[1])

    // Guards against a vacuously-passing test if the devTest/* screens are ever renamed away from that prefix.
    it('finds a non-trivial set of devTest/* screens registered in the navigator (sanity check)', () => {
        expect(devTestScreenNames.length).toBeGreaterThan(0)
    })

    it('registers every devTest/* Stack.Screen only inside a __DEV__-gated Stack.Protected group', () => {
        for (const screenName of devTestScreenNames) {
            const owningGroup = groups.find((g) => g.body.includes(`name="${screenName}"`))
            expect(owningGroup).toBeDefined()
            expect(owningGroup!.guard).toContain('__DEV__')
        }
    })

    it('registers settingsScreens/devStatsModal only inside a __DEV__-gated Stack.Protected group', () => {
        const owningGroup = groups.find((g) => g.body.includes('name="settingsScreens/devStatsModal"'))
        expect(owningGroup).toBeDefined()
        expect(owningGroup!.guard).toContain('__DEV__')
    })

    it('keeps the production (tabs) group free of dev-only routes', () => {
        // Anchor on the (tabs) route the production landing group registers, NOT on a bare "!!session"
        // guard match. Since M31 the onboarding group also carries "!!session" (guard is
        // "!!session && !settings.onboardingComplete"), so a guard-string heuristic matches onboarding
        // first and silently stops inspecting the (tabs) group this test exists to pin. The (tabs) route
        // lives only in this group; the __DEV__ exclusion keeps it the production (non-dev) group.
        const productionGroup = groups.find((g) => g.body.includes('name="(tabs)"') && !g.guard.includes('__DEV__'))
        expect(productionGroup).toBeDefined()
        expect(productionGroup!.body).not.toMatch(/name="devTest\//)
        expect(productionGroup!.body).not.toContain('name="settingsScreens/devStatsModal"')
    })

    it('preserves dev-build gating: the __DEV__ group ANDs onto (not replaces) the session/context/onboarding preconditions', () => {
        const devGroup = groups.find((g) => g.guard.includes('__DEV__'))
        expect(devGroup).toBeDefined()
        expect(devGroup!.guard).toContain('!!session')
        expect(devGroup!.guard).toContain('allContextsLoaded')
        expect(devGroup!.guard).toContain('settings.onboardingComplete')
    })
})
