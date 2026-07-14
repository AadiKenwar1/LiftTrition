import AsyncStorage from '@react-native-async-storage/async-storage'
import { clearUserStorage, lastExerciseKey } from '../userStorage'

const THEME_KEY = 'colorScheme'

beforeEach(async () => {
    await AsyncStorage.clear()
})

describe('lastExerciseKey', () => {
    it('namespaces the last-exercise key by user id', () => {
        expect(lastExerciseKey('user-123')).toBe('lastExercise:user-123')
    })
})

describe('clearUserStorage', () => {
    it("removes the signing-out user's last exercise", async () => {
        await AsyncStorage.setItem(lastExerciseKey('user-123'), 'Barbell Bench Press')

        await clearUserStorage('user-123')

        expect(await AsyncStorage.getItem(lastExerciseKey('user-123'))).toBeNull()
    })

    it('leaves the device theme preference untouched', async () => {
        await AsyncStorage.setItem(THEME_KEY, 'dark')
        await AsyncStorage.setItem(lastExerciseKey('user-123'), 'Barbell Bench Press')

        await clearUserStorage('user-123')

        expect(await AsyncStorage.getItem(THEME_KEY)).toBe('dark')
    })

    it("leaves another user's last exercise untouched on a shared device", async () => {
        await AsyncStorage.setItem(lastExerciseKey('user-a'), 'Squat')
        await AsyncStorage.setItem(lastExerciseKey('user-b'), 'Deadlift')

        await clearUserStorage('user-a')

        expect(await AsyncStorage.getItem(lastExerciseKey('user-a'))).toBeNull()
        expect(await AsyncStorage.getItem(lastExerciseKey('user-b'))).toBe('Deadlift')
    })
})
