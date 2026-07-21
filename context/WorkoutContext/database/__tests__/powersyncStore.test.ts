jest.mock('@/lib/powersync/system', () => ({ powerSync: { getAll: jest.fn(), writeTransaction: jest.fn(), execute: jest.fn() } }))

import { powerSync } from '@/lib/powersync/system'
import { setSaveFailureArmed } from '@/lib/devtools/forceSaveFailure'
import {
    deleteExerciseCascade,
    deleteLogRow,
    deleteUserExerciseRow,
    deleteWorkoutCascade,
    insertDuplicateWorkout,
    insertExercisesWithOrderBump,
    insertWorkoutWithOrderBump,
    setExerciseArchived,
    setWorkoutArchived,
    updateExerciseOrders,
    updateWorkoutOrders,
    upsertExercise,
    upsertUserExercise,
    upsertWorkout,
} from '../powersyncStore'
import { Exercise, ExerciseLibraryEntry, Workout } from '../../types'

// M15 coverage for the WorkoutContext raw-SQL store (context/WorkoutContext/database/powersyncStore.ts):
// the 312-line sibling that — unlike SettingsContext/NutritionContext — had no test at all. These
// capture the callback handed to powerSync.writeTransaction and run it against a fake tx, so the exact
// statement sequencing / bind params inside the transaction are asserted: order-bump ordering, the
// upsert-vs-insert fork (hand-duplicated once for workouts and once for exercises — both must be
// pinned so a future "collapse the two copies" refactor can't silently break one), and the batch bump
// amount (the one order-bump that uses the batch length instead of the +1 used everywhere else).
//
// M16 extends this file (not a mirror of an existing pattern — Nutrition/Settings powersyncStore
// tests never exercise fault injection): the 6 delete/archive functions relocated out of
// WorkoutContext/index.tsx's inline SQL, plus SQL/param pins for the 7 store functions that gained
// the throwIfSaveFailureArmed('workout') guard but had no SQL-level test yet, plus a "throws before
// any write" assertion for all 13 touched functions.

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
    return { id: 'w1', userID: 'u1', name: 'Push', order: 0, archived: false, note: '', createdAt: new Date(), updatedAt: new Date(), ...overrides }
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
    return { id: 'e1', userID: 'u1', workoutID: 'w1', name: 'Bench', userMax: 100, order: 0, archived: false, createdAt: new Date(), updatedAt: new Date(), ...overrides }
}

// Wires powerSync.writeTransaction to invoke its callback against a fake tx and returns that tx,
// so a test can inspect the exact SQL / bind-params (and their order) of the tx.execute calls.
// `existingRows` seeds tx.getAll — non-empty selects the UPDATE branch, empty the INSERT branch.
function mockTransaction(existingRows: unknown[] = []) {
    const tx = {
        execute: jest.fn().mockResolvedValue(undefined),
        getAll: jest.fn().mockResolvedValue(existingRows),
    }
    // Param labeled `mockTx` (not `tx`) so its `typeof tx` annotation isn't self-referential.
    ;(powerSync.writeTransaction as jest.Mock).mockImplementation(async (fn: (mockTx: typeof tx) => Promise<void>) => {
        await fn(tx)
    })
    return tx
}

beforeEach(() => {
    ;(powerSync.writeTransaction as jest.Mock).mockReset()
    ;(powerSync.execute as jest.Mock).mockReset()
})

describe('insertWorkoutWithOrderBump order-bump sequencing', () => {
    it('bumps sibling order via UPDATE before INSERTing the new workout, in one transaction', async () => {
        const tx = mockTransaction()
        await insertWorkoutWithOrderBump(makeWorkout({ id: 'w-new', userID: 'u1' }))

        expect(powerSync.writeTransaction).toHaveBeenCalledTimes(1)
        expect(tx.execute).toHaveBeenCalledTimes(2)
        // The bump UPDATE must run first (scoped to the user's active rows)...
        const [firstSql, firstParams] = tx.execute.mock.calls[0]
        expect(firstSql).toMatch(/UPDATE workouts SET "order" = "order" \+ 1/)
        expect(firstSql).toMatch(/archived = 0/)
        expect(firstParams).toEqual(['u1'])
        // ...then the INSERT of the new row — so the new row's own order is not bumped by its own insert.
        const [secondSql, secondParams] = tx.execute.mock.calls[1]
        expect(secondSql).toMatch(/INSERT INTO workouts/)
        expect(secondParams[0]).toBe('w-new')
    })
})

