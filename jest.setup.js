// Mock AsyncStorage with the official in-memory mock so modules that import it
// (dev tooling, PowerSync stores, contexts) resolve to a working fake instead of
// the null native module under Jest.
// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
