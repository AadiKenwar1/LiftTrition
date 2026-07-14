import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Single source of truth for AsyncStorage keys scoped to one user.
 *
 * Anything keyed by userID lives here so sign-out and account deletion can
 * erase exactly a user's own data via clearUserStorage(). Device-level
 * preferences (e.g. colorScheme) are deliberately NOT listed, so they survive.
 */

export function lastExerciseKey(userID: string): string {
    return `lastExercise:${userID}`
}

function userScopedKeys(userID: string): string[] {
    return [lastExerciseKey(userID)]
}

export async function clearUserStorage(userID: string): Promise<void> {
    await AsyncStorage.multiRemove(userScopedKeys(userID))
}
