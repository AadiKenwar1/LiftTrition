jest.mock('@/lib/powersync/system', () => ({ powerSync: { getAll: jest.fn(), writeTransaction: jest.fn(), execute: jest.fn() } }))

import { powerSync } from '@/lib/powersync/system'
import {
    insertExercisesWithOrderBump,
    insertWorkoutWithOrderBump,
    upsertExercise,
    upsertWorkout,
} from '../powersyncStore'
import { Exercise, Workout } from '../../types'

// M15 coverage for the WorkoutContext raw-SQL store (context/WorkoutContext/database/powersyncStore.ts):
// the 312-line sibling that — unlike SettingsContext/NutritionContext — had no test at all. These
// capture the callback handed to powerSync.writeTransaction and run it against a fake tx, so the exact
// statement sequencing / bind params inside the transaction are asserted: order-bump ordering, the
// upsert-vs-insert fork (hand-duplicated once for workouts and once for exercises — both must be
// pinned so a future "collapse the two copies" refactor can't silently break one), and the batch bump
// amount (the one order-bump that uses the batch length instead of the +1 used everywhere else).

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