describe('upsertWorkout upsert-vs-insert fork', () => {
    it('UPDATEs (and does not INSERT) when the row already exists', async () => {
        const tx = mockTransaction([{ id: 'w1' }])
        await upsertWorkout(makeWorkout({ id: 'w1' }))

        expect(tx.execute).toHaveBeenCalledTimes(1)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE workouts SET/)
    })

    it('INSERTs (and does not UPDATE) when the row does not exist', async () => {
        const tx = mockTransaction([])
        await upsertWorkout(makeWorkout({ id: 'w1' }))

        expect(tx.execute).toHaveBeenCalledTimes(1)
        expect(tx.execute.mock.calls[0][0]).toMatch(/INSERT INTO workouts/)
    })
})

// The exercise upsert is a hand-duplicated copy of upsertWorkout's fork — pinned separately so both
// copies must change together; a fix to one alone would leave this one silently wrong.
describe('upsertExercise upsert-vs-insert fork (duplicated copy of upsertWorkout)', () => {
    it('UPDATEs (and does not INSERT) when the row already exists', async () => {
        const tx = mockTransaction([{ id: 'e1' }])
        await upsertExercise(makeExercise({ id: 'e1' }))

        expect(tx.execute).toHaveBeenCalledTimes(1)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE exercises SET/)
    })

    it('INSERTs (and does not UPDATE) when the row does not exist', async () => {
        const tx = mockTransaction([])
        await upsertExercise(makeExercise({ id: 'e1' }))

        expect(tx.execute).toHaveBeenCalledTimes(1)
        expect(tx.execute.mock.calls[0][0]).toMatch(/INSERT INTO exercises/)
    })
})

describe('insertExercisesWithOrderBump batch bump amount', () => {
    it('bumps sibling order by the batch length, not a hardcoded 1', async () => {
        const tx = mockTransaction()
        const batch = [
            makeExercise({ id: 'e1', order: 0 }),
            makeExercise({ id: 'e2', order: 1 }),
            makeExercise({ id: 'e3', order: 2 }),
        ]
        await insertExercisesWithOrderBump(batch)

        // First statement is the bump UPDATE; its first bound param is the bump amount.
        const [bumpSql, bumpParams] = tx.execute.mock.calls[0]
        expect(bumpSql).toMatch(/UPDATE exercises SET "order" = "order" \+ \?/)
        expect(bumpParams[0]).toBe(batch.length) // 3, not 1
        expect(bumpParams[1]).toBe('w1') // scoped to the shared workout
        // One bump + one INSERT per exercise.
        expect(tx.execute).toHaveBeenCalledTimes(1 + batch.length)
    })
})

// ------------------------------------------------------------------------------------------
// M16: SQL/param pins for the 4 previously store-layer-but-untested functions (the guard was
// missing on these; insertWorkoutWithOrderBump/upsertWorkout/upsertExercise/
// insertExercisesWithOrderBump above already had SQL-level pins before this fix).
// ------------------------------------------------------------------------------------------

describe('updateWorkoutOrders batch update', () => {
    it('UPDATEs the order of every workout in the batch, in one transaction', async () => {
        const tx = mockTransaction()
        const batch = [makeWorkout({ id: 'w1', order: 2 }), makeWorkout({ id: 'w2', order: 5 })]
        await updateWorkoutOrders(batch)

        expect(powerSync.writeTransaction).toHaveBeenCalledTimes(1)
        expect(tx.execute).toHaveBeenCalledTimes(2)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE workouts SET "order" = \?/)
        expect(tx.execute.mock.calls[0][1]).toEqual([2, 'w1'])
        expect(tx.execute.mock.calls[1][0]).toMatch(/UPDATE workouts SET "order" = \?/)
        expect(tx.execute.mock.calls[1][1]).toEqual([5, 'w2'])
    })

    it('is a no-op (opens no transaction) for an empty batch', async () => {
        mockTransaction()
        await updateWorkoutOrders([])
        expect(powerSync.writeTransaction).not.toHaveBeenCalled()
    })
})

