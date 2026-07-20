import { supabase } from '@/lib/supabase/client'
import { Connector, MAX_CONCURRENT_UPLOAD_OPS } from '../Connector'

// Mock PowerSync imports
jest.mock('@powersync/react-native', () => ({
    PowerSyncBackendConnector: class {},
    AbstractPowerSyncDatabase: class {},
    UpdateType: {
        PUT: 'PUT',
        PATCH: 'PATCH',
        DELETE: 'DELETE',
    },
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(),
        },
        from: jest.fn(),
    },
}))

// Mock env — jest.mock calls are hoisted above imports, so this reliably beats
// the real @/lib/env module's process.env snapshot-at-import-time behavior.
jest.mock('@/lib/env', () => ({
    ENV: { POWERSYNC_URL: 'https://test.powersync.com' },
}))

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
    captureException: jest.fn(),
}))

// Import types after mocking
import * as Sentry from '@sentry/react-native'
import { AbstractPowerSyncDatabase, UpdateType } from '@powersync/react-native'

// Mock PowerSync database
const mockDatabase = {
    getNextCrudTransaction: jest.fn(),
} as unknown as AbstractPowerSyncDatabase

// Build a Supabase-client stub for one natural-key conflict table: select(...).eq(...).single()
// resolves to `existing`, while update/insert/upsert record their args and report no error.
function mockConflictTable(existing: { id: string } | null) {
    const single = jest.fn().mockResolvedValue({ data: existing })
    const selectBuilder: any = { single }
    selectBuilder.eq = jest.fn(() => selectBuilder)
    const select = jest.fn(() => selectBuilder)

    const updateBuilder: any = { error: null }
    updateBuilder.eq = jest.fn(() => updateBuilder)
    const update = jest.fn(() => updateBuilder)

    const insert = jest.fn().mockReturnValue({ error: null })
    const upsert = jest.fn().mockReturnValue({ error: null })

    return { from: { select, update, insert, upsert }, select, selectBuilder, update, updateBuilder, insert, upsert }
}

// Drain pending microtasks so chained .then()/.catch() hops inside the concurrency pool settle
// before the next assertion. Connector never uses real timers, so a generous fixed tick count is
// always enough regardless of exactly how deep any one op's chain is.
async function flushMicrotasks(times = 30) {
    for (let i = 0; i < times; i++) {
        await Promise.resolve()
    }
}

// Build a controllable async mock: each call returns a NEW pending promise (queued so the test can
// resolve them one at a time via resolveNext, or a specific one via resolveMatching) and tracks how
// many are unresolved ("in flight") at once, so tests can prove ops were dispatched concurrently
// (multiple in flight before any resolves) and that concurrency never exceeds a cap.
function makeDeferredResult(resolveValue: unknown = { error: null }) {
    const pending: Array<{ args: unknown[]; resolve: () => void }> = []
    let inFlight = 0
    let maxInFlight = 0

    const fn = jest.fn().mockImplementation((...args: unknown[]) => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        return new Promise((resolve) => {
            pending.push({
                args,
                resolve: () => {
                    inFlight -= 1
                    resolve(resolveValue)
                },
            })
        })
    })

    return {
        fn,
        resolveNext: () => {
            const next = pending.shift()
            if (!next) throw new Error('makeDeferredResult: no pending call to resolve')
            next.resolve()
        },
        // Resolve the pending call whose args satisfy `predicate` - for tests that need to control
        // resolution by IDENTITY (e.g. which row id a call targeted) rather than raw FIFO order.
        resolveMatching: (predicate: (args: unknown[]) => boolean) => {
            const index = pending.findIndex((p) => predicate(p.args))
            if (index === -1) throw new Error('makeDeferredResult: no pending call matches predicate')
            const [match] = pending.splice(index, 1)
            match.resolve()
        },
        pendingCount: () => pending.length,
        getMaxInFlight: () => maxInFlight,
    }
}

