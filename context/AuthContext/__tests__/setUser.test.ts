// setUser.test.ts
// Pins AuthContext's consolidated Sentry.setUser effect (one source for every session transition:
// initial load, sign-in, token refresh, sign-out) and the single-capture invariant for PowerSync
// connect failures — the double-capture regression flagged by ~7 reviewers in the H4 review (see
// docs/PRODUCTION_READINESS_FIXES.txt, "Adjudication decisions").

// react-test-renderer ships no bundled types (@types/react-test-renderer not installed).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import React from 'react'

jest.mock('@sentry/react-native', () => ({
    setUser: jest.fn(),
    captureException: jest.fn(),
}))

const mockGetSession = jest.fn()
const mockOnAuthStateChange = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: (...args: unknown[]) => mockGetSession(...args),
            onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
        },
    },
}))

const mockEnsureConnected = jest.fn()
const mockDisconnectPowerSync = jest.fn()
jest.mock('@/lib/powersync/orchestrator', () => ({
    ensurePowerSyncConnected: (...args: unknown[]) => mockEnsureConnected(...args),
    disconnectPowerSync: (...args: unknown[]) => mockDisconnectPowerSync(...args),
}))

// AuthProvider imports these directly; mocked so this test only exercises index.tsx's own
// effects, without pulling in FlushUploads/foodDB/openAI/Apple-auth's transitive dependencies.
jest.mock('@/context/AuthContext/functions/accountFunctions', () => ({
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
}))
jest.mock('@/context/AuthContext/functions/authFunctions', () => ({
    signInWithApple: jest.fn(),
}))

import * as Sentry from '@sentry/react-native'
import { AuthProvider } from '../index'

// Minimal fake Supabase session carrying just the one field AuthContext reads (user.id).
function fakeSession(userId: string): any {
    return { user: { id: userId } }
}

let unsubscribe: jest.Mock
let authStateCallback: (event: string, session: unknown) => void
let tree: any

beforeEach(() => {
    jest.clearAllMocks()
    unsubscribe = jest.fn()
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
        authStateCallback = cb
        return { data: { subscription: { unsubscribe } } }
    })
    mockEnsureConnected.mockResolvedValue(undefined)
    mockDisconnectPowerSync.mockResolvedValue(undefined)
})

afterEach(() => {
    if (tree) act(() => tree.unmount())
    tree = null
})

// Mount AuthProvider; one async act drains the getSession().then() chain (and anything it
// triggers, e.g. the PowerSync connect effect) through to a settled render.
async function renderAuthProvider(): Promise<void> {
    await act(async () => {
        tree = create(React.createElement(AuthProvider, null))
    })
}

describe('AuthContext Sentry.setUser', () => {
    it('calls setUser(null) on initial load with no session', async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } })

        await renderAuthProvider()

        expect(Sentry.setUser).toHaveBeenCalledWith(null)
    })

    it('calls setUser({id}) once a session resolves on initial load', async () => {
        mockGetSession.mockResolvedValue({ data: { session: fakeSession('u1') } })

        await renderAuthProvider()

        expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'u1' })
    })

    it('tracks onAuthStateChange transitions: sign-in sets the id, sign-out clears it', async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } })
        await renderAuthProvider()
        ;(Sentry.setUser as jest.Mock).mockClear()

        await act(async () => {
            authStateCallback('SIGNED_IN', fakeSession('u2'))
        })
        expect(Sentry.setUser).toHaveBeenLastCalledWith({ id: 'u2' })

        await act(async () => {
            authStateCallback('SIGNED_OUT', null)
        })
        expect(Sentry.setUser).toHaveBeenLastCalledWith(null)
    })
})

describe('AuthContext PowerSync connect-failure capture', () => {
    it('captures a connect failure exactly once, tagged powersync-connect/auth_session', async () => {
        mockGetSession.mockResolvedValue({ data: { session: fakeSession('u3') } })
        const error = new Error('connect failed')
        mockEnsureConnected.mockRejectedValue(error)

        await renderAuthProvider()

        expect(Sentry.captureException).toHaveBeenCalledTimes(1)
        expect(Sentry.captureException).toHaveBeenCalledWith(error, { tags: { area: 'powersync-connect', reason: 'auth_session' } })
    })

    it('never captures when the connection succeeds', async () => {
        mockGetSession.mockResolvedValue({ data: { session: fakeSession('u4') } })
        mockEnsureConnected.mockResolvedValue(undefined)

        await renderAuthProvider()

        expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('never calls ensurePowerSyncConnected (so never captures) when there is no session', async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } })

        await renderAuthProvider()

        expect(mockEnsureConnected).not.toHaveBeenCalled()
        expect(Sentry.captureException).not.toHaveBeenCalled()
    })
})
