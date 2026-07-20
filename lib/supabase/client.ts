import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import { ENV } from '@/lib/env'
import { secureStorageAdapter } from './secureStorage'

const supabaseUrl = ENV.SUPABASE_URL!
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY!

// One-time legacy-session migration, folded into every native read: this app used to
// persist the Supabase session in plaintext AsyncStorage under this same key, so on a
// Keychain miss fall back to the legacy value, copy it into the secure adapter, and
// delete the plaintext copy so it stops lingering at rest. Called inline from the
// `storage.getItem` GoTrueClient itself awaits during session init, so migration is
// guaranteed to finish before the client observes the session -- no separate
// fire-and-forget migration step could race it. A fresh install never has the legacy
// key, so this permanently no-ops (one extra AsyncStorage read) once nothing is left
// to migrate.
async function getItemWithLegacyMigration(key: string): Promise<string | null> {
  const migrated = await secureStorageAdapter.getItem(key)
  if (migrated !== null) return migrated

  const legacyValue = await AsyncStorage.getItem(key)
  if (legacyValue === null) return null

  await secureStorageAdapter.setItem(key, legacyValue)
  await AsyncStorage.removeItem(key)
  return legacyValue
}

// Keychain-backed session storage on native, transparently migrating any legacy
// plaintext AsyncStorage session on first read; AsyncStorage on web, since
// expo-secure-store has no functional web implementation.
const nativeStorage = {
  getItem: getItemWithLegacyMigration,
  setItem: secureStorageAdapter.setItem,
  removeItem: secureStorageAdapter.removeItem,
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : nativeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

