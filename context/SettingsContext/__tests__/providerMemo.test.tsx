// H6 regression coverage: SettingsContext, WorkoutContext, and AuthContext each used to pass a
// FRESH inline object literal to their <Context.Provider value={{...}}>, so every provider render
// — including ones driven by state no consumer reads (SettingsContext's persistDirty save-cycle) —
// pushed a new value reference and re-rendered every consumer app-wide. Each value is now wrapped
// in useMemo with an exhaustive dep list. These tests pin (a) that an internal-only pass reuses the
// value reference (no consumer churn) and (b) that a real mutation still re-keys and flows new data.
//
// Modeled on context/BillingContext/__tests__/billingContext.test.tsx (render/probe shape) and
// context/SettingsContext/__tests__/index.persist.test.tsx (mock shape).

// react-test-renderer ships no bundled types (@types/react-test-renderer not installed); suppress
// the missing-declaration error (test-only runtime dep), matching billingContext.test.tsx.
// @ts-ignore
import { act, create } from 'react-test-renderer'
import type { Session } from '@supabase/supabase-js'
import { getDateKey } from '@/lib/utils/dateHelper'
import { SettingsProvider, useSettings } from '@/context/SettingsContext'
import { WorkoutProvider, useWorkout } from '@/context/WorkoutContext'
import { DEFAULT_SETTINGS } from '@/context/SettingsContext/defaults'
import type { SettingsContextInterface } from '@/context/SettingsContext/types'
import type { WorkoutContextInterface } from '@/context/WorkoutContext/types'
import type { AuthContextInterface } from '@/context/AuthContext/types'
import { supabase } from '@/lib/supabase/client'
import { loadSettingsAndBw, upsertSettings, upsertWeightForDate } from '@/context/SettingsContext/database/powersyncStore'
import { loadWorkoutData } from '@/context/WorkoutContext/database/powersyncStore'

// Settings & Workout read only `userID` from useAuth; stub it to a constant signed-in id so their
// loaders run deterministically. The AuthContext value memo itself is exercised below against the
// REAL provider via jest.requireActual (which bypasses this mock).
jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ userID: 'user-1' }),
}))

jest.mock('@/lib/powersync/system', () => ({
    powerSync: {
        waitForFirstSync: jest.fn().mockResolvedValue(undefined),
        execute: jest.fn().mockResolvedValue(undefined),
        writeTransaction: jest.fn().mockResolvedValue(undefined),
        getAll: jest.fn().mockResolvedValue([]),
    },
}))

// Sentry is only reached on failure paths none of these tests cross; mocked so importing
// persistErrors / the real AuthProvider never touches the native SDK.
jest.mock('@sentry/react-native', () => ({
    captureException: jest.fn(),
    setUser: jest.fn(),
}))

jest.mock('@/context/SettingsContext/database/powersyncStore', () => ({
    loadSettingsAndBw: jest.fn(),
    upsertSettings: jest.fn(),
    upsertWeightForDate: jest.fn(),
}))

jest.mock('@/context/WorkoutContext/database/powersyncStore', () => ({
    loadWorkoutData: jest.fn(),
    insertLog: jest.fn().mockResolvedValue(undefined),
    insertWorkoutWithOrderBump: jest.fn().mockResolvedValue(undefined),
    insertDuplicateWorkout: jest.fn().mockResolvedValue(undefined),
    insertExerciseWithOrderBump: jest.fn().mockResolvedValue(undefined),
    insertExercisesWithOrderBump: jest.fn().mockResolvedValue(undefined),
    updateExerciseOrders: jest.fn().mockResolvedValue(undefined),
    updateWorkoutOrders: jest.fn().mockResolvedValue(undefined),
    upsertExercise: jest.fn().mockResolvedValue(undefined),
    upsertUserExercise: jest.fn().mockResolvedValue(undefined),
    upsertWorkout: jest.fn().mockResolvedValue(undefined),
    // M16: the 6 delete/archive fns relocated from index.tsx inline SQL into the store. The
    // provider now imports these, so this hand-listed partial mock must enumerate them too —
    // otherwise a future delete/archive test in this file calls undefined. The current 2 Workout
    // tests (add-log + re-render) don't reach them, so they were silently absent before this.
    deleteWorkoutCascade: jest.fn().mockResolvedValue(undefined),
    deleteExerciseCascade: jest.fn().mockResolvedValue(undefined),
    deleteLogRow: jest.fn().mockResolvedValue(undefined),
    deleteUserExerciseRow: jest.fn().mockResolvedValue(undefined),
    setWorkoutArchived: jest.fn().mockResolvedValue(undefined),
    setExerciseArchived: jest.fn().mockResolvedValue(undefined),
}))