describe('Connector', () => {
    let connector: Connector

    beforeEach(() => {
        connector = new Connector()
        jest.clearAllMocks()
    })

    describe('fetchCredentials', () => {
        it('should return endpoint and token when session exists', async () => {
            const mockSession = {
                data: {
                    session: {
                        access_token: 'test-token-123',
                    },
                },
            }

            ;(supabase.auth.getSession as jest.Mock).mockResolvedValue(mockSession)

            const result = await connector.fetchCredentials()

            expect(result).toEqual({
                endpoint: 'https://test.powersync.com',
                token: 'test-token-123',
            })
            expect(supabase.auth.getSession).toHaveBeenCalledTimes(1)
        })

        it('should throw error when no session exists', async () => {
            const mockSession = {
                data: {
                    session: null,
                },
            }

            ;(supabase.auth.getSession as jest.Mock).mockResolvedValue(mockSession)

            await expect(connector.fetchCredentials()).rejects.toThrow('No Supabase session found')
        })
    })

    describe('uploadData', () => {
        it('should return early when no transaction exists', async () => {
            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(null)

            await connector.uploadData(mockDatabase)

            expect(mockDatabase.getNextCrudTransaction).toHaveBeenCalledTimes(1)
        })

        it('should handle PUT operation (create record)', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.PUT,
                        table: 'settings',
                        id: 'test-id-1',
                        opData: { user_id: 'user-1', body_weight: 70.5 },
                    },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            // settings is a natural-key conflict table (CONFLICT_KEYS): createRecord selects by
            // user_id first. No existing row here, so it falls through to insert.
            const m = mockConflictTable(null)
            ;(supabase.from as jest.Mock).mockReturnValue(m.from)

            await connector.uploadData(mockDatabase)

            expect(supabase.from).toHaveBeenCalledWith('settings')
            expect(m.insert).toHaveBeenCalledWith({ id: 'test-id-1', user_id: 'user-1', body_weight: 70.5 })
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('should handle PATCH operation (update record)', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.PATCH,
                        table: 'settings',
                        id: 'test-id-1',
                        opData: { body_weight: 71.0 },
                    },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            // PATCH ops never carry user_id, so settings looks up user_id by id first
            // (select...maybeSingle), then updates by user_id rather than by id.
            const maybeSingleById = jest.fn().mockResolvedValue({ data: { user_id: 'user-1' } })
            const selectByIdBuilder = { eq: jest.fn(() => ({ maybeSingle: maybeSingleById })) }
            const mockSelect = jest.fn(() => selectByIdBuilder)

            const mockEq = jest.fn().mockReturnValue({ error: null })
            const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })

            ;(supabase.from as jest.Mock).mockReturnValue({
                select: mockSelect,
                update: mockUpdate,
            })

            await connector.uploadData(mockDatabase)

            expect(supabase.from).toHaveBeenCalledWith('settings')
            expect(selectByIdBuilder.eq).toHaveBeenCalledWith('id', 'test-id-1')
            expect(mockUpdate).toHaveBeenCalledWith({ body_weight: 71.0 })
            expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('should handle DELETE operation', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.DELETE,
                        table: 'settings',
                        id: 'test-id-1',
                        opData: {},
                    },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockDelete = jest.fn().mockReturnValue({ error: null })
            const mockEq = jest.fn().mockReturnValue({ error: null })
            ;(supabase.from as jest.Mock).mockReturnValue({
                delete: mockDelete.mockReturnValue({ eq: mockEq }),
            })

            await connector.uploadData(mockDatabase)

            expect(supabase.from).toHaveBeenCalledWith('settings')
            expect(mockDelete).toHaveBeenCalled()
            expect(mockEq).toHaveBeenCalledWith('id', 'test-id-1')
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('should handle multiple operations in a transaction', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.PUT,
                        table: 'settings',
                        id: 'test-id-1',
                        opData: { user_id: 'user-1' },
                    },
                    {
                        op: UpdateType.PATCH,
                        table: 'workouts',
                        id: 'test-id-2',
                        opData: { name: 'Updated Workout' },
                    },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            // settings PUT is a natural-key conflict table: no existing row here, so it inserts.
            // workouts PATCH is a generic table: updates by id directly.
            const settingsMock = mockConflictTable(null)
            const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ error: null }) })

            ;(supabase.from as jest.Mock).mockImplementation((table) => {
                if (table === 'settings') {
                    return settingsMock.from
                }
                return { update: mockUpdate }
            })

            await connector.uploadData(mockDatabase)

            expect(settingsMock.insert).toHaveBeenCalledTimes(1)
            expect(mockUpdate).toHaveBeenCalledTimes(1)
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('should skip op and complete transaction on non-retryable Postgres error (23505 unique violation)', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.DELETE,
                        table: 'workouts',
                        id: 'test-id-1',
                        opData: {},
                    },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: 'Database error', code: '23505' }
            const mockEq = jest.fn().mockReturnValue({ error: mockError })
            ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

            await connector.uploadData(mockDatabase)

            expect(Sentry.captureException).toHaveBeenCalledTimes(1)
            expect(Sentry.captureException).toHaveBeenCalledWith(
                mockError,
                {
                    tags: { area: 'powersync-dead-letter' },
                    extra: { table: 'workouts', opType: UpdateType.DELETE, opId: 'test-id-1' },
                }
            )
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('should skip op and complete transaction on non-retryable Postgres error (22P02 invalid text representation)', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.DELETE,
                        table: 'workouts',
                        id: 'test-id-1',
                        opData: {},
                    },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: 'invalid input syntax for type integer', code: '22P02' }
            const mockEq = jest.fn().mockReturnValue({ error: mockError })
            ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

            await connector.uploadData(mockDatabase)

            expect(Sentry.captureException).toHaveBeenCalledTimes(1)
            expect(Sentry.captureException).toHaveBeenCalledWith(
                mockError,
                {
                    tags: { area: 'powersync-dead-letter' },
                    extra: { table: 'workouts', opType: UpdateType.DELETE, opId: 'test-id-1' },
                }
            )
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('should skip a non-retryable op but still upload subsequent ops in the same transaction', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.DELETE,
                        table: 'workouts',
                        id: 'test-id-1',
                        opData: {},
                    },
                    {
                        op: UpdateType.DELETE,
                        table: 'exercises',
                        id: 'test-id-2',
                        opData: {},
                    },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: 'Database error', code: '23505' }
            const mockEqOp1 = jest.fn().mockReturnValue({ error: mockError })
            const mockEqOp2 = jest.fn().mockReturnValue({ error: null })
            ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
                if (table === 'workouts') {
                    return { delete: jest.fn().mockReturnValue({ eq: mockEqOp1 }) }
                }
                return { delete: jest.fn().mockReturnValue({ eq: mockEqOp2 }) }
            })

            await connector.uploadData(mockDatabase)

            expect(mockEqOp1).toHaveBeenCalledWith('id', 'test-id-1')
            expect(mockEqOp2).toHaveBeenCalledWith('id', 'test-id-2')
            expect(Sentry.captureException).toHaveBeenCalledTimes(1)
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('should rethrow and not complete transaction when error has no Postgres error code', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.DELETE,
                        table: 'workouts',
                        id: 'test-id-1',
                        opData: {},
                    },
                ],
                complete: jest.fn(),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const networkError = new TypeError('Network request failed')
            const mockEq = jest.fn().mockImplementation(() => {
                throw networkError
            })
            ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

            await expect(connector.uploadData(mockDatabase)).rejects.toBe(networkError)
            expect(mockTransaction.complete).not.toHaveBeenCalled()
            expect(Sentry.captureException).not.toHaveBeenCalled()
        })

        it('should rethrow and not complete transaction on retryable Postgres error (PGRST301 JWT expired)', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.DELETE,
                        table: 'workouts',
                        id: 'test-id-1',
                        opData: {},
                    },
                ],
                complete: jest.fn(),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: 'JWT expired', code: 'PGRST301' }
            const mockEq = jest.fn().mockReturnValue({ error: mockError })
            ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

            await expect(connector.uploadData(mockDatabase)).rejects.toEqual(mockError)
            expect(mockTransaction.complete).not.toHaveBeenCalled()
            expect(Sentry.captureException).not.toHaveBeenCalled()
        })

        it('should rethrow and not complete transaction on 23505 for the settings table (check-then-insert race self-heals on retry)', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.DELETE,
                        table: 'settings',
                        id: 'test-id-1',
                        opData: {},
                    },
                ],
                complete: jest.fn(),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: 'Database error', code: '23505' }
            const mockEq = jest.fn().mockReturnValue({ error: mockError })
            ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

            await expect(connector.uploadData(mockDatabase)).rejects.toEqual(mockError)
            expect(mockTransaction.complete).not.toHaveBeenCalled()
            expect(Sentry.captureException).not.toHaveBeenCalled()
        })

        it('should rethrow and not complete transaction on 23505 for the weight_progress table (check-then-insert race self-heals on retry)', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.DELETE,
                        table: 'weight_progress',
                        id: 'test-id-1',
                        opData: {},
                    },
                ],
                complete: jest.fn(),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: 'Database error', code: '23505' }
            const mockEq = jest.fn().mockReturnValue({ error: mockError })
            ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

            await expect(connector.uploadData(mockDatabase)).rejects.toEqual(mockError)
            expect(mockTransaction.complete).not.toHaveBeenCalled()
            expect(Sentry.captureException).not.toHaveBeenCalled()
        })

        // ---- H2(a): every permanent rejection class must dead-letter, not wedge the queue forever ----
        it.each([
            ['42501 insufficient_privilege (RLS denial)', '42501'],
            ['42P01 undefined_table', '42P01'],
            ['42703 undefined_column (schema drift, ingredient_brand scenario)', '42703'],
            ['PGRST204 schema-cache column miss', 'PGRST204'],
            ['PGRST205 schema-cache table miss', 'PGRST205'],
        ])('should dead-letter and complete on permanent error %s', async (_label, code) => {
            const mockTransaction = {
                crud: [
                    { op: UpdateType.DELETE, table: 'workouts', id: 'test-id-1', opData: {} },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: `permanent ${code}`, code }
            const mockEq = jest.fn().mockReturnValue({ error: mockError })
            ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

            await connector.uploadData(mockDatabase)

            expect(Sentry.captureException).toHaveBeenCalledTimes(1)
            expect(Sentry.captureException).toHaveBeenCalledWith(
                mockError,
                {
                    tags: { area: 'powersync-dead-letter' },
                    extra: { table: 'workouts', opType: UpdateType.DELETE, opId: 'test-id-1' },
                }
            )
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        // ---- H2(a) boundary: transient classes must keep re-throwing so PowerSync retries ----
        it.each([
            ['40001 serialization_failure', '40001'],
            ['40P01 deadlock_detected', '40P01'],
            ['08006 connection_failure', '08006'],
            ['53300 too_many_connections', '53300'],
            ['57014 query_canceled', '57014'],
            ['58030 io_error', '58030'],
        ])('should rethrow without completing on transient error %s', async (_label, code) => {
            const mockTransaction = {
                crud: [
                    { op: UpdateType.DELETE, table: 'workouts', id: 'test-id-1', opData: {} },
                ],
                complete: jest.fn(),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: `transient ${code}`, code }
            const mockEq = jest.fn().mockReturnValue({ error: mockError })
            ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

            await expect(connector.uploadData(mockDatabase)).rejects.toEqual(mockError)
            expect(mockTransaction.complete).not.toHaveBeenCalled()
            expect(Sentry.captureException).not.toHaveBeenCalled()
        })

        // ---- H2(b): user_exercises has UNIQUE(user_id,name), so its 23505 must self-heal, not drop ----
        it('should rethrow (self-heal) and not complete transaction on 23505 for the user_exercises table', async () => {
            const mockTransaction = {
                crud: [
                    { op: UpdateType.DELETE, table: 'user_exercises', id: 'test-id-1', opData: {} },
                ],
                complete: jest.fn(),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: 'duplicate key value violates unique constraint', code: '23505' }
            const mockEq = jest.fn().mockReturnValue({ error: mockError })
            ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

            await expect(connector.uploadData(mockDatabase)).rejects.toEqual(mockError)
            expect(mockTransaction.complete).not.toHaveBeenCalled()
            expect(Sentry.captureException).not.toHaveBeenCalled()
        })

        // ---- H2(b): user_exercises PUT now takes the natural-key (user_id,name) conflict path ----
        it('createRecord: user_exercises PUT updates by (user_id, name) when a server row exists (id stripped)', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.PUT,
                        table: 'user_exercises',
                        id: 'local-uuid',
                        opData: { user_id: 'user-1', name: 'My Curl', accessory_muscles: '["forearms"]' },
                    },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const m = mockConflictTable({ id: 'server-uuid' })
            ;(supabase.from as jest.Mock).mockReturnValue(m.from)

            await connector.uploadData(mockDatabase)

            expect(supabase.from).toHaveBeenCalledWith('user_exercises')
            expect(m.select).toHaveBeenCalledWith('id')
            expect(m.selectBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
            expect(m.selectBuilder.eq).toHaveBeenCalledWith('name', 'My Curl')
            // id stripped; accessory_muscles converted from JSON string to array by prepareRecordForSupabase
            expect(m.update).toHaveBeenCalledWith({ user_id: 'user-1', name: 'My Curl', accessory_muscles: ['forearms'] })
            expect(m.updateBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
            expect(m.updateBuilder.eq).toHaveBeenCalledWith('name', 'My Curl')
            expect(m.insert).not.toHaveBeenCalled()
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('createRecord: user_exercises PUT inserts (with id) when no server row exists', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.PUT,
                        table: 'user_exercises',
                        id: 'local-uuid',
                        opData: { user_id: 'user-1', name: 'My Curl', accessory_muscles: '["forearms"]' },
                    },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const m = mockConflictTable(null)
            ;(supabase.from as jest.Mock).mockReturnValue(m.from)

            await connector.uploadData(mockDatabase)

            expect(m.selectBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
            expect(m.selectBuilder.eq).toHaveBeenCalledWith('name', 'My Curl')
            expect(m.insert).toHaveBeenCalledWith({ id: 'local-uuid', user_id: 'user-1', name: 'My Curl', accessory_muscles: ['forearms'] })
            expect(m.update).not.toHaveBeenCalled()
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        // ---- Behavior-preservation guards: settings/weight_progress conflict path unchanged post-refactor ----
        it('createRecord: settings PUT updates by user_id when a row exists (id stripped)', async () => {
            const mockTransaction = {
                crud: [
                    { op: UpdateType.PUT, table: 'settings', id: 'local-uuid', opData: { user_id: 'user-1', body_weight: 70.5 } },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const m = mockConflictTable({ id: 'server-uuid' })
            ;(supabase.from as jest.Mock).mockReturnValue(m.from)

            await connector.uploadData(mockDatabase)

            expect(m.select).toHaveBeenCalledWith('id')
            expect(m.selectBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
            expect(m.update).toHaveBeenCalledWith({ user_id: 'user-1', body_weight: 70.5 })
            expect(m.updateBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
            expect(m.insert).not.toHaveBeenCalled()
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('createRecord: settings PUT inserts (with id) when no row exists', async () => {
            const mockTransaction = {
                crud: [
                    { op: UpdateType.PUT, table: 'settings', id: 'local-uuid', opData: { user_id: 'user-1', body_weight: 70.5 } },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const m = mockConflictTable(null)
            ;(supabase.from as jest.Mock).mockReturnValue(m.from)

            await connector.uploadData(mockDatabase)

            expect(m.insert).toHaveBeenCalledWith({ id: 'local-uuid', user_id: 'user-1', body_weight: 70.5 })
            expect(m.update).not.toHaveBeenCalled()
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('createRecord: weight_progress PUT updates by (user_id, date) when a row exists (id stripped)', async () => {
            const mockTransaction = {
                crud: [
                    { op: UpdateType.PUT, table: 'weight_progress', id: 'local-uuid', opData: { user_id: 'user-1', date: '2026-07-20', weight: 70.5 } },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const m = mockConflictTable({ id: 'server-uuid' })
            ;(supabase.from as jest.Mock).mockReturnValue(m.from)

            await connector.uploadData(mockDatabase)

            expect(m.selectBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
            expect(m.selectBuilder.eq).toHaveBeenCalledWith('date', '2026-07-20')
            expect(m.update).toHaveBeenCalledWith({ user_id: 'user-1', date: '2026-07-20', weight: 70.5 })
            expect(m.updateBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
            expect(m.updateBuilder.eq).toHaveBeenCalledWith('date', '2026-07-20')
            expect(m.insert).not.toHaveBeenCalled()
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('createRecord: weight_progress PUT inserts (with id) when no row exists', async () => {
            const mockTransaction = {
                crud: [
                    { op: UpdateType.PUT, table: 'weight_progress', id: 'local-uuid', opData: { user_id: 'user-1', date: '2026-07-20', weight: 70.5 } },
                ],
                complete: jest.fn().mockResolvedValue(undefined),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const m = mockConflictTable(null)
            ;(supabase.from as jest.Mock).mockReturnValue(m.from)

            await connector.uploadData(mockDatabase)

            expect(m.insert).toHaveBeenCalledWith({ id: 'local-uuid', user_id: 'user-1', date: '2026-07-20', weight: 70.5 })
            expect(m.update).not.toHaveBeenCalled()
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        // ---- M12: bounded-concurrency upload pool ----
        describe('concurrency (bounded pool)', () => {
            const opTypeCases: Array<[string, UpdateType]> = [
                ['PUT', UpdateType.PUT],
                ['PATCH', UpdateType.PATCH],
                ['DELETE', UpdateType.DELETE],
            ]

            it.each(opTypeCases)(
                'runs N same-table %s ops concurrently (capped at MAX_CONCURRENT_UPLOAD_OPS) and still issues N distinct Supabase calls, never collapsed',
                async (_label, op) => {
                    const opCount = MAX_CONCURRENT_UPLOAD_OPS + 3
                    const crud = Array.from({ length: opCount }, (_, i) => ({
                        op,
                        table: 'workouts',
                        id: `workout-${i}`,
                        opData: { name: `Workout ${i}` },
                    }))
                    const mockTransaction = { crud, complete: jest.fn().mockResolvedValue(undefined) }
                    ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

                    const deferred = makeDeferredResult({ error: null })
                    // 'workouts' is not a CONFLICT_KEYS table, so PUT goes through the plain
                    // upsert(record) path (single call), while PATCH/DELETE chain a final .eq().
                    let tableStub: Record<string, unknown>
                    if (op === UpdateType.PUT) {
                        tableStub = { upsert: deferred.fn }
                    } else if (op === UpdateType.PATCH) {
                        tableStub = { update: jest.fn(() => ({ eq: deferred.fn })) }
                    } else {
                        tableStub = { delete: jest.fn(() => ({ eq: deferred.fn })) }
                    }
                    ;(supabase.from as jest.Mock).mockReturnValue(tableStub)

                    const uploadPromise = connector.uploadData(mockDatabase)
                    await flushMicrotasks()

                    // Dispatch is bounded: only the cap's worth of ops have actually reached Supabase.
                    expect(deferred.fn).toHaveBeenCalledTimes(MAX_CONCURRENT_UPLOAD_OPS)

                    // Drain one call at a time; the pool backfills up to the cap as each slot frees,
                    // never exceeding it, until every op has issued its own distinct Supabase call.
                    for (let i = 0; i < opCount; i++) {
                        deferred.resolveNext()
                        await flushMicrotasks()
                    }

                    await uploadPromise

                    expect(deferred.fn).toHaveBeenCalledTimes(opCount) // N distinct calls, not collapsed
                    expect(deferred.getMaxInFlight()).toBeLessThanOrEqual(MAX_CONCURRENT_UPLOAD_OPS)
                    expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
                }
            )

            const putConflictTableCases: Array<[string, (i: number) => Record<string, unknown>]> = [
                ['settings', (i) => ({ user_id: `user-${i}`, body_weight: 70 + i })],
                ['weight_progress', (i) => ({ user_id: `user-${i}`, date: '2026-07-20', weight: 70 + i })],
            ]

            it.each(putConflictTableCases)(
                'runs %s PUT ops strictly serially, never concurrently, even with multiple ops in one run',
                async (table, buildOpData) => {
                    const opCount = 3
                    const crud = Array.from({ length: opCount }, (_, i) => ({
                        op: UpdateType.PUT,
                        table,
                        id: `local-${i}`,
                        opData: buildOpData(i),
                    }))
                    const mockTransaction = { crud, complete: jest.fn().mockResolvedValue(undefined) }
                    ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

                    // Natural-key SELECT resolves instantly to "no existing row" so every op takes
                    // the insert path; INSERT itself is deferred/controllable so timing is observable.
                    const selectBuilder: any = { single: jest.fn().mockResolvedValue({ data: null }) }
                    selectBuilder.eq = jest.fn(() => selectBuilder)
                    const deferred = makeDeferredResult({ error: null })
                    ;(supabase.from as jest.Mock).mockReturnValue({ select: jest.fn(() => selectBuilder), insert: deferred.fn })

                    const uploadPromise = connector.uploadData(mockDatabase)
                    await flushMicrotasks()

                    // Strictly serial: only the FIRST op's insert has reached Supabase so far.
                    expect(deferred.fn).toHaveBeenCalledTimes(1)

                    for (let i = 0; i < opCount; i++) {
                        expect(deferred.pendingCount()).toBe(1) // never more than one in flight
                        deferred.resolveNext()
                        await flushMicrotasks()
                    }

                    await uploadPromise

                    expect(deferred.fn).toHaveBeenCalledTimes(opCount)
                    expect(deferred.getMaxInFlight()).toBe(1)
                    expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
                }
            )

            it('runs settings PATCH ops strictly serially, never concurrently, even with multiple ops in one run', async () => {
                const opCount = 3
                const crud = Array.from({ length: opCount }, (_, i) => ({
                    op: UpdateType.PATCH,
                    table: 'settings',
                    id: `settings-id-${i}`,
                    opData: { body_weight: 70 + i },
                }))
                const mockTransaction = { crud, complete: jest.fn().mockResolvedValue(undefined) }
                ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

                // The id lookup resolves instantly with a user_id so every op reaches the final
                // update; that final update is deferred/controllable so timing is observable.
                const mockSelect = jest.fn(() => ({
                    eq: jest.fn((_col: string, id: string) => ({
                        maybeSingle: jest.fn().mockResolvedValue({ data: { user_id: `user-${id}` } }),
                    })),
                }))
                const deferred = makeDeferredResult({ error: null })
                const mockUpdate = jest.fn(() => ({ eq: deferred.fn }))
                ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect, update: mockUpdate })

                const uploadPromise = connector.uploadData(mockDatabase)
                await flushMicrotasks()

                expect(deferred.fn).toHaveBeenCalledTimes(1)

                for (let i = 0; i < opCount; i++) {
                    expect(deferred.pendingCount()).toBe(1)
                    deferred.resolveNext()
                    await flushMicrotasks()
                }

                await uploadPromise

                expect(deferred.fn).toHaveBeenCalledTimes(opCount)
                expect(deferred.getMaxInFlight()).toBe(1)
                expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
            })

            it('runs weight_progress PATCH ops strictly serially, never concurrently, even though this table has no special lookup step', async () => {
                const opCount = 3
                const crud = Array.from({ length: opCount }, (_, i) => ({
                    op: UpdateType.PATCH,
                    table: 'weight_progress',
                    id: `wp-id-${i}`,
                    opData: { weight: 70 + i },
                }))
                const mockTransaction = { crud, complete: jest.fn().mockResolvedValue(undefined) }
                ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

                const deferred = makeDeferredResult({ error: null })
                const mockUpdate = jest.fn(() => ({ eq: deferred.fn }))
                ;(supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate })

                const uploadPromise = connector.uploadData(mockDatabase)
                await flushMicrotasks()

                expect(deferred.fn).toHaveBeenCalledTimes(1)

                for (let i = 0; i < opCount; i++) {
                    expect(deferred.pendingCount()).toBe(1)
                    deferred.resolveNext()
                    await flushMicrotasks()
                }

                await uploadPromise

                expect(deferred.fn).toHaveBeenCalledTimes(opCount)
                expect(deferred.getMaxInFlight()).toBe(1)
                expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
            })

            it('serializes repeated same-id ops within a run relative to each other, while distinct-id ops in the run still run concurrently', async () => {
                const crud = [
                    { op: UpdateType.PATCH, table: 'workout_exercises', id: 'dup-id', opData: { order: 0 } },
                    { op: UpdateType.PATCH, table: 'workout_exercises', id: 'other-id-1', opData: { order: 1 } },
                    { op: UpdateType.PATCH, table: 'workout_exercises', id: 'dup-id', opData: { order: 2 } },
                    { op: UpdateType.PATCH, table: 'workout_exercises', id: 'other-id-2', opData: { order: 3 } },
                ]
                const mockTransaction = { crud, complete: jest.fn().mockResolvedValue(undefined) }
                ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

                const deferred = makeDeferredResult({ error: null })
                const mockUpdate = jest.fn(() => ({ eq: deferred.fn }))
                ;(supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate })

                const uploadPromise = connector.uploadData(mockDatabase)
                await flushMicrotasks()

                // The first dup-id op and both distinct-id ops dispatch immediately (3 calls); the
                // SECOND dup-id op must wait for the first one's turn.
                expect(deferred.fn).toHaveBeenCalledTimes(3)
                expect(mockUpdate).toHaveBeenCalledWith({ order: 0 })
                expect(mockUpdate).toHaveBeenCalledWith({ order: 1 })
                expect(mockUpdate).toHaveBeenCalledWith({ order: 3 })
                expect(mockUpdate).not.toHaveBeenCalledWith({ order: 2 })

                // Resolve the two distinct-id ops (other-id-1, other-id-2) first, by identity (not
                // FIFO position) - the second dup-id op (order=2) must still be blocked purely on
                // the first dup-id op (order=0), which is deliberately left pending here.
                deferred.resolveMatching((args) => args[1] === 'other-id-1')
                deferred.resolveMatching((args) => args[1] === 'other-id-2')
                await flushMicrotasks()
                expect(deferred.fn).toHaveBeenCalledTimes(3)
                expect(mockUpdate).not.toHaveBeenCalledWith({ order: 2 })

                // Resolving the first dup-id call (order=0) frees dup-id's turn for order=2 to
                // finally dispatch.
                deferred.resolveMatching((args) => args[1] === 'dup-id')
                await flushMicrotasks()
                expect(deferred.fn).toHaveBeenCalledTimes(4)
                expect(mockUpdate).toHaveBeenCalledWith({ order: 2 })

                deferred.resolveMatching((args) => args[1] === 'dup-id')
                await uploadPromise

                expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
            })

            it('dead-letters one op via Sentry and still attempts its sibling when both run concurrently in the same run', async () => {
                const mockTransaction = {
                    crud: [
                        { op: UpdateType.DELETE, table: 'workouts', id: 'poison-id', opData: {} },
                        { op: UpdateType.DELETE, table: 'workouts', id: 'ok-id', opData: {} },
                    ],
                    complete: jest.fn().mockResolvedValue(undefined),
                }
                ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

                const mockError = { message: 'Database error', code: '23505' }
                const mockEq = jest.fn().mockImplementation((_col: string, idArg: string) => ({
                    error: idArg === 'poison-id' ? mockError : null,
                }))
                ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

                await connector.uploadData(mockDatabase)

                expect(mockEq).toHaveBeenCalledWith('id', 'poison-id')
                expect(mockEq).toHaveBeenCalledWith('id', 'ok-id')
                expect(Sentry.captureException).toHaveBeenCalledTimes(1)
                expect(Sentry.captureException).toHaveBeenCalledWith(
                    mockError,
                    { tags: { area: 'powersync-dead-letter' }, extra: { table: 'workouts', opType: UpdateType.DELETE, opId: 'poison-id' } }
                )
                expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
            })

            it('rethrows and does not complete the transaction when one op in a concurrent run has a retryable failure, without preventing its sibling from also being attempted', async () => {
                const mockTransaction = {
                    crud: [
                        { op: UpdateType.DELETE, table: 'workouts', id: 'fail-id', opData: {} },
                        { op: UpdateType.DELETE, table: 'workouts', id: 'ok-id', opData: {} },
                    ],
                    complete: jest.fn(),
                }
                ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

                const networkError = new TypeError('Network request failed')
                const mockEq = jest.fn().mockImplementation((_col: string, idArg: string) => {
                    if (idArg === 'fail-id') {
                        throw networkError
                    }
                    return { error: null }
                })
                ;(supabase.from as jest.Mock).mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: mockEq }) })

                const uploadPromise = connector.uploadData(mockDatabase)
                const outcome = uploadPromise.then(
                    () => ({ ok: true as const }),
                    (error: unknown) => ({ ok: false as const, error })
                )
                // Give both concurrently-dispatched ops (and the rejection propagation) time to
                // fully settle before asserting - avoids racing Promise.all's first-rejection-wins
                // behavior against the sibling op's own in-flight completion.
                await flushMicrotasks()

                const result = await outcome
                expect(result).toEqual({ ok: false, error: networkError })
                expect(mockTransaction.complete).not.toHaveBeenCalled()
                // Both ops were dispatched concurrently - one failing doesn't cancel its sibling.
                expect(mockEq).toHaveBeenCalledTimes(2)
                expect(Sentry.captureException).not.toHaveBeenCalled()
            })
        })
    })
})
