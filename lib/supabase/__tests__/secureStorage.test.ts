// secureStorage.test.ts
// Tests the Keychain-backed session storage adapter used by lib/supabase/client.ts (M7:
// migrate the Supabase session off plaintext AsyncStorage). expo-secure-store is mocked
// with an in-memory map mirroring the real SecureStore contract (get/set/delete by key),
// so the chunking behavior below is exercised without a native module.

const mockStore = new Map<string, string>()

jest.mock('expo-secure-store', () => ({
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
    getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
        mockStore.set(key, value)
        return Promise.resolve()
    }),
    deleteItemAsync: jest.fn((key: string) => {
        mockStore.delete(key)
        return Promise.resolve()
    }),
}))

import { secureStorageAdapter } from '../secureStorage'

beforeEach(() => {
    mockStore.clear()
})

describe('secureStorageAdapter', () => {
    // A value under the chunk threshold round-trips through set/get unchanged.
    it('round-trips a small value', async () => {
        await secureStorageAdapter.setItem('session', 'a-small-token')

        expect(await secureStorageAdapter.getItem('session')).toBe('a-small-token')
    })

    // A value over the ~2048-byte SecureStore limit is split across multiple keychain
    // entries (not one oversized write) and reassembled back to the exact original string.
    it('splits a value over 2048 bytes across multiple keychain entries and reassembles it', async () => {
        const large = 'x'.repeat(5000)

        await secureStorageAdapter.setItem('session', large)

        expect(await secureStorageAdapter.getItem('session')).toBe(large)
        expect(mockStore.get('session.count')).toBe('3')
        expect(mockStore.has('session.0')).toBe(true)
        expect(mockStore.has('session.1')).toBe(true)
        expect(mockStore.has('session.2')).toBe(true)
    })

    // removeItem deletes every chunk plus the count meta, leaving no orphaned `.n` keys.
    it('removeItem clears every chunk with no orphans left behind', async () => {
        await secureStorageAdapter.setItem('session', 'y'.repeat(5000))

        await secureStorageAdapter.removeItem('session')

        expect(await secureStorageAdapter.getItem('session')).toBeNull()
        expect([...mockStore.keys()].filter((key) => key.startsWith('session'))).toEqual([])
    })

    // Overwriting a large multi-chunk value with a smaller one must not leave stale
    // higher-index chunks from the prior (larger) write sitting in the keychain — an
    // orphaned fragment of a rotated refresh token would defeat the fix's purpose.
    it('overwrite-shrink clears stale chunk entries beyond the new count', async () => {
        await secureStorageAdapter.setItem('session', 'z'.repeat(5000))
        expect(mockStore.get('session.count')).toBe('3')

        await secureStorageAdapter.setItem('session', 'refreshed-small-token')

        expect(await secureStorageAdapter.getItem('session')).toBe('refreshed-small-token')
        expect(mockStore.get('session.count')).toBe('1')
        expect(mockStore.has('session.1')).toBe(false)
        expect(mockStore.has('session.2')).toBe(false)
    })
})
