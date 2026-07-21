// L19 regression coverage: fullExerciseLib / fullExerciseLibAsList are now DERIVED (useMemo) from
// userExercises rather than held in React state and rebuilt by an effect. These tests pin the two
// guarantees that make the refactor safe: (a) with no custom exercises the provider hands back the
// SHARED module references (exerciseLib / exerciseLibAsList) verbatim — the stable-reference
// optimization that avoids re-spreading ~1,300 entries on every unrelated render — and (b) a custom
// exercise is merged OVER the base library with the same precedence the old effect produced.
//
// Mock shape modeled on context/SettingsContext/__tests__/providerMemo.test.tsx.

// react-test-renderer ships no bundled types (@types/react-test-renderer not installed); suppress
// the missing-declaration error (test-only runtime dep), matching providerMemo.test.tsx.
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { WorkoutProvider, useWorkout } from '@/context/WorkoutContext'
import { exerciseLib, exerciseLibAsList } from '@/context/WorkoutContext/exerciseLibrary'
import { loadWorkoutData } from '@/context/WorkoutContext/database/powersyncStore'
import type { ExerciseLibraryEntry, WorkoutContextInterface } from '@/context/WorkoutContext/types'

// Workout reads only `userID` from useAuth; stub a constant signed-in id so its loader runs.
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

// Sentry is only reached on failure paths these tests never cross; mocked so importing persistErrors
// never touches the native SDK.
jest.mock('@sentry/react-native', () => ({
    captureException: jest.fn(),
    setUser: jest.fn(),
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
    upsertUserExercise: jest.fn().mockResolvedValue(undefined),
    upsertWorkout: jest.fn().mockResolvedValue(undefined),
    deleteWorkoutCascade: jest.fn().mockResolvedValue(undefined),
    deleteExerciseCascade: jest.fn().mockResolvedValue(undefined),
    deleteLogRow: jest.fn().mockResolvedValue(undefined),
    deleteUserExerciseRow: jest.fn().mockResolvedValue(undefined),
    setWorkoutArchived: jest.fn().mockResolvedValue(undefined),
    setExerciseArchived: jest.fn().mockResolvedValue(undefined),
}))

const mockLoadWorkoutData = loadWorkoutData as jest.Mock

let workoutLatest: WorkoutContextInterface
// Renders nothing; records the latest WorkoutContext value the consumer receives.
function WorkoutProbe() {
    workoutLatest = useWorkout()
    return null
}

// Flushes pending microtasks / passive effects inside act.
async function flush() {
    await act(async () => {
        await Promise.resolve()
    })
}

// Mounts WorkoutProvider + probe and settles the initial (empty) load.
async function mountWorkout() {
    await act(async () => {
        create(
            <WorkoutProvider>
                <WorkoutProbe />
            </WorkoutProvider>,
        )
    })
    await flush()
}

describe('WorkoutProvider fullExerciseLib derivation', () => {
    beforeEach(() => {
        mockLoadWorkoutData.mockReset().mockResolvedValue({ workouts: [], exercises: [], logs: [], userExercises: {} })
    })

    it('returns the shared module references when userExercises is empty (stable-reference optimization)', async () => {
        await mountWorkout()
        expect(workoutLatest.loaded).toBe(true)
        expect(workoutLatest.userExercises).toEqual({})
        // No custom exercises → hand back the shared base objects verbatim, with no per-render churn.
        expect(workoutLatest.fullExerciseLib).toBe(exerciseLib)
        expect(workoutLatest.fullExerciseLibAsList).toBe(exerciseLibAsList)
    })

    it('merges a seeded custom exercise over the base library with custom precedence', async () => {
        await mountWorkout()

        const baseKey = Object.keys(exerciseLib)[0]
        const customName = '__L19 Custom Test Lift__'
        const override: ExerciseLibraryEntry = { mainMuscle: 'L19-Override-Muscle', equipment: 'L19-Equip', isCompound: true, fatigueFactor: 42 }
        const custom: ExerciseLibraryEntry = { mainMuscle: 'L19-Custom-Muscle', equipment: 'L19-Equip', isCompound: false, fatigueFactor: 7 }

        await act(async () => {
            workoutLatest.setUserExercises({ [baseKey]: override, [customName]: custom })
        })
        await flush()

        const merged = workoutLatest.fullExerciseLib
        // The net-new custom entry is present…
        expect(merged[customName]).toEqual(custom)
        // …a same-named base entry is overridden by the custom one (custom precedence = merged OVER base)…
        expect(merged[baseKey]).toEqual(override)
        // …every base key is retained, plus exactly the one net-new custom key…
        expect(Object.keys(merged)).toHaveLength(Object.keys(exerciseLib).length + 1)
        // …and it is a fresh merged object, no longer the shared base reference.
        expect(merged).not.toBe(exerciseLib)
    })
})