// Real-AuthProvider dependency mocks (only reached via the requireActual path below).
jest.mock('@/lib/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        },
    },
}))

jest.mock('@/lib/powersync/orchestrator', () => ({
    disconnectPowerSync: jest.fn().mockResolvedValue(undefined),
    ensurePowerSyncConnected: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/context/AuthContext/functions/accountFunctions', () => ({
    signOut: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/context/AuthContext/functions/authFunctions', () => ({
    signInWithApple: jest.fn().mockResolvedValue(undefined),
}))

// The REAL AuthContext module (bypasses the useAuth mock above) so its AuthProvider + useAuth share
// the same real context — its heavy deps are all mocked above, so it mounts cleanly under jest.
const RealAuth = jest.requireActual('@/context/AuthContext') as typeof import('@/context/AuthContext')

const mockLoadSettingsAndBw = loadSettingsAndBw as jest.Mock
const mockUpsertSettings = upsertSettings as jest.Mock
const mockUpsertWeightForDate = upsertWeightForDate as jest.Mock
const mockLoadWorkoutData = loadWorkoutData as jest.Mock
const mockGetSession = supabase.auth.getSession as jest.Mock
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock

let settingsLatest: SettingsContextInterface
const settingsSeen: SettingsContextInterface[] = []
// Renders nothing; records every SettingsContext value the consumer receives.
function SettingsProbe() {
    settingsLatest = useSettings()
    settingsSeen.push(settingsLatest)
    return null
}

let workoutLatest: WorkoutContextInterface
const workoutSeen: WorkoutContextInterface[] = []
// Renders nothing; records every WorkoutContext value the consumer receives.
function WorkoutProbe() {
    workoutLatest = useWorkout()
    workoutSeen.push(workoutLatest)
    return null
}

let authLatest: AuthContextInterface
// Renders nothing; records the latest AuthContext value from the REAL provider.
function AuthProbe() {
    authLatest = RealAuth.useAuth()
    return null
}

// Flushes pending microtasks / passive effects inside act.
async function flush() {
    await act(async () => {
        await Promise.resolve()
    })
}

// Mounts SettingsProvider + probe and settles the initial load.
async function mountSettings() {
    await act(async () => {
        create(
            <SettingsProvider>
                <SettingsProbe />
            </SettingsProvider>,
        )
    })
    await flush()
}

// Mounts WorkoutProvider + probe, settles the initial load, and returns the renderer so
// callers can drive further updates on the same root (e.g. to simulate a parent re-render).
async function mountWorkout() {
    let renderer!: ReturnType<typeof create>
    await act(async () => {
        renderer = create(
            <WorkoutProvider>
                <WorkoutProbe />
            </WorkoutProvider>,
        )
    })
    await flush()
    return renderer
}

// Minimal Session carrying only the user.id that AuthProvider reads.
function makeSession(userId: string): Session {
    return { access_token: `token-${userId}`, user: { id: userId } } as unknown as Session
}

