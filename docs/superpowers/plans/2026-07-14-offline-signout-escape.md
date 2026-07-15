# Offline Sign-Out Escape Hatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offline sign-out stops dead-ending — any upload-flush failure (offline or timeout) offers the existing force-sign-out escape hatch, with copy adapted to the case.

**Architecture:** Give the two flush errors a common `UploadFlushError` base and an `isUploadFlushError()` predicate in `FlushUploads.ts` (so future flush-failure types inherit the escape hatch automatically). `profile.tsx` branches once on the category and varies only the alert copy. The old `isUploadFlushTimeoutError` guard in accountFunctions is retired. `forceSignOut()` already works offline (F4) — no changes there.

**Tech Stack:** React Native / Expo 54, PowerSync, Jest (jest-expo preset).

**Spec:** `docs/superpowers/specs/2026-07-14-offline-signout-escape-design.md`

## Global Constraints

- Offline alert copy is exactly: title `You're offline`, message `Sign out anyway? Unsynced data will be lost.`
- Timeout alert copy is unchanged: title `Still syncing`, message `We're still uploading your data. You can wait and try again, or force sign out (unsynced data may be lost).`
- **Do NOT run any git commands** (no add/commit/branch) — the user owns all version control.
- No comments in app code unless non-obvious (project convention).
- Test commands use `npm run test:ci -- <pattern>` (`npm test` is watch mode — never use it here).
- The repo has pre-existing failing suites (connector, workout validator, nutrition graphFunctions, logFunctions, openAI, foodDB) and pre-existing `tsc` errors — ignore those; require only that files touched here are clean.

---

### Task 1: `UploadFlushError` base + `isUploadFlushError()` (TDD)

**Files:**
- Create: `lib/powersync/__tests__/flushUploads.test.ts`
- Modify: `lib/powersync/FlushUploads.ts:4-16` (class declarations) and append the predicate

**Interfaces:**
- Produces: `export class UploadFlushError extends Error`; `UploadFlushTimeoutError` / `UploadFlushNotConnectedError` now extend it (constructors unchanged); `export function isUploadFlushError(e: unknown): e is UploadFlushError`. Task 2 imports `isUploadFlushError` and `UploadFlushNotConnectedError` from `@/lib/powersync/FlushUploads`.
- Consumes: existing `flushUploadsOrThrow(options)` behavior (unchanged; tests lock it in).

- [ ] **Step 1: Write the failing test**

```ts
import { powerSync } from '@/lib/powersync/system'
import { getPendingUploadEstimate } from '@/lib/powersync/uploadQueueStats'
import {
    flushUploadsOrThrow,
    isUploadFlushError,
    UploadFlushNotConnectedError,
    UploadFlushTimeoutError,
} from '../FlushUploads'

jest.mock('@/lib/powersync/system', () => ({
    powerSync: {
        currentStatus: { connected: true },
        getUploadQueueStats: jest.fn().mockResolvedValue({}),
    },
}))

jest.mock('@/lib/powersync/uploadQueueStats', () => ({
    getPendingUploadEstimate: jest.fn(),
}))

const status = powerSync.currentStatus as unknown as { connected: boolean }
const mockPending = getPendingUploadEstimate as jest.Mock

beforeEach(() => {
    status.connected = true
    mockPending.mockReset()
})

describe('isUploadFlushError', () => {
    it('is true for a timeout error', () => {
        expect(isUploadFlushError(new UploadFlushTimeoutError())).toBe(true)
    })

    it('is true for a not-connected error', () => {
        expect(isUploadFlushError(new UploadFlushNotConnectedError())).toBe(true)
    })

    it('is false for a plain Error', () => {
        expect(isUploadFlushError(new Error('PowerSync is not connected.'))).toBe(false)
    })

    it('is false for non-errors', () => {
        expect(isUploadFlushError(null)).toBe(false)
        expect(isUploadFlushError('offline')).toBe(false)
    })
})

describe('flushUploadsOrThrow', () => {
    it('throws UploadFlushNotConnectedError when offline, and it matches the predicate', async () => {
        status.connected = false

        const error = await flushUploadsOrThrow({ timeoutMs: 100 }).catch((e: unknown) => e)

        expect(error).toBeInstanceOf(UploadFlushNotConnectedError)
        expect(isUploadFlushError(error)).toBe(true)
    })

    it('throws UploadFlushTimeoutError when the queue never drains, and it matches the predicate', async () => {
        mockPending.mockReturnValue(1)

        const error = await flushUploadsOrThrow({ timeoutMs: 60, pollEveryMs: 10 }).catch((e: unknown) => e)

        expect(error).toBeInstanceOf(UploadFlushTimeoutError)
        expect(isUploadFlushError(error)).toBe(true)
    })

    it('resolves once the queue reports empty on consecutive polls', async () => {
        mockPending.mockReturnValue(0)

        await expect(flushUploadsOrThrow({ timeoutMs: 1000, pollEveryMs: 10 })).resolves.toBeUndefined()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ci -- flushUploads`
Expected: FAIL — `isUploadFlushError` is not exported from `../FlushUploads`.

- [ ] **Step 3: Write minimal implementation**

In `lib/powersync/FlushUploads.ts`, replace the two class declarations (lines 4–16) with:

```ts
export class UploadFlushError extends Error {}

export class UploadFlushTimeoutError extends UploadFlushError {
    readonly name = 'UploadFlushTimeoutError'
    constructor(message = 'Timed out waiting for uploads to finish.') {
        super(message)
    }
}

export class UploadFlushNotConnectedError extends UploadFlushError {
    readonly name = 'UploadFlushNotConnectedError'
    constructor(message = 'PowerSync is not connected.') {
        super(message)
    }
}

export function isUploadFlushError(e: unknown): e is UploadFlushError {
    return e instanceof UploadFlushError
}
```