describe('insertDuplicateWorkout', () => {
    it('bumps sibling order, inserts the new workout, then inserts each duplicated exercise, in one transaction', async () => {
        const tx = mockTransaction()
        const workout = makeWorkout({ id: 'w-dup', userID: 'u1' })
        const exercises = [
            makeExercise({ id: 'e-dup1', workoutID: 'w-dup' }),
            makeExercise({ id: 'e-dup2', workoutID: 'w-dup' }),
        ]
        await insertDuplicateWorkout(workout, exercises)

        expect(powerSync.writeTransaction).toHaveBeenCalledTimes(1)
        expect(tx.execute).toHaveBeenCalledTimes(1 + 1 + exercises.length)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE workouts SET "order" = "order" \+ 1/)
        expect(tx.execute.mock.calls[0][1]).toEqual(['u1'])
        expect(tx.execute.mock.calls[1][0]).toMatch(/INSERT INTO workouts/)
        expect(tx.execute.mock.calls[1][1][0]).toBe('w-dup')
        expect(tx.execute.mock.calls[2][0]).toMatch(/INSERT INTO exercises/)
        expect(tx.execute.mock.calls[2][1][0]).toBe('e-dup1')
        expect(tx.execute.mock.calls[3][0]).toMatch(/INSERT INTO exercises/)
        expect(tx.execute.mock.calls[3][1][0]).toBe('e-dup2')
    })
})

describe('updateExerciseOrders batch update', () => {
    it('UPDATEs the order of every exercise in the batch, in one transaction', async () => {
        const tx = mockTransaction()
        const batch = [makeExercise({ id: 'e1', order: 1 }), makeExercise({ id: 'e2', order: 3 })]
        await updateExerciseOrders(batch)

        expect(tx.execute).toHaveBeenCalledTimes(2)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE exercises SET "order" = \?/)
        expect(tx.execute.mock.calls[0][1]).toEqual([1, 'e1'])
        expect(tx.execute.mock.calls[1][0]).toMatch(/UPDATE exercises SET "order" = \?/)
        expect(tx.execute.mock.calls[1][1]).toEqual([3, 'e2'])
    })

    it('is a no-op (opens no transaction) for an empty batch', async () => {
        mockTransaction()
        await updateExerciseOrders([])
        expect(powerSync.writeTransaction).not.toHaveBeenCalled()
    })
})

describe('upsertUserExercise upsert-vs-insert fork', () => {
    const entry: ExerciseLibraryEntry = { mainMuscle: 'Chest', fatigueFactor: 2, equipment: 'Barbell', isCompound: true }

    it('UPDATEs (and does not INSERT) when the row already exists', async () => {
        const tx = mockTransaction([{ name: 'Bench Press' }])
        await upsertUserExercise('u1', 'Bench Press', entry)

        expect(tx.execute).toHaveBeenCalledTimes(1)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE user_exercises SET/)
    })

    it('INSERTs (and does not UPDATE) when the row does not exist', async () => {
        const tx = mockTransaction([])
        await upsertUserExercise('u1', 'Bench Press', entry)

        expect(tx.execute).toHaveBeenCalledTimes(1)
        expect(tx.execute.mock.calls[0][0]).toMatch(/INSERT INTO user_exercises/)
    })
})

// ------------------------------------------------------------------------------------------
// M16: the 6 functions relocated verbatim out of WorkoutContext/index.tsx's inline
// powerSync.writeTransaction/execute blocks (delete/archive workout, exercise, log, user
// exercise). These paths previously had zero test coverage of any kind.
// ------------------------------------------------------------------------------------------