describe('SettingsProvider value memoization', () => {
    beforeEach(() => {
        mockLoadSettingsAndBw.mockReset().mockResolvedValue({ settings: DEFAULT_SETTINGS, bwProgress: {}, hasData: false })
        mockUpsertSettings.mockReset().mockResolvedValue(undefined)
        mockUpsertWeightForDate.mockReset().mockResolvedValue(undefined)
        settingsSeen.length = 0
    })

    it('reuses the value reference across the internal persistDirty save-cycle and re-keys only on a real settings change', async () => {
        await mountSettings()
        expect(settingsLatest.loaded).toBe(true)

        const before = settingsLatest
        settingsSeen.length = 0

        // One real mutation: flips persistDirty true (mutation render), then — once the mocked
        // upsertSettings resolves — false again (the save-cycle render nothing downstream reads).
        await act(async () => {
            settingsLatest.setSettings((prev) => ({ ...prev, calorieGoal: prev.calorieGoal + 111 }))
        })

        const after = settingsLatest
        // Real change re-keys the reference and the new value flows to the consumer.
        expect(after).not.toBe(before)
        expect(after.settings.calorieGoal).toBe(before.settings.calorieGoal + 111)
        // The persistDirty true→false flip must NOT spawn a second, churned reference: the consumer
        // sees exactly one new value for the write (it would see two without the memo).
        expect(new Set(settingsSeen).size).toBe(1)
        expect(settingsSeen[settingsSeen.length - 1]).toBe(after)
    })

    it('re-keys the value and flows the new bwProgress when a weigh-in lands', async () => {
        await mountSettings()
        expect(settingsLatest.loaded).toBe(true)

        const before = settingsLatest
        await act(async () => {
            await settingsLatest.handleUpdateBw(185)
        })
        await flush()

        expect(settingsLatest).not.toBe(before)
        expect(settingsLatest.bwProgress[getDateKey(new Date())]).toBe(185)
    })
})

describe('WorkoutProvider value memoization', () => {
    beforeEach(() => {
        mockLoadWorkoutData.mockReset().mockResolvedValue({ workouts: [], exercises: [], logs: [], userExercises: {} })
        workoutSeen.length = 0
    })

    it('re-keys the value and flows the new log on a real add-log mutation', async () => {
        await mountWorkout()
        expect(workoutLatest.loaded).toBe(true)

        const before = workoutLatest
        await act(async () => {
            await workoutLatest.handleAddLog('w1', 'e1', 'user-1', 100, 5, 8, new Date())
        })
        await flush()

        expect(workoutLatest).not.toBe(before)
        expect(workoutLatest.logs).toHaveLength(before.logs.length + 1)
    })

    it('reuses the value reference across a re-render triggered by something other than its own state', async () => {
        const renderer = await mountWorkout()
        expect(workoutLatest.loaded).toBe(true)

        const before = workoutLatest
        workoutSeen.length = 0

        // Re-render the root with an equivalent but referentially-fresh tree — the general form
        // of the H6 bug: a re-render for reasons unrelated to WorkoutProvider's own state (e.g. a
        // parent re-rendering) must not still push a fresh value object.
        await act(async () => {
            renderer.update(
                <WorkoutProvider>
                    <WorkoutProbe />
                </WorkoutProvider>,
            )
        })
        await flush()

        // WorkoutProbe is forced to re-render once by the top-level update, but must observe the
        // SAME context value both times — proving the memo skipped recomputation because none of
        // WorkoutProvider's own state actually changed.
        expect(workoutSeen).toEqual([before])
        expect(workoutLatest).toBe(before)
    })
})

describe('AuthProvider value memoization (documented token-refresh caveat)', () => {
    beforeEach(() => {
        mockGetSession.mockReset().mockResolvedValue({ data: { session: makeSession('user-1') } })
        mockOnAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
    })

    it('holds userID stable across a same-user token refresh, re-keying only because session/user are new objects', async () => {
        await act(async () => {
            create(
                <RealAuth.AuthProvider>
                    <AuthProbe />
                </RealAuth.AuthProvider>,
            )
        })
        await flush()
        expect(authLatest.userID).toBe('user-1')

        const before = authLatest

        // Simulate a token refresh: same user id, a brand-new session object.
        const onChange = mockOnAuthStateChange.mock.calls[0][0] as (event: string, session: Session | null) => void
        await act(async () => {
            onChange('TOKEN_REFRESHED', makeSession('user-1'))
        })
        await flush()

        const after = authLatest
        // userID-only consumers are unaffected — the string is byte-identical…
        expect(after.userID).toBe(before.userID)
        // …but session/user are fresh objects, so — per the documented caveat — the value memo still
        // recomputes on refresh (this fix removes Auth's OWN redundant renders, not this ripple).
        expect(after.session).not.toBe(before.session)
        expect(after).not.toBe(before)
    })
})