`flushUploadsOrThrow` and everything below it stays untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:ci -- flushUploads`
Expected: PASS (7 tests).

---

### Task 2: profile.tsx — escape hatch for every flush failure

**Files:**
- Modify: `app/settingsScreens/profile.tsx:4` (imports) and `:95-96` (the branch)

**Interfaces:**
- Consumes: `isUploadFlushError(e): e is UploadFlushError` and `UploadFlushNotConnectedError` from `@/lib/powersync/FlushUploads` (Task 1); existing `forceSignOut` from accountFunctions.
- Produces: nothing consumed by later tasks. After this task, `isUploadFlushTimeoutError` has zero consumers (Task 3 deletes it).

- [ ] **Step 1: Update imports (line 4)**

Replace:

```tsx
import { forceSignOut, isUploadFlushTimeoutError } from '@/context/AuthContext/functions/accountFunctions'
```

with:

```tsx
import { forceSignOut } from '@/context/AuthContext/functions/accountFunctions'
import { isUploadFlushError, UploadFlushNotConnectedError } from '@/lib/powersync/FlushUploads'
```

(Keep import ordering consistent with the file's existing alphabetical-by-path style: the FlushUploads import goes with the other `@/lib/...` imports, after the `@/context/...` group.)

- [ ] **Step 2: Replace the branch (currently lines 95-96)**

Replace:

```tsx
                        if (isUploadFlushTimeoutError(error)) {
                            Alert.alert('Still syncing', "We're still uploading your data. You can wait and try again, or force sign out (unsynced data may be lost).", [
```

with:

```tsx
                        if (isUploadFlushError(error)) {
                            const offline = error instanceof UploadFlushNotConnectedError
                            Alert.alert(
                                offline ? "You're offline" : 'Still syncing',
                                offline ? 'Sign out anyway? Unsynced data will be lost.' : "We're still uploading your data. You can wait and try again, or force sign out (unsynced data may be lost).",
                                [
```

The button array (`Cancel` / `Force sign out` with its `forceSignOut()` handler, loading state, and error alert) is unchanged — only reindent its closing bracket to match the new `Alert.alert(` call shape. The `else` generic error alert stays.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors in `app/settingsScreens/profile.tsx` (pre-existing errors elsewhere are out of scope).

---

### Task 3: Retire `isUploadFlushTimeoutError`

**Files:**
- Modify: `context/AuthContext/functions/accountFunctions.tsx:1` (import) and `:86-88` (delete the guard)
- Modify: `context/AuthContext/functions/__tests__/accountFunctions.test.ts:20-23` (mock)

**Interfaces:**
- Consumes: nothing new. Precondition: Task 2 already removed the only consumer.
- Produces: `accountFunctions.tsx` no longer exports `isUploadFlushTimeoutError` and no longer imports `UploadFlushTimeoutError`.

- [ ] **Step 1: Delete the guard and slim the import**

In `context/AuthContext/functions/accountFunctions.tsx`, replace line 1:

```tsx
import { flushUploadsOrThrow, UploadFlushTimeoutError } from '@/lib/powersync/FlushUploads'
```

with:

```tsx
import { flushUploadsOrThrow } from '@/lib/powersync/FlushUploads'
```

and delete lines 86–88 entirely:

```tsx
export function isUploadFlushTimeoutError(e: unknown): e is UploadFlushTimeoutError {
    return e instanceof UploadFlushTimeoutError
}
```

- [ ] **Step 2: Drop the dead mock member**

In `context/AuthContext/functions/__tests__/accountFunctions.test.ts`, replace:

```ts
jest.mock('@/lib/powersync/FlushUploads', () => ({
    flushUploadsOrThrow: jest.fn(),
    UploadFlushTimeoutError: class UploadFlushTimeoutError extends Error {},
}))
```

with:

```ts
jest.mock('@/lib/powersync/FlushUploads', () => ({
    flushUploadsOrThrow: jest.fn(),
}))
```

- [ ] **Step 3: Verify no stragglers**

Run: `npm run test:ci -- accountFunctions` → Expected: PASS (11 tests).
Grep for `isUploadFlushTimeoutError` across the repo → Expected: zero hits.

---

### Task 4: Full verification + audit bookkeeping

**Files:**
- Modify: `docs/AUDIT_MAJOR.txt` (remove issue 16; decrement nothing else — update the header's migrated count), `docs/COMPLETED_ISSUES.txt` (add 16 to the header list; insert the issue 16 entry in issue-number order between 15 and 17)

- [ ] **Step 1: Run the affected suites + typecheck**

Run: `npm run test:ci -- "flushUploads|accountFunctions"` → Expected: 2 suites PASS.
Run: `npx tsc --noEmit` → Expected: no errors in FlushUploads.ts, profile.tsx, accountFunctions.tsx, or the two test files.

- [ ] **Step 2: Move issue 16 to COMPLETED_ISSUES.txt**

Re-read both docs first — another work stream is also migrating issues (15 was moved recently), so line numbers and header counts must be taken from the current files, not from memory. Follow the existing completed-entry format (issue text + PLAN block verbatim, no `*` prefix, issue-number order). Do not commit — the user owns git.

- [ ] **Step 3: Report the manual verification checklist to the user**

- Airplane mode → Sign Out → confirm → "You're offline — Sign out anyway? Unsynced data will be lost." → Force sign out → login screen; relaunch (still offline) stays signed out.
- Online with a wedged/slow queue → Sign Out → "Still syncing" copy unchanged.
- Cancel on the offline alert → still signed in, no data lost.
- Any non-flush error (e.g. Supabase revoke failure) → generic error alert unchanged.
