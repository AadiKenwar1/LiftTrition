import * as SecureStore from 'expo-secure-store'

// Supabase-compatible, Keychain-backed storage adapter (see lib/supabase/client.ts).
// SecureStore caps a single value at ~2048 bytes, but a Supabase session (access +
// refresh JWT) routinely exceeds that, so values are split across `<key>.<n>` chunk
// entries plus a `<key>.count` meta entry that getItem/removeItem use to reassemble
// or erase them. Readable while the device is locked (post first-unlock) so a
// backgrounded autoRefreshToken tick can still read/write the session.
const CHUNK_SIZE = 2000
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }

// Reads how many chunks are currently stored for `key`, or 0 if none exist.
async function readChunkCount(key: string): Promise<number> {
    const raw = await SecureStore.getItemAsync(`${key}.count`, KEYCHAIN_OPTIONS)
    return raw ? parseInt(raw, 10) : 0
}

// Deletes every `<key>.<n>` chunk plus the count meta, so no fragment of a prior
// (possibly larger, possibly rotated) value survives an overwrite or removal.
async function deleteChunks(key: string, count: number): Promise<void> {
    await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`, KEYCHAIN_OPTIONS)))
    await SecureStore.deleteItemAsync(`${key}.count`, KEYCHAIN_OPTIONS)
}

// Reassembles a chunked value in order, or returns null if nothing is stored for `key`.
async function getItem(key: string): Promise<string | null> {
    const count = await readChunkCount(key)
    if (count === 0) return null
    const chunks = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`, KEYCHAIN_OPTIONS)))
    return chunks.join('')
}

// Clears any prior chunk set for `key` first, then writes the new one — chunk entries
// before the `.count` meta — so a mid-write crash fails safe into "no session" (the
// count goes missing) rather than reassembling into a corrupted partial blob.
async function setItem(key: string, value: string): Promise<void> {
    const oldCount = await readChunkCount(key)
    if (oldCount > 0) await deleteChunks(key, oldCount)

    const chunks: string[] = []
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE))
    }
    if (chunks.length === 0) chunks.push('')

    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk, KEYCHAIN_OPTIONS)))
    await SecureStore.setItemAsync(`${key}.count`, String(chunks.length), KEYCHAIN_OPTIONS)
}

// Removes every chunk plus the count meta for `key`, leaving no residue.
async function removeItem(key: string): Promise<void> {
    const count = await readChunkCount(key)
    await deleteChunks(key, count)
}

// Supabase auth `storage` adapter: chunked, Keychain-backed session persistence.
export const secureStorageAdapter = {
    getItem,
    setItem,
    removeItem,
}
