// Mock AsyncStorage with the official in-memory mock so modules that import it
// (dev tooling, PowerSync stores, contexts) resolve to a working fake instead of
// the null native module under Jest.
// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

// Mock expo-secure-store with a simple in-memory map so any test that transitively
// loads lib/supabase/client.ts -> lib/supabase/secureStorage.ts (e.g. one that does not
// mock @/lib/supabase/client directly) resolves to a working fake instead of the null
// native module under Jest.
jest.mock('expo-secure-store', () => {
    const store = new Map()
    return {
        AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
        getItemAsync: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
        setItemAsync: jest.fn((key, value) => {
            store.set(key, value)
            return Promise.resolve()
        }),
        deleteItemAsync: jest.fn((key) => {
            store.delete(key)
            return Promise.resolve()
        }),
    }
})