describe('deleteWorkoutCascade', () => {
    it('deletes logs, then exercises, then the workout, in one transaction', async () => {
        const tx = mockTransaction()
        await deleteWorkoutCascade('w1')

        expect(powerSync.writeTransaction).toHaveBeenCalledTimes(1)
        expect(tx.execute).toHaveBeenCalledTimes(3)
        expect(tx.execute.mock.calls[0]).toEqual(['DELETE FROM logs WHERE workout_id = ?', ['w1']])
        expect(tx.execute.mock.calls[1]).toEqual(['DELETE FROM exercises WHERE workout_id = ?', ['w1']])
        expect(tx.execute.mock.calls[2]).toEqual(['DELETE FROM workouts WHERE id = ?', ['w1']])
    })
})

// archived=true means the workout IS currently archived (confirmed by archiveWorkout's
// `archived: !archived` and both call sites: workoutScreen.tsx passes false to archive an
// active workout, archiveModal.tsx passes true to unarchive an archived one).
describe('setWorkoutArchived archive-branch semantics', () => {
    it('archived=true (currently archived) runs the UNARCHIVE branch: bumps active siblings, then sets this row archived=0 order=0', async () => {
        const tx = mockTransaction()
        await setWorkoutArchived('w1', 'u1', true)

        expect(tx.execute).toHaveBeenCalledTimes(2)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE workouts SET "order" = "order" \+ 1.*archived = 0/s)
        expect(tx.execute.mock.calls[0][1]).toEqual(['u1'])
        expect(tx.execute.mock.calls[1][0]).toMatch(/UPDATE workouts SET archived = 0, "order" = 0/)
        expect(tx.execute.mock.calls[1][1]).toEqual(['w1'])
    })

    it('archived=false (currently active) runs the ARCHIVE branch: bumps other archived siblings, then sets this row archived=1 order=0', async () => {
        const tx = mockTransaction()
        await setWorkoutArchived('w1', 'u1', false)

        expect(tx.execute).toHaveBeenCalledTimes(2)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE workouts SET "order" = "order" \+ 1.*archived = 1 AND id != \?/s)
        expect(tx.execute.mock.calls[0][1]).toEqual(['u1', 'w1'])
        expect(tx.execute.mock.calls[1][0]).toMatch(/UPDATE workouts SET archived = 1, "order" = 0/)
        expect(tx.execute.mock.calls[1][1]).toEqual(['w1'])
    })
})

describe('deleteExerciseCascade', () => {
    it('deletes logs, then the exercise, in one transaction', async () => {
        const tx = mockTransaction()
        await deleteExerciseCascade('e1')

        expect(powerSync.writeTransaction).toHaveBeenCalledTimes(1)
        expect(tx.execute).toHaveBeenCalledTimes(2)
        expect(tx.execute.mock.calls[0]).toEqual(['DELETE FROM logs WHERE exercise_id = ?', ['e1']])
        expect(tx.execute.mock.calls[1]).toEqual(['DELETE FROM exercises WHERE id = ?', ['e1']])
    })
})

// Same archived=true→unarchive / archived=false→archive semantics as setWorkoutArchived above.
describe('setExerciseArchived archive-branch semantics', () => {
    it('archived=true (currently archived) runs the UNARCHIVE branch: bumps active siblings, then sets this row archived=0 order=0', async () => {
        const tx = mockTransaction()
        await setExerciseArchived('e1', 'w1', true)

        expect(tx.execute).toHaveBeenCalledTimes(2)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE exercises SET "order" = "order" \+ 1.*workout_id = \? AND archived = 0/s)
        expect(tx.execute.mock.calls[0][1]).toEqual(['w1'])
        expect(tx.execute.mock.calls[1][0]).toMatch(/UPDATE exercises SET archived = 0, "order" = 0/)
        expect(tx.execute.mock.calls[1][1]).toEqual(['e1'])
    })

    it('archived=false (currently active) runs the ARCHIVE branch: bumps other archived siblings, then sets this row archived=1 order=0', async () => {
        const tx = mockTransaction()
        await setExerciseArchived('e1', 'w1', false)

        expect(tx.execute).toHaveBeenCalledTimes(2)
        expect(tx.execute.mock.calls[0][0]).toMatch(/UPDATE exercises SET "order" = "order" \+ 1.*workout_id = \? AND archived = 1 AND id != \?/s)
        expect(tx.execute.mock.calls[0][1]).toEqual(['w1', 'e1'])
        expect(tx.execute.mock.calls[1][0]).toMatch(/UPDATE exercises SET archived = 1, "order" = 0/)
        expect(tx.execute.mock.calls[1][1]).toEqual(['e1'])
    })
})

