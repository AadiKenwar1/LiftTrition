import { supabase } from '@/lib/supabase/client'
import { Connector } from '../Connector'

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

// Import types after mocking
import { AbstractPowerSyncDatabase, UpdateType } from '@powersync/react-native'

// Mock PowerSync database
const mockDatabase = {
    getNextCrudTransaction: jest.fn(),
} as unknown as AbstractPowerSyncDatabase

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

            process.env.EXPO_PUBLIC_POWERSYNC_URL = 'https://test.powersync.com'

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

            const mockInsert = jest.fn().mockReturnValue({ error: null })
            ;(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert })

            await connector.uploadData(mockDatabase)

            expect(supabase.from).toHaveBeenCalledWith('settings')
            expect(mockInsert).toHaveBeenCalledWith({ id: 'test-id-1', user_id: 'user-1', body_weight: 70.5 })
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

            const mockUpdate = jest.fn().mockReturnValue({ error: null })
            const mockEq = jest.fn().mockReturnValue({ error: null })
            ;(supabase.from as jest.Mock).mockReturnValue({
                update: mockUpdate.mockReturnValue({ eq: mockEq }),
            })

            await connector.uploadData(mockDatabase)

            expect(supabase.from).toHaveBeenCalledWith('settings')
            expect(mockUpdate).toHaveBeenCalledWith({ body_weight: 71.0 })
            expect(mockEq).toHaveBeenCalledWith('id', 'test-id-1')
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

            const mockInsert = jest.fn().mockReturnValue({ error: null })
            const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ error: null }) })

            ;(supabase.from as jest.Mock).mockImplementation((table) => {
                if (table === 'settings') {
                    return { insert: mockInsert }
                }
                return { update: mockUpdate }
            })

            await connector.uploadData(mockDatabase)

            expect(mockInsert).toHaveBeenCalledTimes(1)
            expect(mockUpdate).toHaveBeenCalledTimes(1)
            expect(mockTransaction.complete).toHaveBeenCalledTimes(1)
        })

        it('should throw error and not complete transaction on Supabase error', async () => {
            const mockTransaction = {
                crud: [
                    {
                        op: UpdateType.PUT,
                        table: 'settings',
                        id: 'test-id-1',
                        opData: { user_id: 'user-1' },
                    },
                ],
                complete: jest.fn(),
            }

            ;(mockDatabase.getNextCrudTransaction as jest.Mock).mockResolvedValue(mockTransaction)

            const mockError = { message: 'Database error', code: '23505' }
            const mockInsert = jest.fn().mockReturnValue({ error: mockError })
            ;(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert })

            await expect(connector.uploadData(mockDatabase)).rejects.toEqual(mockError)
            expect(mockTransaction.complete).not.toHaveBeenCalled()
        })
    })
})
