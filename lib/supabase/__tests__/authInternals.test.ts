import { GoTrueClient } from '@supabase/auth-js'

// accountFunctions.removeLocalAuthSession falls back to the private
// _removeSession when offline. A supabase upgrade that renames it must fail
// here, at test time — not silently break offline force sign-out.
describe('supabase auth internals contract', () => {
    it('GoTrueClient still exposes _removeSession', () => {
        const proto = GoTrueClient.prototype as unknown as Record<string, unknown>
        expect(typeof proto._removeSession).toBe('function')
    })
})