describe('deleteLogRow', () => {
    it('deletes the log row by id via a direct execute (no transaction)', async () => {
        await deleteLogRow('log1')

        expect(powerSync.writeTransaction).not.toHaveBeenCalled()
        expect(powerSync.execute).toHaveBeenCalledWith('DELETE FROM logs WHERE id = ?', ['log1'])
    })
})

describe('deleteUserExerciseRow', () => {
    it('deletes the user_exercises row by (userID, name) via a direct execute (no transaction)', async () => {
        await deleteUserExerciseRow('u1', 'Bench Press')

        expect(powerSync.writeTransaction).not.toHaveBeenCalled()
        expect(powerSync.execute).toHaveBeenCalledWith('DELETE FROM user_exercises WHERE user_id = ? AND name = ?', ['u1', 'Bench Press'])
    })
})

// ------------------------------------------------------------------------------------------
// M16: fault injection now covers ALL workout write paths, not just add-workout/add-exercise/
// add-log. Arms the one-shot 'workout' save-failure flag and asserts each of the 13
// touched functions throws before opening a transaction or issuing a direct execute — this is
// new coverage (Nutrition/Settings powersyncStore tests never exercise throwIfSaveFailureArmed).
// ------------------------------------------------------------------------------------------

// Arms the workout save-failure flag, asserts `run` rejects with the forced-failure error, and
// asserts the guard fired before any transaction opened or direct execute ran.
async function expectThrowsBeforeAnyWriteWhenArmed(run: () => Promise<void>) {
    await setSaveFailureArmed('workout', true)

    await expect(run()).rejects.toThrow(/Forced "workout" save failure/)

    expect(powerSync.writeTransaction).not.toHaveBeenCalled()
    expect(powerSync.execute).not.toHaveBeenCalled()
}

describe('fault injection: armed workout save-failure throws before any write', () => {
    afterEach(async () => {
        await setSaveFailureArmed('workout', false)
    })

    it('deleteWorkoutCascade', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => deleteWorkoutCascade('w1'))
    })

    it('setWorkoutArchived', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => setWorkoutArchived('w1', 'u1', true))
    })

    it('deleteExerciseCascade', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => deleteExerciseCascade('e1'))
    })

    it('setExerciseArchived', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => setExerciseArchived('e1', 'w1', true))
    })

    it('deleteLogRow', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => deleteLogRow('log1'))
    })

    it('deleteUserExerciseRow', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => deleteUserExerciseRow('u1', 'Bench Press'))
    })

    it('upsertWorkout', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => upsertWorkout(makeWorkout()))
    })

    it('updateWorkoutOrders', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => updateWorkoutOrders([makeWorkout()]))
    })

    it('insertDuplicateWorkout', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => insertDuplicateWorkout(makeWorkout(), [makeExercise()]))
    })

    it('insertExercisesWithOrderBump', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => insertExercisesWithOrderBump([makeExercise()]))
    })

    it('upsertExercise', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => upsertExercise(makeExercise()))
    })

    it('updateExerciseOrders', async () => {
        await expectThrowsBeforeAnyWriteWhenArmed(() => updateExerciseOrders([makeExercise()]))
    })

    it('upsertUserExercise', async () => {
        const entry: ExerciseLibraryEntry = { mainMuscle: 'Chest', fatigueFactor: 2, equipment: 'Barbell', isCompound: true }
        await expectThrowsBeforeAnyWriteWhenArmed(() => upsertUserExercise('u1', 'Bench Press', entry))
    })
})
